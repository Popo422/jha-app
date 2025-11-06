import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets, contractors, contractorProjects } from '@/lib/db/schema';
import { eq, gte, lte, desc, and, or, ilike, sql, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

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

// Helper function to get week start and end dates
function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek); // Go to Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }

  return {
    startDate: weekDates[0],
    endDate: weekDates[6],
    weekDates
  };
}

export interface WorkmenWeeklyData {
  contractorId: string;
  employeeName: string;
  billingRate: string;
  weeklyHours: Record<string, number>; // date -> hours
  totalHours: number;
  grossPay: number;
}

export interface WorkmenWeeklyResponse {
  success: boolean;
  data: WorkmenWeeklyData[];
  weekDates: string[];
  error?: string;
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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Get week dates
    const { startDate, endDate, weekDates } = getWeekDates();

    // Get all contractors assigned to this project
    const projectContractors = await db.select({
      contractorId: contractorProjects.contractorId,
      contractorName: contractors.firstName,
      contractorLastName: contractors.lastName,
      contractorRate: contractors.rate,
      contractorCode: contractors.code
    })
    .from(contractorProjects)
    .innerJoin(contractors, eq(contractorProjects.contractorId, contractors.id))
    .where(and(
      eq(contractorProjects.projectId, projectId),
      eq(contractorProjects.isActive, true),
      eq(contractors.companyId, auth.admin.companyId)
    ));

    if (projectContractors.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        weekDates,
      });
    }

    const contractorIds = projectContractors.map(c => c.contractorId);

    // Get timesheet data for the past week for these contractors
    const timesheetData = await db.select({
      employee: timesheets.employee,
      date: timesheets.date,
      timeSpent: timesheets.timeSpent,
    })
    .from(timesheets)
    .where(and(
      gte(timesheets.date, startDate),
      lte(timesheets.date, endDate),
      sql`${timesheets.employee} IN (${sql.join(projectContractors.map(c => 
        sql`${c.contractorName + ' ' + c.contractorLastName}`
      ), sql`, `)})`
    ));

    // Process the data
    const workmenData: WorkmenWeeklyData[] = projectContractors.map(contractor => {
      const fullName = `${contractor.contractorName} ${contractor.contractorLastName}`;
      const rate = parseFloat(contractor.contractorRate || '0');
      
      // Initialize weekly hours object
      const weeklyHours: Record<string, number> = {};
      weekDates.forEach(date => {
        weeklyHours[date] = 0;
      });

      // Fill in actual hours from timesheet data
      let totalHours = 0;
      timesheetData
        .filter(t => t.employee === fullName)
        .forEach(timesheet => {
          const hours = parseFloat(timesheet.timeSpent || '0');
          if (weeklyHours.hasOwnProperty(timesheet.date)) {
            weeklyHours[timesheet.date] += hours;
            totalHours += hours;
          }
        });

      return {
        contractorId: contractor.contractorId,
        employeeName: fullName,
        billingRate: contractor.contractorRate || '0.00',
        weeklyHours,
        totalHours,
        grossPay: totalHours * rate
      };
    });

    return NextResponse.json({
      success: true,
      data: workmenData,
      weekDates,
    });

  } catch (error) {
    console.error('Get workmen weekly data error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        data: [],
        weekDates: []
      },
      { status: 500 }
    );
  }
}