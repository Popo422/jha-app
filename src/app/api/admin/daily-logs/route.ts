import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc, ilike, gte, lte } from 'drizzle-orm'
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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
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

    // Build where conditions
    const whereConditions = [eq(dailyLogs.projectId, projectId)];

    if (search) {
      whereConditions.push(ilike(dailyLogs.taskName, `%${search}%`));
    }

    if (startDate) {
      whereConditions.push(gte(dailyLogs.logDate, startDate));
    }

    if (endDate) {
      whereConditions.push(lte(dailyLogs.logDate, endDate));
    }

    // Get total count
    const totalCountResult = await db
      .select({ count: dailyLogs.id })
      .from(dailyLogs)
      .where(and(...whereConditions));

    const totalCount = totalCountResult.length;

    // Get paginated logs
    const logs = await db
      .select()
      .from(dailyLogs)
      .where(and(...whereConditions))
      .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json({
      success: true,
      logs,
      totalCount,
      page,
      pageSize
    });

  } catch (error) {
    console.error('Error fetching daily logs:', error);
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
      taskName, 
      startDate, 
      endDate, 
      predecessor,
      progress = 0,
      logDate,
      notes
    } = body;

    if (!projectId || !taskName || !logDate) {
      return NextResponse.json({ 
        error: 'Project ID, task name, and log date are required' 
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

    // Create the new daily log
    const newLog = await db
      .insert(dailyLogs)
      .values({
        projectId: projectId,
        companyId: auth.admin.companyId,
        taskName,
        startDate: startDate || null,
        endDate: endDate || null,
        predecessor,
        progress: progress.toString(),
        logDate,
        notes,
        createdBy: auth.admin.id,
        createdByName: auth.admin.name
      })
      .returning();

    return NextResponse.json({
      success: true,
      log: newLog[0],
      message: 'Daily log created successfully'
    });

  } catch (error: any) {
    console.error('Error creating daily log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}