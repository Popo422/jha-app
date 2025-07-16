import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

    // Get company's current module configuration
    const company = await db.select().from(companies)
      .where(eq(companies.id, auth.admin.companyId))
      .limit(1)

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      enabledModules: company[0].enabledModules || ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'timesheet'],
      availableModules: [
        { id: 'start-of-day', name: 'Start of Day Report', description: 'Daily morning health and safety check' },
        { id: 'end-of-day', name: 'End of Day Report', description: 'Daily evening status and incident report' },
        { id: 'job-hazard-analysis', name: 'Job Hazard Analysis (JHA)', description: 'Hazard identification and risk assessment' },
        { id: 'incident-report', name: 'Incident Report', description: 'Incident documentation and safety compliance reporting' },
        { id: 'timesheet', name: 'Timesheet', description: 'Time tracking and job details' }
      ],
      lastUpdated: {
        at: company[0].modulesLastUpdatedAt,
        by: company[0].modulesLastUpdatedBy,
        byUserId: company[0].modulesLastUpdatedByUserId
      }
    })

  } catch (error) {
    console.error('Get modules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { enabledModules } = body

    // Validate enabled modules
    if (!Array.isArray(enabledModules)) {
      return NextResponse.json(
        { error: 'enabledModules must be an array' },
        { status: 400 }
      )
    }

    const validModules = ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'timesheet']
    const invalidModules = enabledModules.filter(module => !validModules.includes(module))
    
    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid modules: ${invalidModules.join(', ')}` },
        { status: 400 }
      )
    }

    // Update company's enabled modules with audit trail
    const now = new Date()
    const updatedCompany = await db.update(companies)
      .set({
        enabledModules: enabledModules,
        modulesLastUpdatedAt: now,
        modulesLastUpdatedBy: auth.admin.name,
        modulesLastUpdatedByUserId: auth.admin.id,
        updatedAt: now
      })
      .where(eq(companies.id, auth.admin.companyId))
      .returning()

    return NextResponse.json({
      success: true,
      enabledModules: updatedCompany[0].enabledModules,
      message: 'Module configuration updated successfully'
    })

  } catch (error) {
    console.error('Update modules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}