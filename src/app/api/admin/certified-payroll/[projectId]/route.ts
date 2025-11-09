import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { timesheets, contractors, projects, contractorProjects } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

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

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');
    const weekEnd = searchParams.get('weekEnd');

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'weekStart and weekEnd parameters are required' },
        { status: 400 }
      );
    }

    // Get project details
    const project = await db
      .select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1);

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get all contractors assigned to this specific project
    const projectContractors = await db
      .select({
        contractor: contractors,
      })
      .from(contractors)
      .innerJoin(contractorProjects, eq(contractorProjects.contractorId, contractors.id))
      .where(and(
        eq(contractors.companyId, auth.admin.companyId),
        eq(contractorProjects.projectId, projectId),
        eq(contractorProjects.isActive, true)
      ));

    // Get timesheets for the specific week and project
    const timesheetData = await db
      .select({
        timesheet: timesheets,
        contractor: contractors,
      })
      .from(timesheets)
      .leftJoin(contractors, sql`${timesheets.userId} = ${contractors.id}::text`)
      .where(and(
        eq(timesheets.companyId, auth.admin.companyId),
        eq(timesheets.projectName, project[0].name),
        gte(timesheets.date, weekStart),
        lte(timesheets.date, weekEnd),
        eq(timesheets.status, 'approved') // Only approved timesheets
      ));

    // Initialize contractor map with all project contractors
    const contractorMap = new Map();
    
    // Add all project contractors to the map (even if no timesheet data for this week)
    for (const { contractor } of projectContractors) {
      contractorMap.set(contractor.id, {
        contractor,
        timesheets: [],
      });
    }

    // Add timesheet data to contractors (if any exists for this week)
    for (const { timesheet, contractor } of timesheetData) {
      if (!contractor || !contractorMap.has(contractor.id)) continue;
      
      contractorMap.get(contractor.id).timesheets.push(timesheet);
    }

    // Process each contractor's data
    const workers = Array.from(contractorMap.entries()).map(([contractorId, { contractor, timesheets }]) => {
      // Initialize daily hours structure
      const dailyHours = {
        sunday: { straight: 0, overtime: 0, double: 0 },
        monday: { straight: 0, overtime: 0, double: 0 },
        tuesday: { straight: 0, overtime: 0, double: 0 },
        wednesday: { straight: 0, overtime: 0, double: 0 },
        thursday: { straight: 0, overtime: 0, double: 0 },
        friday: { straight: 0, overtime: 0, double: 0 },
        saturday: { straight: 0, overtime: 0, double: 0 },
      };

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      let totalStraight = 0;
      let totalOvertime = 0;
      let totalDouble = 0;

      // Process each timesheet
      for (const timesheet of timesheets) {
        const date = new Date(timesheet.date);
        const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayName = dayNames[dayIndex] as keyof typeof dailyHours;

        const straight = parseFloat(timesheet.timeSpent) || 0;
        const overtime = parseFloat(timesheet.overtimeHours) || 0;
        const double = parseFloat(timesheet.doubleHours) || 0;

        dailyHours[dayName].straight += straight;
        dailyHours[dayName].overtime += overtime;
        dailyHours[dayName].double += double;

        totalStraight += straight;
        totalOvertime += overtime;
        totalDouble += double;
      }

      // Calculate rates
      const baseRate = parseFloat(contractor.rate) || 0;
      const overtimeRate = parseFloat(contractor.overtimeRate) || (baseRate * 1.5);
      const doubleTimeRate = parseFloat(contractor.doubleTimeRate) || (baseRate * 2);

      // Calculate gross amount
      const grossAmount = (totalStraight * baseRate) + 
                         (totalOvertime * overtimeRate) + 
                         (totalDouble * doubleTimeRate);

      return {
        id: contractor.id,
        name: `${contractor.firstName} ${contractor.lastName}`,
        address: contractor.address || 'Not Specified',
        ssn: 'XXX-XX-1234', // Masked for security
        driversLicense: 'Not Specified',
        ethnicity: contractor.race || 'Not Specified',
        gender: contractor.gender || 'Not Specified',
        workClassification: 'Operating Engineer HWY 1/', // This should come from job classification data
        location: project[0].location || 'Project Site',
        type: contractor.type || 'contractor',
        dailyHours,
        totalHours: {
          straight: totalStraight,
          overtime: totalOvertime,
          double: totalDouble,
        },
        baseHourlyRate: baseRate,
        overtimeRate,
        doubleTimeRate,
        grossAmount,
      };
    });

    const payrollData = {
      weekStart,
      weekEnd,
      projectName: project[0].name,
      workers,
    };

    return NextResponse.json(payrollData);

  } catch (error) {
    console.error('Error fetching certified payroll:', error);
    
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