import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { contractors, submissions, timesheets } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { isAdmin: boolean; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const admin = auth.admin
    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      return NextResponse.json(
        { message: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    // Get current date and week boundaries
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Get total active contractors
    const [totalContractors] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contractors)
      .where(eq(contractors.companyId, admin.companyId))

    // Get contractors added this week
    const [contractorsThisWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contractors)
      .where(
        and(
          eq(contractors.companyId, admin.companyId),
          gte(contractors.createdAt, oneWeekAgo)
        )
      )

    // Get total submissions this week
    const [submissionsThisWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.companyId, admin.companyId),
          gte(submissions.createdAt, oneWeekAgo)
        )
      )

    // Get submissions today
    const [submissionsToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.companyId, admin.companyId),
          gte(submissions.createdAt, todayStart)
        )
      )

    // Get timesheets this week
    const [timesheetsThisWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.companyId, admin.companyId),
          gte(timesheets.createdAt, oneWeekAgo)
        )
      )

    // Get timesheets today
    const [timesheetsToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.companyId, admin.companyId),
          gte(timesheets.createdAt, todayStart)
        )
      )

    // Calculate compliance rate (simple example - could be more sophisticated)
    const totalExpectedSubmissions = totalContractors.count * 5 // Assuming 5 submissions per week per contractor
    const actualSubmissions = submissionsThisWeek.count
    const complianceRate = totalExpectedSubmissions > 0 
      ? Math.round((actualSubmissions / totalExpectedSubmissions) * 100)
      : 100

    // Get recent activity (last 10 submissions/timesheets)
    const recentSubmissions = await db
      .select({
        type: sql<string>`'submission'`,
        action: submissions.submissionType,
        completedBy: submissions.completedBy,
        createdAt: submissions.createdAt
      })
      .from(submissions)
      .where(eq(submissions.companyId, admin.companyId))
      .orderBy(sql`${submissions.createdAt} desc`)
      .limit(5)

    const recentTimesheets = await db
      .select({
        type: sql<string>`'timesheet'`,
        action: sql<string>`'timesheet'`,
        completedBy: timesheets.employee,
        createdAt: timesheets.createdAt
      })
      .from(timesheets)
      .where(eq(timesheets.companyId, admin.companyId))
      .orderBy(sql`${timesheets.createdAt} desc`)
      .limit(5)

    // Combine and sort recent activity
    const recentActivity = [...recentSubmissions, ...recentTimesheets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(item => ({
        action: item.type === 'submission' 
          ? `${item.action} form submitted`
          : 'Timesheet submitted',
        contractor: item.completedBy,
        time: formatTimeAgo(item.createdAt)
      }))

    // Get action required items
    // Urgent safety forms (submissions from last 24 hours that might need immediate attention)
    const urgentSafetyForms = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.companyId, admin.companyId),
          gte(submissions.createdAt, todayStart),
          sql`${submissions.submissionType} IN ('job-hazard-analysis', 'incident-report', 'quick-incident-report')`
        )
      )

    // Pending timesheets (status = 'pending')
    const pendingTimesheets = await db
      .select({ count: sql<number>`count(*)` })
      .from(timesheets)
      .where(
        and(
          eq(timesheets.companyId, admin.companyId),
          eq(timesheets.status, 'pending')
        )
      )

    // Recent safety forms (submissions from last 3 days that might need review)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const recentSafetyForms = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(
        and(
          eq(submissions.companyId, admin.companyId),
          gte(submissions.createdAt, threeDaysAgo)
        )
      )

    return NextResponse.json({
      activeContractors: {
        total: totalContractors.count,
        thisWeek: contractorsThisWeek.count
      },
      submissions: {
        thisWeek: submissionsThisWeek.count,
        today: submissionsToday.count
      },
      timesheets: {
        thisWeek: timesheetsThisWeek.count,
        today: timesheetsToday.count
      },
      complianceRate,
      recentActivity,
      actionRequired: {
        urgentSafetyForms: urgentSafetyForms[0].count,
        pendingTimesheets: pendingTimesheets[0].count,
        recentSafetyForms: recentSafetyForms[0].count
      }
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else {
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }
}