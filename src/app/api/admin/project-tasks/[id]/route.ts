import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectTasks, projects } from '@/lib/db/schema'

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const taskId = resolvedParams.id
    const body = await request.json()
    const { 
      name, 
      durationDays, 
      startDate, 
      endDate, 
      predecessors,
      progress,
      completed
    } = body

    // Get the existing task and verify it belongs to admin's company
    const existingTask = await db
      .select({
        task: projectTasks,
        project: projects
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projects.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingTask.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update the task
    const finalCompleted = completed !== undefined ? completed : existingTask[0].task.completed;
    const finalProgress = finalCompleted ? '100' : (progress !== undefined ? progress.toString() : existingTask[0].task.progress);

    const updatedTask = await db
      .update(projectTasks)
      .set({
        name: name || existingTask[0].task.name,
        durationDays: durationDays !== undefined ? durationDays : existingTask[0].task.durationDays,
        startDate: startDate || existingTask[0].task.startDate,
        endDate: endDate || existingTask[0].task.endDate,
        predecessors: predecessors !== undefined ? predecessors : existingTask[0].task.predecessors,
        progress: finalProgress,
        completed: finalCompleted,
        updatedAt: new Date()
      })
      .where(eq(projectTasks.id, taskId))
      .returning()

    return NextResponse.json({
      success: true,
      task: updatedTask[0],
      message: 'Project task updated successfully'
    })

  } catch (error) {
    console.error('Error updating project task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const taskId = resolvedParams.id

    // Get the existing task and verify it belongs to admin's company
    const existingTask = await db
      .select({
        task: projectTasks,
        project: projects
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .where(
        and(
          eq(projectTasks.id, taskId),
          eq(projects.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingTask.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Delete the task
    await db
      .delete(projectTasks)
      .where(eq(projectTasks.id, taskId))

    return NextResponse.json({
      success: true,
      message: 'Project task deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting project task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}