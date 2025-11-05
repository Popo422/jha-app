import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectTasks, projects } from '@/lib/db/schema'
import { del, list } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

interface AdminTokenPayload {
  admin: {
    id: string
    employeeId: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}

interface TaskImportData {
  taskNumber: number
  name: string
  durationDays?: number
  startDate?: string
  endDate?: string
  predecessors?: string
  progress?: number
  cost?: number
}

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) {
    throw new Error('Admin authentication required')
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token')
    }
    return { admin: decoded.admin }
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}

// Helper function to parse duration from various formats
function parseDuration(duration: string | number): number | null {
  if (typeof duration === 'number') return duration
  if (!duration) return null
  
  const durationStr = duration.toString().toLowerCase()
  
  // Handle formats like "45 days", "3 wks", "10 wks", "3.5 mons"
  if (durationStr.includes('day')) {
    return parseInt(durationStr.replace(/[^\d]/g, ''))
  } else if (durationStr.includes('wk')) {
    const weeks = parseFloat(durationStr.replace(/[^\d.]/g, ''))
    return Math.round(weeks * 7) // Convert weeks to days
  } else if (durationStr.includes('mon')) {
    const months = parseFloat(durationStr.replace(/[^\d.]/g, ''))
    return Math.round(months * 30) // Convert months to days (approximate)
  }
  
  // Try to parse as number
  const numericValue = parseInt(durationStr.replace(/[^\d]/g, ''))
  return isNaN(numericValue) ? null : numericValue
}

// Helper function to parse date from various formats
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  // Handle formats like "Fri 11/1/24", "Wed 3/12/25", etc.
  const cleanDate = dateStr.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+/, '')
  
  try {
    const parsed = new Date(cleanDate)
    return isNaN(parsed.getTime()) ? null : parsed
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { projectId, tasks, replaceExisting = false } = body

    if (!projectId || !tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ 
        error: 'Project ID and tasks array are required' 
      }, { status: 400 })
    }

    // Verify project belongs to admin's company
    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // If replaceExisting is true, delete all existing tasks for this project
    if (replaceExisting) {
      await db
        .delete(projectTasks)
        .where(eq(projectTasks.projectId, projectId))
    }

    // Process and validate the tasks
    const validTasks: any[] = []
    const errors: string[] = []

    for (const task of tasks) {
      if (!task.name || typeof task.taskNumber !== 'number') {
        errors.push(`Task "${task.name || 'Unnamed'}" is missing required fields (name, taskNumber)`)
        continue
      }

      try {
        const processedTask = {
          projectId,
          taskNumber: task.taskNumber,
          name: task.name,
          durationDays: task.durationDays ? parseDuration(task.durationDays) : null,
          startDate: task.startDate ? parseDate(task.startDate) : null,
          endDate: task.endDate ? parseDate(task.endDate) : null,
          predecessors: task.predecessors || null,
          progress: task.progress ? task.progress.toString() : '0',
          cost: task.cost ? task.cost.toString() : null
        }

        validTasks.push(processedTask)
      } catch (error) {
        errors.push(`Error processing task "${task.name}": ${error}`)
      }
    }

    if (validTasks.length === 0) {
      return NextResponse.json({ 
        error: 'No valid tasks to import',
        errors 
      }, { status: 400 })
    }

    // Insert the tasks in batches to handle large imports
    const batchSize = 50
    const createdTasks = []
    
    for (let i = 0; i < validTasks.length; i += batchSize) {
      const batch = validTasks.slice(i, i + batchSize)
      
      try {
        const batchResult = await db
          .insert(projectTasks)
          .values(batch)
          .returning()
        
        createdTasks.push(...batchResult)
      } catch (error: any) {
        // Handle duplicate task number errors
        if (error.code === '23505') {
          errors.push(`Duplicate task numbers detected in batch starting at task ${batch[0].taskNumber}`)
        } else {
          errors.push(`Database error in batch starting at task ${batch[0].taskNumber}: ${error.message}`)
        }
      }
    }

    // Clean up temp files for this company after successful import
    const companyId = auth.admin?.companyId
    if (companyId) {
      try {
        const tempPrefix = `temp-schedules/${companyId}/`
        const tempFiles = await list({ prefix: tempPrefix })
        if (tempFiles.blobs.length > 0) {
          console.log(`Cleaning up ${tempFiles.blobs.length} temp files after import`)
          await Promise.all(
            tempFiles.blobs.map(blob => del(blob.url))
          )
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp files after import:', cleanupError)
        // Don't fail the import if cleanup fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${createdTasks.length} tasks`,
      importedCount: createdTasks.length,
      totalProvided: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
      tasks: createdTasks
    })

  } catch (error) {
    console.error('Error importing project tasks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}