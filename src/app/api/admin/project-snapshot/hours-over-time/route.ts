import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets } from '@/lib/db/schema'
import { eq, gte, lte, and, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

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

function authenticateAdminRequest(request: NextRequest) {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return decoded.admin
      }
    } catch (error) {
      throw new Error('Invalid admin token')
    }
  }
  throw new Error('No admin authentication token found')
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    let admin: AdminTokenPayload['admin']
    try {
      admin = authenticateAdminRequest(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const project = searchParams.get('project')
    const subcontractor = searchParams.get('subcontractor')
    const period = searchParams.get('period') || 'daily' // daily, weekly, monthly
    const daysBack = parseInt(searchParams.get('daysBack') || '30')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - daysBack)

    // Build conditions
    const conditions = [
      eq(timesheets.companyId, companyId),
      eq(timesheets.status, 'approved'),
      gte(timesheets.date, startDate.toISOString().split('T')[0]),
      lte(timesheets.date, endDate.toISOString().split('T')[0])
    ]

    if (project) {
      conditions.push(eq(timesheets.projectName, project))
    }

    if (subcontractor) {
      conditions.push(eq(timesheets.company, subcontractor))
    }

    // Generate date grouping SQL based on period
    let dateGrouping: any
    
    switch (period) {
      case 'weekly':
        dateGrouping = sql`DATE_TRUNC('week', ${timesheets.date}::date)`
        break
      case 'monthly':
        dateGrouping = sql`DATE_TRUNC('month', ${timesheets.date}::date)`
        break
      default: // daily
        dateGrouping = sql`${timesheets.date}::date`
        break
    }

    // Query to get hours over time
    const results = await db
      .select({
        date: sql<string>`${dateGrouping}`,
        totalHours: sql<number>`sum(${timesheets.timeSpent}::numeric)`,
        uniqueEmployees: sql<number>`count(distinct ${timesheets.employee})`,
        entriesCount: sql<number>`count(*)`
      })
      .from(timesheets)
      .where(and(...conditions))
      .groupBy(dateGrouping)
      .orderBy(dateGrouping)

    // Format results for chart consumption
    const formattedResults = results.map(row => ({
      date: row.date,
      totalHours: parseFloat(row.totalHours.toString()),
      uniqueEmployees: parseInt(row.uniqueEmployees.toString()),
      entriesCount: parseInt(row.entriesCount.toString()),
      avgHoursPerEmployee: parseFloat((parseFloat(row.totalHours.toString()) / parseInt(row.uniqueEmployees.toString())).toFixed(2))
    }))

    // Calculate summary statistics
    const totalHours = formattedResults.reduce((sum, item) => sum + item.totalHours, 0)
    const avgDailyHours = formattedResults.length > 0 ? totalHours / formattedResults.length : 0
    const peakDay = formattedResults.reduce((max, item) => 
      item.totalHours > max.totalHours ? item : max, 
      { totalHours: 0, date: '', uniqueEmployees: 0, entriesCount: 0, avgHoursPerEmployee: 0 }
    )

    return NextResponse.json({
      hoursOverTime: formattedResults,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        avgDailyHours: Math.round(avgDailyHours * 100) / 100,
        peakDay: {
          date: peakDay.date,
          hours: peakDay.totalHours,
          employees: peakDay.uniqueEmployees
        },
        totalDays: formattedResults.length,
        totalUniqueEmployees: Math.max(...formattedResults.map(r => r.uniqueEmployees))
      },
      period,
      daysBack,
      filters: {
        project: project || null,
        subcontractor: subcontractor || null
      }
    })
  } catch (error) {
    console.error('Error fetching hours over time:', error)
    return NextResponse.json({ error: 'Failed to fetch hours over time data' }, { status: 500 })
  }
}