import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyLogs } from '@/lib/db/schema'

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

// GET - Fetch a single daily log
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const id = resolvedParams.id

    // Get the daily log
    const log = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, id),
          eq(dailyLogs.companyId, auth.admin.companyId)
        )
      )
      .limit(1);

    if (log.length === 0) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      log: log[0],
      message: 'Daily log retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching daily log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update a daily log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const id = resolvedParams.id

    const body = await request.json();
    const {
      taskName,
      startDate,
      endDate,
      predecessor,
      progress,
      logDate,
      notes
    } = body;

    // Verify the daily log exists and belongs to admin's company
    const existingLog = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, id),
          eq(dailyLogs.companyId, auth.admin.companyId)
        )
      )
      .limit(1);

    if (existingLog.length === 0) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    }

    // Update the daily log
    const updatedLog = await db
      .update(dailyLogs)
      .set({
        ...(taskName !== undefined && { taskName }),
        ...(startDate !== undefined && { startDate: startDate || null }),
        ...(endDate !== undefined && { endDate: endDate || null }),
        ...(predecessor !== undefined && { predecessor }),
        ...(progress !== undefined && { progress: progress.toString() }),
        ...(logDate !== undefined && { logDate }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date()
      })
      .where(eq(dailyLogs.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      log: updatedLog[0],
      message: 'Daily log updated successfully'
    });

  } catch (error) {
    console.error('Error updating daily log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a daily log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const id = resolvedParams.id

    // Verify the daily log exists and belongs to admin's company
    const existingLog = await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.id, id),
          eq(dailyLogs.companyId, auth.admin.companyId)
        )
      )
      .limit(1);

    if (existingLog.length === 0) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    }

    // Delete the daily log
    await db
      .delete(dailyLogs)
      .where(eq(dailyLogs.id, id));

    return NextResponse.json({
      success: true,
      message: 'Daily log deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting daily log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}