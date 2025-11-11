import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { projects, contractors, timesheets, contractorProjects } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || '';

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

function authenticateAdmin(request: NextRequest): { admin: any } {
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

// Helper function to split date range into weekly periods (Sunday to Saturday)
const splitIntoWeeks = (startDate: string, endDate: string): { weekStart: string; weekEnd: string }[] => {
  const weeks = [];
  let currentDate = new Date(startDate);
  const finalDate = new Date(endDate);
  
  // Add safety counter to prevent infinite loops
  let loopCounter = 0;
  const maxWeeks = 52; // 1 year max
  
  while (currentDate <= finalDate && loopCounter < maxWeeks) {
    // Find the Sunday of the current week
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - dayOfWeek);
    
    // Find the Saturday of the current week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // Store the actual Saturday before clamping
    const actualWeekEnd = new Date(weekEnd);
    
    // Don't go past the final date
    if (weekEnd > finalDate) {
      weekEnd.setTime(finalDate.getTime());
    }
    
    weeks.push({
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0]
    });
    
    // Move to next week using the actual Saturday + 1 (not the clamped one)
    currentDate = new Date(actualWeekEnd);
    currentDate.setDate(actualWeekEnd.getDate() + 1);
    
    loopCounter++;
  }
  
  if (loopCounter >= maxWeeks) {
    console.error('⚠️ Week splitting hit max loop limit, preventing infinite loop');
  }
  
  return weeks;
};

