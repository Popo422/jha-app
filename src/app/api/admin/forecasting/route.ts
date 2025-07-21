import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { timesheets } from '@/lib/db/schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest) {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) {
    throw new Error('Admin authentication required')
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as any
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token')
    }
    return { admin: decoded.admin }
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const auth = authenticateAdmin(request)
    
    const { searchParams } = new URL(request.url)
    const companyId = auth.admin.companyId
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const projectNames = searchParams.get('projectNames')?.split(',').filter(Boolean)

    // Build query conditions
    const conditions = [
      eq(timesheets.companyId, companyId),
      eq(timesheets.status, 'approved') // Only approved timesheets for forecasting
    ]

    if (startDate) {
      conditions.push(gte(timesheets.date, startDate))
    }

    if (endDate) {
      conditions.push(lte(timesheets.date, endDate))
    }

    // Get timesheets with contractor rates for cost calculation
    const timesheetData = await db
      .select({
        date: timesheets.date,
        timeSpent: timesheets.timeSpent,
        userId: timesheets.userId,
        projectName: timesheets.projectName,
        company: timesheets.company,
        employee: timesheets.employee,
        contractorRate: sql<number>`COALESCE(contractor_rates.hourly_rate, 0)`.as('contractorRate')
      })
      .from(timesheets)
      .leftJoin(
        sql`(
          SELECT DISTINCT user_id, hourly_rate 
          FROM timesheets 
          WHERE company_id = ${companyId} AND hourly_rate IS NOT NULL
          ORDER BY created_at DESC
        ) contractor_rates`,
        sql`contractor_rates.user_id = ${timesheets.userId}`
      )
      .where(and(...conditions))
      .orderBy(timesheets.date)

    // Process data for forecasting
    const dailyCosts = new Map<string, number>()
    const projectCosts = new Map<string, number>()
    const companyCosts = new Map<string, number>()

    timesheetData.forEach(timesheet => {
      const cost = parseFloat(timesheet.timeSpent) * (timesheet.contractorRate || 0)
      const date = timesheet.date

      // Daily costs
      dailyCosts.set(date, (dailyCosts.get(date) || 0) + cost)

      // Project costs
      if (timesheet.projectName) {
        projectCosts.set(timesheet.projectName, (projectCosts.get(timesheet.projectName) || 0) + cost)
      }

      // Company costs
      if (timesheet.company) {
        companyCosts.set(timesheet.company, (companyCosts.get(timesheet.company) || 0) + cost)
      }
    })

    // Convert maps to arrays sorted by date/cost
    const dailySpendData = Array.from(dailyCosts.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const projectAnalytics = Array.from(projectCosts.entries())
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)

    const companyAnalytics = Array.from(companyCosts.entries())
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)

    // Calculate additional metrics
    const totalCost = dailySpendData.reduce((sum, item) => sum + item.cost, 0)
    const totalDays = dailySpendData.length
    const averageDailyCost = totalDays > 0 ? totalCost / totalDays : 0

    // Recent trend (last 7 days vs previous 7 days)
    const recent7Days = dailySpendData.slice(-7)
    const previous7Days = dailySpendData.slice(-14, -7)
    
    const recentAvg = recent7Days.reduce((sum, item) => sum + item.cost, 0) / Math.max(recent7Days.length, 1)
    const previousAvg = previous7Days.reduce((sum, item) => sum + item.cost, 0) / Math.max(previous7Days.length, 1)
    
    const trendPercentage = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0

    return NextResponse.json({
      dailySpendData,
      projectAnalytics,
      companyAnalytics,
      summary: {
        totalCost,
        averageDailyCost,
        totalDays,
        recentTrendPercentage: trendPercentage,
        dataRange: {
          startDate: dailySpendData[0]?.date || startDate,
          endDate: dailySpendData[dailySpendData.length - 1]?.date || endDate
        }
      }
    })

  } catch (error: any) {
    console.error('Error fetching forecasting data:', error)
    
    if (error.message?.includes('authentication') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch forecasting data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const auth = authenticateAdmin(request)
    
    const body = await request.json()
    const { 
      forecastSettings = {},
      budgetSettings = {},
      projectBudgets = {}
    } = body

    // In a real implementation, you would save these settings to a database
    // For now, we'll just return success as settings are handled client-side
    
    return NextResponse.json({
      success: true,
      message: 'Forecast settings saved successfully',
      settings: {
        forecastSettings,
        budgetSettings,
        projectBudgets
      }
    })

  } catch (error: any) {
    console.error('Error saving forecast settings:', error)
    
    if (error.message?.includes('authentication') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to save forecast settings' },
      { status: 500 }
    )
  }
}