import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { timesheets, contractors, projects } from '@/lib/db/schema'
import { eq, and, gte, lte, inArray, sql } from 'drizzle-orm'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest) {
  const authType = request.nextUrl.searchParams.get('authType') || 'admin'
  
  if (authType === 'admin') {
    const adminToken = request.cookies.get('adminAuthToken')?.value || 
                      (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                       request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
    
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET) as any
        if (decoded.admin && decoded.isAdmin) {
          return { isAdmin: true, admin: decoded.admin }
        }
      } catch (error) {
        throw new Error('Invalid admin token')
      }
    }
    throw new Error('No admin authentication token found')
  }
  
  throw new Error('Admin authentication required')
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    const auth = authenticateAdmin(request)
    
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const employeeIds = searchParams.get('employeeIds')?.split(',').filter(Boolean)

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    const conditions = [eq(timesheets.companyId, companyId)]

    if (startDate) {
      conditions.push(gte(timesheets.date, startDate))
    }

    if (endDate) {
      conditions.push(lte(timesheets.date, endDate))
    }

    if (employeeIds && employeeIds.length > 0) {
      conditions.push(inArray(timesheets.userId, employeeIds))
    }

    const result = await db
      .select({
        date: timesheets.date,
        employee: timesheets.employee,
        userId: timesheets.userId,
        timeSpent: timesheets.timeSpent,
        projectName: timesheets.projectName,
        jobDescription: timesheets.jobDescription,
      })
      .from(timesheets)
      .innerJoin(projects, and(
        eq(projects.name, timesheets.projectName),
        eq(projects.companyId, timesheets.companyId)
      ))
      .where(and(...conditions))
      .orderBy(timesheets.date)

    // Get list of available employees for the company
    const employees = await db
      .select({
        id: contractors.id,
        name: sql<string>`${contractors.firstName} || ' ' || ${contractors.lastName}`,
        firstName: contractors.firstName,
        lastName: contractors.lastName,
      })
      .from(contractors)
      .where(eq(contractors.companyId, companyId))

    // Group data by date for charting
    const chartData = result.reduce((acc: any[], row) => {
      const existingDate = acc.find(item => item.date === row.date)
      if (existingDate) {
        existingDate.totalHours += parseFloat(row.timeSpent.toString())
        if (!existingDate.employees.includes(row.employee)) {
          existingDate.employees.push(row.employee)
        }
      } else {
        acc.push({
          date: row.date,
          totalHours: parseFloat(row.timeSpent.toString()),
          employees: [row.employee]
        })
      }
      return acc
    }, [])

    // Sort chart data by date
    chartData.sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      chartData,
      rawData: result,
      employees: employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        firstName: emp.firstName,
        lastName: emp.lastName
      }))
    })

  } catch (error: any) {
    console.error('Error fetching reporting data:', error)
    
    // Handle authentication errors
    if (error.message?.includes('authentication') || error.message?.includes('token')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch reporting data' },
      { status: 500 }
    )
  }
}