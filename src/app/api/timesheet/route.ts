import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets } from '@/lib/db/schema';
import { eq, gte, lte, desc, and, or, ilike } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Helper function to authenticate and get user info
function authenticateRequest(request: NextRequest, authType: 'contractor' | 'admin' | 'any' = 'any'): { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any } {
  if (authType === 'contractor') {
    // Only try contractor token
    const userToken = request.cookies.get('authToken')?.value || 
                     (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                      request.headers.get('Authorization')?.replace('Bearer ', '') : null)

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
        return { 
          isAdmin: false, 
          userId: decoded.user.id, 
          userName: decoded.user.name,
          contractor: decoded.contractor 
        }
      } catch (error) {
        throw new Error('Invalid contractor token')
      }
    }
    throw new Error('No contractor authentication token found')
  }

  if (authType === 'admin') {
    // Only try admin token
    const adminToken = request.cookies.get('adminAuthToken')?.value || 
                      (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                       request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
    
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
        if (decoded.admin && decoded.isAdmin) {
          return { isAdmin: true, admin: decoded.admin }
        }
      } catch (error) {
        throw new Error('Invalid admin token')
      }
    }
    throw new Error('No admin authentication token found')
  }

  // Default behavior - try admin token first, then user token
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return { isAdmin: true, admin: decoded.admin }
      }
    } catch (error) {
      // Continue to try user token
    }
  }

  // Try user token
  const userToken = request.cookies.get('authToken')?.value || 
                   (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                    request.headers.get('Authorization')?.replace('Bearer ', '') : null)

  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
      return { 
        isAdmin: false, 
        userId: decoded.user.id, 
        userName: decoded.user.name,
        contractor: decoded.contractor 
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  throw new Error('No valid authentication token found')
}

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
  companyId: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

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

export async function POST(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json();
    const { date, employee, company, jobSite, jobName, jobDescription, timeSpent } = body;

    if (!date || !employee || !company || !jobSite || !jobName || !jobDescription || !timeSpent) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const timeSpentNumber = parseFloat(timeSpent);
    if (isNaN(timeSpentNumber) || timeSpentNumber < 0) {
      return NextResponse.json(
        { error: 'Time spent must be a valid positive number' },
        { status: 400 }
      );
    }

    const userId = auth.userId || auth.admin?.id;
    const companyId = auth.isAdmin ? auth.admin?.companyId : auth.contractor?.companyId;

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'Invalid authentication context' },
        { status: 400 }
      );
    }

    const result = await db.insert(timesheets).values({
      userId,
      companyId,
      date,
      employee,
      company,
      jobSite,
      jobName: jobName,
      jobDescription,
      timeSpent: timeSpentNumber.toString(),
    }).returning();

    return NextResponse.json(
      { 
        message: 'Timesheet submitted successfully',
        id: result[0].id 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // Build query conditions
    const conditions = [];

    // If admin, filter by company ID
    if (auth.isAdmin && auth.admin?.companyId) {
      conditions.push(eq(timesheets.companyId, auth.admin.companyId))
    }
    // If not admin, filter by user ID for user's own timesheets only
    else if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(timesheets.userId, auth.userId))
    }

    // Add date range filters if specified
    if (dateFrom) {
      conditions.push(gte(timesheets.date, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(timesheets.date, dateTo));
    }

    // Add company filter if specified
    if (company) {
      conditions.push(eq(timesheets.company, company));
    }

    // Add search filter if specified
    if (search) {
      conditions.push(
        or(
          ilike(timesheets.employee, `%${search}%`),
          ilike(timesheets.company, `%${search}%`),
          ilike(timesheets.jobSite, `%${search}%`),
          ilike(timesheets.jobDescription, `%${search}%`)
        )
      );
    }

    // Add status filter if specified
    if (status && status !== 'all') {
      conditions.push(eq(timesheets.status, status));
    }

    // Execute query - handle different condition scenarios
    let results;
    if (conditions.length === 0) {
      // No conditions
      results = await db.select().from(timesheets)
        .orderBy(desc(timesheets.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (conditions.length === 1) {
      // Single condition
      results = await db.select().from(timesheets)
        .where(conditions[0])
        .orderBy(desc(timesheets.createdAt))
        .limit(limit)
        .offset(offset);
    } else {
      // Multiple conditions
      results = await db.select().from(timesheets)
        .where(and(...conditions))
        .orderBy(desc(timesheets.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return NextResponse.json({
      timesheets: results,
      meta: {
        limit,
        offset,
        isAdmin: auth.isAdmin,
        userId: auth.userId || null
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id, date, employee, company, jobSite, jobName, jobDescription, timeSpent } = await request.json();

    if (!id || !date || !employee || !company || !jobSite || !jobName || !jobDescription || !timeSpent) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const timeSpentNumber = parseFloat(timeSpent);
    if (isNaN(timeSpentNumber) || timeSpentNumber < 0) {
      return NextResponse.json(
        { error: 'Time spent must be a valid positive number' },
        { status: 400 }
      );
    }

    // Get the existing timesheet to verify ownership
    const existingTimesheet = await db.select().from(timesheets).where(eq(timesheets.id, id));
    if (!existingTimesheet.length) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions - admin can edit any timesheet, user can only edit their own
    const userId = auth.isAdmin ? auth.admin?.id : auth.userId;
    if (!auth.isAdmin && existingTimesheet[0].userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - can only edit your own timesheets' }, { status: 403 });
    }

    // Update the timesheet
    const result = await db.update(timesheets)
      .set({
        date,
        employee,
        company,
        jobSite,
        jobName: jobName,
        jobDescription,
        timeSpent: timeSpentNumber.toString(),
        status: 'pending', // Reset to pending when timesheet is updated
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      timesheet: result[0],
      message: 'Timesheet updated successfully'
    });

  } catch (error) {
    console.error('Error updating timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Only admins can approve/reject timesheets
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { id, action, rejectionReason } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Timesheet ID and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a timesheet' },
        { status: 400 }
      );
    }

    // Get the existing timesheet to verify it exists and belongs to the admin's company
    const existingTimesheet = await db.select().from(timesheets)
      .where(and(
        eq(timesheets.id, id),
        eq(timesheets.companyId, auth.admin.companyId)
      ));

    if (!existingTimesheet.length) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    const status = action === 'approve' ? 'approved' : 'rejected';
    
    // Update the timesheet with approval/rejection
    const result = await db.update(timesheets)
      .set({
        status,
        approvedBy: auth.admin.id,
        approvedByName: auth.admin.name,
        approvedAt: new Date(),
        rejectionReason: action === 'reject' ? rejectionReason : null,
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      timesheet: result[0],
      message: `Timesheet ${action}d successfully`
    });

  } catch (error) {
    console.error('Error approving/rejecting timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}