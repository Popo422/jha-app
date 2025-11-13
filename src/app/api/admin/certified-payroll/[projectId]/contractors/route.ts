import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { contractors, contractorProjects, timesheets } from '@/lib/db/schema';
import { eq, and, sql, sum } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AdminTokenPayload {
  admin: {
    id: string;
    employeeId: string;
    name: string;
    role: string;
    companyId: string;
  };
  isAdmin: boolean;
  iat: number;
  exp: number;
}

function authenticateAdmin(request: NextRequest): { admin: AdminTokenPayload['admin'] } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (!adminToken) {
    throw new Error('Admin authentication required');
  }
  
  const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload;
  if (!decoded.admin || !decoded.isAdmin) {
    throw new Error('Invalid admin token');
  }
  
  return { admin: decoded.admin };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = authenticateAdmin(request);
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    // Get all contractors assigned to this project
    const projectContractors = await db
      .select({
        contractor: contractors,
        contractorProject: contractorProjects,
      })
      .from(contractors)
      .innerJoin(contractorProjects, eq(contractorProjects.contractorId, contractors.id))
      .where(and(
        eq(contractors.companyId, auth.admin.companyId),
        eq(contractorProjects.projectId, projectId),
        eq(contractorProjects.isActive, true)
      ));

    // Get aggregated timesheet data for each contractor
    const contractorData = await Promise.all(
      projectContractors.map(async ({ contractor, contractorProject }) => {
        // Get total hours and gross earnings from approved timesheets
        const timesheetStats = await db
          .select({
            totalHours: sql<number>`COALESCE(SUM(CAST(${timesheets.timeSpent} AS NUMERIC) + CAST(${timesheets.overtimeHours} AS NUMERIC) + CAST(${timesheets.doubleHours} AS NUMERIC)), 0)`,
            totalStraightHours: sql<number>`COALESCE(SUM(CAST(${timesheets.timeSpent} AS NUMERIC)), 0)`,
            totalOvertimeHours: sql<number>`COALESCE(SUM(CAST(${timesheets.overtimeHours} AS NUMERIC)), 0)`,
            totalDoubleHours: sql<number>`COALESCE(SUM(CAST(${timesheets.doubleHours} AS NUMERIC)), 0)`,
          })
          .from(timesheets)
          .where(and(
            eq(timesheets.companyId, auth.admin.companyId),
            sql`${timesheets.userId} = ${contractor.id}::text`,
            eq(timesheets.status, 'approved')
          ));

        const stats = timesheetStats[0] || {
          totalHours: 0,
          totalStraightHours: 0,
          totalOvertimeHours: 0,
          totalDoubleHours: 0,
        };

        // Calculate gross earnings
        const baseRate = parseFloat(contractor.rate || '0') || 0;
        const overtimeRate = parseFloat(contractor.overtimeRate || '0') || (baseRate * 1.5);
        const doubleTimeRate = parseFloat(contractor.doubleTimeRate || '0') || (baseRate * 2);

        const grossEarnings = 
          (stats.totalStraightHours * baseRate) +
          (stats.totalOvertimeHours * overtimeRate) +
          (stats.totalDoubleHours * doubleTimeRate);

        return {
          id: contractor.id,
          name: `${contractor.firstName} ${contractor.lastName}`,
          email: contractor.email,
          totalProjectHours: Number(stats.totalHours),
          grossEarned: grossEarnings,
          dateOfHire: contractor.createdAt, // Using createdAt as default for date of hire
          rate: parseFloat(contractor.rate || '0') || 0,
          type: contractor.type,
          role: contractor.type, // Using contractor type (foreman/contractor) instead of project role
        };
      })
    );

    return NextResponse.json({
      contractors: contractorData,
      totalContractors: contractorData.length,
    });

  } catch (error) {
    console.error('Error fetching project contractors:', error);
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}