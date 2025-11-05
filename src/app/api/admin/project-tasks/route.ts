import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc } from 'drizzle-orm'
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

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
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
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all tasks for the project, ordered by task number
    const tasks = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.taskNumber);

    return NextResponse.json({
      success: true,
      tasks
    });

  } catch (error) {
    console.error('Error fetching project tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const body = await request.json();
    const { 
      projectId, 
      name, 
      durationDays, 
      startDate, 
      endDate, 
      predecessors,
      progress = 0,
      cost,
      completed = false
    } = body;

    if (!projectId || !name) {
      return NextResponse.json({ 
        error: 'Project ID and task name are required' 
      }, { status: 400 });
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
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get the next task number for this project
    const lastTask = await db
      .select({ taskNumber: projectTasks.taskNumber })
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(desc(projectTasks.taskNumber))
      .limit(1);

    const nextTaskNumber = lastTask.length > 0 ? lastTask[0].taskNumber + 1 : 1;

    // Create the new task
    const newTask = await db
      .insert(projectTasks)
      .values({
        projectId: projectId,
        taskNumber: nextTaskNumber,
        name,
        durationDays,
        startDate: startDate || null,
        endDate: endDate || null,
        predecessors,
        progress: completed ? '100' : progress.toString(),
        cost: cost ? cost.toString() : null,
        completed
      })
      .returning();

    return NextResponse.json({
      success: true,
      task: newTask[0],
      message: 'Project task created successfully'
    });

  } catch (error: any) {
    console.error('Error creating project task:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A task with this number already exists for this project' },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}