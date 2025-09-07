import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { submissions, timesheets, contractors, projects, subcontractors, subcontractorProjects } from '@/lib/db/schema'
import { eq, and, gte, lte, or, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const project = searchParams.get('project')
    const subcontractor = searchParams.get('subcontractor')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Build where conditions dynamically
    const buildSubmissionWhere = () => {
      const conditions = [eq(submissions.companyId, companyId)]
      if (project) {
        conditions.push(eq(submissions.projectName, project))
      }
      if (subcontractor) {
        conditions.push(eq(submissions.company, subcontractor))
      }
      return conditions.length === 1 ? conditions[0] : and(...conditions)
    }

    const buildTimesheetWhere = () => {
      const conditions = [eq(timesheets.companyId, companyId)]
      if (project) {
        conditions.push(eq(timesheets.projectName, project))
      }
      if (subcontractor) {
        conditions.push(eq(timesheets.company, subcontractor))
      }
      return conditions.length === 1 ? conditions[0] : and(...conditions)
    }

    const buildContractorWhere = () => {
      const conditions = [eq(contractors.companyId, companyId)]
      if (subcontractor) {
        // Filter contractors by their company name (subcontractor)
        conditions.push(eq(contractors.companyName, subcontractor))
      }
      // Note: contractors table doesn't have project info, so we can't filter by project directly
      return conditions.length === 1 ? conditions[0] : and(...conditions)
    }

    // 1. Total Incidents
    const totalIncidentsResult = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(submissions)
      .where(and(
        buildSubmissionWhere(),
        or(
          eq(submissions.submissionType, 'incident-report'),
          eq(submissions.submissionType, 'quick-incident-report')
        )
      ))

    const totalIncidents = totalIncidentsResult[0]?.count || 0

    // 2. Man Hours (from approved timesheets)
    const manHoursResult = await db
      .select({
        totalHours: sql<number>`sum(${timesheets.timeSpent})`
      })
      .from(timesheets)
      .where(and(
        buildTimesheetWhere(),
        eq(timesheets.status, 'approved')
      ))

    const manHours = manHoursResult[0]?.totalHours || 0

    // 3. TRIR Calculation (incidents * 200,000 / man hours)
    const trir = manHours > 0 ? (totalIncidents * 200000) / manHours : 0

    // 4. Active Contractors (get contractors through their timesheet activity for the filtered scope)
    const activeContractorsResult = await db
      .select({
        count: sql<number>`count(distinct ${timesheets.userId})`
      })
      .from(timesheets)
      .where(buildTimesheetWhere())

    const activeContractors = activeContractorsResult[0]?.count || 0

    // 5. Compliance Rate (expected vs actual submissions)
    // Get submissions this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const submissionsThisWeekResult = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(submissions)
      .where(and(
        buildSubmissionWhere(),
        gte(submissions.createdAt, oneWeekAgo)
      ))

    const submissionsThisWeek = submissionsThisWeekResult[0]?.count || 0
    
    // Calculate expected submissions: activeContractors * 5 submissions per week
    const totalExpectedSubmissions = activeContractors * 5 // Assuming 5 submissions per week per contractor
    const complianceRate = totalExpectedSubmissions > 0 
      ? Math.round((submissionsThisWeek / totalExpectedSubmissions) * 100)
      : 100

    // 6. Completion Rate (approved timesheets vs total timesheets)
    const totalTimesheetsResult = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(timesheets)
      .where(buildTimesheetWhere())

    const approvedTimesheetsResult = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(timesheets)
      .where(and(
        buildTimesheetWhere(),
        eq(timesheets.status, 'approved')
      ))

    const totalTimesheets = totalTimesheetsResult[0]?.count || 0
    const approvedTimesheets = approvedTimesheetsResult[0]?.count || 0
    const completionRate = totalTimesheets > 0 ? (approvedTimesheets / totalTimesheets) * 100 : 100

    return NextResponse.json({
      totalIncidents,
      trir: parseFloat(trir.toFixed(2)),
      manHours: Math.round(manHours),
      activeContractors,
      complianceRate: Math.round(complianceRate),
      completionRate: Math.round(completionRate)
    })

  } catch (error) {
    console.error('Error fetching project snapshot metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}