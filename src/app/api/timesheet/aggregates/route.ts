import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, contractors } from '@/lib/db/schema';
import { eq, gte, lte, and, or, ilike, sql } from 'drizzle-orm';
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

export async function GET(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'admin'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'admin'
    
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

    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const company = searchParams.get('company');
    const search = searchParams.get('search');
    const projectName = searchParams.get('projectName');
    const jobName = searchParams.get('jobName');
    const employees = searchParams.get('employees');

    // Build query conditions - only include approved timesheets
    const conditions = [eq(timesheets.status, 'approved')];

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

    // Add company filter if specified (filtering by subcontractor/company names)
    if (company) {
      const companyNames = company.split('|').filter(Boolean);
      if (companyNames.length > 0) {
        const companyConditions = companyNames.map(name => 
          ilike(timesheets.company, `%${name.trim()}%`)
        );
        if (companyConditions.length > 0) {
          conditions.push(or(...companyConditions)!);
        }
      }
    }

    // Add search filter if specified
    if (search) {
      conditions.push(
        or(
          ilike(timesheets.employee, `%${search}%`),
          ilike(timesheets.company, `%${search}%`),
          ilike(timesheets.projectName, `%${search}%`)
        )!
      );
    }

    // Add job name filter if specified (filtering by project name)
    if (jobName) {
      const projectNames = jobName.split('|').filter(Boolean);
      if (projectNames.length > 0) {
        const projectConditions = projectNames.map(name => 
          ilike(timesheets.projectName, `%${name.trim()}%`)
        );
        if (projectConditions.length > 0) {
          conditions.push(or(...projectConditions)!);
        }
      }
    }

    if (projectName) {
      conditions.push(ilike(timesheets.projectName, `%${projectName}%`));
    }

    // Add employees filter if specified (for contractor filtering)
    if (employees) {
      const employeeNames = employees.split('|').filter(Boolean);
      if (employeeNames.length > 0) {
        const employeeConditions = employeeNames.map(name => 
          ilike(timesheets.employee, `%${name.trim()}%`)
        );
        if (employeeConditions.length > 0) {
          conditions.push(or(...employeeConditions)!);
        }
      }
    }

    // Use a SQL query to aggregate data directly in the database
    const baseQuery = db.select({
      employee: timesheets.employee,
      company: timesheets.company,
      totalHours: sql<number>`sum(${timesheets.timeSpent}::numeric)`,
      totalCost: sql<number>`sum(${timesheets.timeSpent}::numeric * coalesce(${contractors.rate}::numeric, 0))`,
      entriesCount: sql<number>`count(*)`,
      projectNames: sql<string>`string_agg(distinct ${timesheets.projectName}, ', ')`,
      latestDate: sql<string>`max(${timesheets.date})`
    })
    .from(timesheets)
    .leftJoin(contractors, eq(sql`${timesheets.userId}::uuid`, contractors.id));

    let results;
    // Apply where conditions if any exist
    if (conditions.length === 0) {
      results = await baseQuery
        .groupBy(timesheets.employee, timesheets.company)
        .orderBy(sql`sum(${timesheets.timeSpent}::numeric) desc`);
    } else if (conditions.length === 1) {
      results = await baseQuery
        .where(conditions[0])
        .groupBy(timesheets.employee, timesheets.company)
        .orderBy(sql`sum(${timesheets.timeSpent}::numeric) desc`);
    } else {
      results = await baseQuery
        .where(and(...conditions)!)
        .groupBy(timesheets.employee, timesheets.company)
        .orderBy(sql`sum(${timesheets.timeSpent}::numeric) desc`);
    }

    return NextResponse.json({
      aggregates: results.map(row => ({
        employee: row.employee,
        company: row.company,
        totalHours: parseFloat(row.totalHours.toString()),
        totalCost: parseFloat(row.totalCost.toString()),
        entriesCount: parseInt(row.entriesCount.toString()),
        projectNames: row.projectNames || 'N/A',
        latestDate: row.latestDate
      })),
      meta: {
        isAdmin: auth.isAdmin,
        userId: auth.userId || null,
        approvedOnly: true
      }
    });
  } catch (error) {
    console.error('Error fetching timesheet aggregates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}