// Helper function to get day name from date
const getDayName = (date: Date): 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as any;
};

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting multi-week payroll calculation...');
    
    const auth = authenticateAdmin(request);
    console.log('✅ Admin authenticated:', auth.admin.id);
    
    const body = await request.json();
    console.log('📝 Request body received:', { 
      projectId: body.projectId, 
      startDate: body.startDate, 
      endDate: body.endDate,
      contractorCount: body.selectedContractorIds?.length,
      hasPayrollData: !!body.payrollData 
    });
    
    const { 
      projectId, 
      startDate, 
      endDate, 
      selectedContractorIds,
      payrollData // User-entered deductions, etc.
    } = body;

    if (!projectId || !startDate || !endDate || !selectedContractorIds?.length) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, startDate, endDate, selectedContractorIds' 
      }, { status: 400 });
    }

    // Get project information
    console.log('🔍 Fetching project...');
    const project = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1);

    if (project.length === 0) {
      console.log('❌ Project not found');
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.log('✅ Project found:', project[0].name);

    // Split date range into weeks
    console.log('📅 Splitting into weeks...');
    const weeks = splitIntoWeeks(startDate, endDate);
    console.log('✅ Weeks created:', weeks.length, weeks);
    
    // Process each week
    console.log('🔄 Processing weeks...');
    const weeklyData = await Promise.all(weeks.map(async (week, weekIndex) => {
      console.log(`📊 Processing week ${weekIndex + 1}: ${week.weekStart} - ${week.weekEnd}`);
      
      // Get contractors assigned to this project
      console.log('👥 Fetching project contractors...');
      const projectContractors = await db.select({
        contractor: contractors,
      })
        .from(contractorProjects)
        .leftJoin(contractors, eq(contractorProjects.contractorId, contractors.id))
        .where(and(
          eq(contractorProjects.projectId, projectId),
          eq(contractors.companyId, auth.admin.companyId),
          inArray(contractors.id, selectedContractorIds)
        ));
      
      console.log(`✅ Found ${projectContractors.length} project contractors`);

      // Get contractor names for timesheet filtering
      const contractorNames = projectContractors
        .filter(pc => pc.contractor)
        .map(pc => `${pc.contractor!.firstName} ${pc.contractor!.lastName}`.trim());
      
      console.log('👤 Contractor names for timesheet lookup:', contractorNames);

      // Get timesheet data for this week (filter by contractor names and project name)
      console.log('⏰ Fetching timesheets...');
      const weekTimesheets = await db.select()
        .from(timesheets)
        .where(and(
          eq(timesheets.companyId, auth.admin.companyId),
          eq(timesheets.projectName, project[0].name), // Use project name, not ID
          eq(timesheets.status, 'approved'),
          gte(timesheets.date, week.weekStart),
          lte(timesheets.date, week.weekEnd),
          inArray(timesheets.employee, contractorNames) // Use contractor names
        ));
      
      console.log(`✅ Found ${weekTimesheets.length} timesheets for week ${weekIndex + 1}`);

      // Process contractors for this week
      console.log('⚙️ Processing contractor data...');
      const weekWorkers = projectContractors.map(({ contractor }, contractorIndex) => {
        if (!contractor) {
          console.log(`❌ Null contractor at index ${contractorIndex}`);
          return null;
        }

        // Get contractor's timesheets for this week (match by name)
        const contractorFullName = `${contractor.firstName} ${contractor.lastName}`.trim();
        console.log(`👤 Processing contractor: ${contractorFullName}`);
        
        const contractorTimesheets = weekTimesheets.filter(ts => ts.employee === contractorFullName);
        console.log(`⏰ Found ${contractorTimesheets.length} timesheets for ${contractorFullName}`);

        // Initialize daily hours
        const dailyHours = {
          sunday: { straight: 0, overtime: 0, double: 0 },
          monday: { straight: 0, overtime: 0, double: 0 },
          tuesday: { straight: 0, overtime: 0, double: 0 },
          wednesday: { straight: 0, overtime: 0, double: 0 },
          thursday: { straight: 0, overtime: 0, double: 0 },
          friday: { straight: 0, overtime: 0, double: 0 },
          saturday: { straight: 0, overtime: 0, double: 0 },
        };

        // Aggregate timesheet data by day
        contractorTimesheets.forEach(timesheet => {
          const date = new Date(timesheet.date);
          const dayName = getDayName(date);
          
          dailyHours[dayName].straight += parseFloat(timesheet.timeSpent || '0');
          dailyHours[dayName].overtime += parseFloat(timesheet.overtimeHours || '0');
          dailyHours[dayName].double += parseFloat(timesheet.doubleHours || '0');
        });

        // Calculate totals
        const totalStraight = Object.values(dailyHours).reduce((sum, day) => sum + day.straight, 0);
        const totalOvertime = Object.values(dailyHours).reduce((sum, day) => sum + day.overtime, 0);
        const totalDouble = Object.values(dailyHours).reduce((sum, day) => sum + day.double, 0);

        // Calculate rates
        const baseRate = parseFloat(contractor.rate || '0');
        const overtimeRate = parseFloat(contractor.overtimeRate || '0') || (baseRate * 1.5);
        const doubleTimeRate = parseFloat(contractor.doubleTimeRate || '0') || (baseRate * 2);

        // Calculate gross amount
        const grossAmount = (totalStraight * baseRate) + (totalOvertime * overtimeRate) + (totalDouble * doubleTimeRate);

        // Get user-entered payroll data for this contractor
        const contractorPayrollData = payrollData?.[contractor.id] || {};
        console.log(`💰 Payroll data for ${contractorFullName}:`, Object.keys(contractorPayrollData));

        return {
          id: contractor.id,
          name: `${contractor.firstName || ''} ${contractor.lastName || ''}`.trim(),
          address: contractor.address || 'Address not specified',
          ssn: 'XXX-XX-XXXX', // Masked for security
          driversLicense: 'Not specified', // Not in schema
          ethnicity: contractor.race || 'Not specified',
          gender: contractor.gender || 'Not specified',
          workClassification: contractor.workClassification || contractor.type || 'Contractor',
          location: project[0].location || 'Project Site',
          type: contractor.type || 'contractor',
          dailyHours,
          totalHours: { 
            straight: totalStraight, 
            overtime: totalOvertime, 
            double: totalDouble 
          },
          baseHourlyRate: baseRate,
          overtimeRate: overtimeRate,
          doubleTimeRate: doubleTimeRate,
          grossAmount: grossAmount,
          deductions: {
            federalTax: parseFloat(contractorPayrollData.federalTax) || 0,
            socialSecurity: parseFloat(contractorPayrollData.socialSecurity) || 0,
            medicare: parseFloat(contractorPayrollData.medicare) || 0,
            stateTax: parseFloat(contractorPayrollData.stateTax) || 0,
            localTaxesSDI: parseFloat(contractorPayrollData.localTaxesSDI) || 0,
            voluntaryPension: parseFloat(contractorPayrollData.voluntaryPension) || 0,
            voluntaryMedical: parseFloat(contractorPayrollData.voluntaryMedical) || 0,
            vacDues: parseFloat(contractorPayrollData.vacDues) || 0,
            travSubs: parseFloat(contractorPayrollData.travSubs) || 0,
            allOtherDeductions: parseFloat(contractorPayrollData.allOtherDeductions) || 0,
            totalDeduction: parseFloat(contractorPayrollData.totalDeduction) || 0,
          },
          fringes: {
            rateInLieuOfFringes: parseFloat(contractorPayrollData.rateInLieuOfFringes) || 0,
            totalBaseRatePlusFringes: parseFloat(contractorPayrollData.totalBaseRatePlusFringes) || 0,
            hwRate: parseFloat(contractorPayrollData.hwRate) || 0,
            healthWelfare: parseFloat(contractorPayrollData.healthWelfare) || 0,
            pensionRate: parseFloat(contractorPayrollData.pensionRate) || 0,
            pension: parseFloat(contractorPayrollData.pension) || 0,
            vacHolRate: parseFloat(contractorPayrollData.vacHolRate) || 0,
            vacationHoliday: parseFloat(contractorPayrollData.vacationHoliday) || 0,
            trainingRate: parseFloat(contractorPayrollData.trainingRate) || 0,
            training: parseFloat(contractorPayrollData.training) || 0,
            allOtherRate: parseFloat(contractorPayrollData.allOtherRate) || 0,
            totalFringeRateToThird: parseFloat(contractorPayrollData.totalFringeRateToThird) || 0,
            totalFringesPaidToThird: parseFloat(contractorPayrollData.totalFringesPaidToThird) || 0,
          },
          payments: {
            checkNo: contractorPayrollData.checkNo || '',
            netPaidWeek: parseFloat(contractorPayrollData.netPaidWeek) || 0,
            savings: parseFloat(contractorPayrollData.savings) || 0,
            payrollPaymentDate: contractorPayrollData.payrollPaymentDate || '',
          },
          additionalInfo: {
            fringesPaidToEmployee: contractorPayrollData.fringesPaidToEmployee || 'No',
            vacationHolidayDuesInGrossPay: contractorPayrollData.vacationHolidayDuesInGrossPay || 'Yes',
            voluntaryContributionsInGrossPay: contractorPayrollData.voluntaryContributionsInGrossPay || 'No',
            dateOfHire: contractor.dateOfHire ? new Date(contractor.dateOfHire).toLocaleDateString('en-US') : (contractor.createdAt ? new Date(contractor.createdAt).toLocaleDateString('en-US') : '10/7/2024'),
          }
        };
      }).filter(Boolean);
      
      console.log(`✅ Week ${weekIndex + 1} completed with ${weekWorkers.length} workers`);

      return {
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        workers: weekWorkers
      };
    }));

    console.log('🎉 All weeks processed successfully!');
    console.log('📊 Final data summary:', {
      totalWeeks: weeklyData.length,
      totalWorkerEntries: weeklyData.reduce((sum, week) => sum + week.workers.length, 0)
    });

    return NextResponse.json({
      success: true,
      data: {
        weekStart: startDate,
        weekEnd: endDate,
        projectName: project[0].name,
        weeks: weeklyData
      }
    });

  } catch (error: any) {
    console.error('💥 Calculate multi-week payroll error:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Failed to calculate multi-week payroll data',
      details: error.message 
    }, { status: 500 });
  }
}