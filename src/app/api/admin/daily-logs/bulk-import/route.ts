import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyLogs, projects } from '@/lib/db/schema'

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

interface BulkImportLogRequest {
  projectId: string
  logs: Array<{
    taskName: string
    startDate?: string | null
    endDate?: string | null
    predecessor?: string | null
    progress?: number
    logDate: string
    notes?: string | null
  }>
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

    const body = await request.json() as BulkImportLogRequest
    const { projectId, logs } = body

    if (!projectId || !logs || !Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json(
        { error: 'Project ID and logs array are required' },
        { status: 400 }
      )
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

    // Validate and prepare logs for insertion
    const validLogs = []
    const errors = []

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]
      const rowNum = i + 1

      // Validate required fields
      if (!log.taskName?.trim()) {
        errors.push(`Row ${rowNum}: Task Name is required`)
        continue
      }

      if (!log.logDate?.trim()) {
        errors.push(`Row ${rowNum}: Log Date is required`)
        continue
      }

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(log.logDate)) {
        errors.push(`Row ${rowNum}: Log Date must be in YYYY-MM-DD format`)
        continue
      }

      if (log.startDate && !dateRegex.test(log.startDate)) {
        errors.push(`Row ${rowNum}: Start Date must be in YYYY-MM-DD format`)
        continue
      }

      if (log.endDate && !dateRegex.test(log.endDate)) {
        errors.push(`Row ${rowNum}: End Date must be in YYYY-MM-DD format`)
        continue
      }

      // Validate progress
      if (log.progress !== undefined && log.progress !== null) {
        if (typeof log.progress !== 'number' || log.progress < 0 || log.progress > 100) {
          errors.push(`Row ${rowNum}: Progress must be a number between 0 and 100`)
          continue
        }
      }

      validLogs.push({
        projectId: projectId,
        companyId: auth.admin.companyId,
        taskName: log.taskName.trim(),
        startDate: log.startDate || null,
        endDate: log.endDate || null,
        predecessor: log.predecessor || null,
        progress: (log.progress || 0).toString(),
        logDate: log.logDate,
        notes: log.notes || null,
        createdBy: auth.admin.id,
        createdByName: auth.admin.name
      })
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: errors
        },
        { status: 400 }
      )
    }

    if (validLogs.length === 0) {
      return NextResponse.json(
        { error: 'No valid logs to import' },
        { status: 400 }
      )
    }

    // Insert logs in batches to avoid potential issues with large datasets
    const batchSize = 50
    const insertedLogs = []

    for (let i = 0; i < validLogs.length; i += batchSize) {
      const batch = validLogs.slice(i, i + batchSize)
      const result = await db.insert(dailyLogs).values(batch).returning()
      insertedLogs.push(...result)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${insertedLogs.length} daily logs`,
      importedCount: insertedLogs.length,
      totalProvided: logs.length
    })

  } catch (error: any) {
    console.error('Error in bulk import daily logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}