import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subcontractors } from '@/lib/db/schema'

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

    // Get subcontractor ID from query params
    const { searchParams } = new URL(request.url)
    const subcontractorId = searchParams.get('subcontractorId')

    if (!subcontractorId) {
      // Return all subcontractors for selection
      const allSubcontractors = await db.select({
        id: subcontractors.id,
        name: subcontractors.name,
        enabledModules: subcontractors.enabledModules,
        modulesLastUpdatedAt: subcontractors.modulesLastUpdatedAt,
        modulesLastUpdatedBy: subcontractors.modulesLastUpdatedBy
      }).from(subcontractors)
        .where(eq(subcontractors.companyId, auth.admin.companyId))

      return NextResponse.json({
        success: true,
        subcontractors: allSubcontractors,
        availableModules: [
          { id: 'start-of-day', name: 'Start of Day Report', description: 'Daily morning health and safety check' },
          { id: 'end-of-day', name: 'End of Day Report', description: 'Daily evening status and incident report' },
          { id: 'job-hazard-analysis', name: 'Job Hazard Analysis (JHA)', description: 'Hazard identification and risk assessment' },
          { id: 'incident-report', name: 'Incident Report', description: 'Incident documentation and safety compliance reporting' },
          { id: 'quick-incident-report', name: 'Quick Incident Report', description: 'Quick incident documentation with basic details' },
          { id: 'near-miss-report', name: 'Near Miss Report', description: 'Document near miss incidents and potential hazards for safety analysis' },
          { id: 'vehicle-inspection', name: 'Vehicle Inspection', description: 'Daily vehicle inspection weekly report for equipment safety' },
          { id: 'timesheet', name: 'Timesheet', description: 'Time tracking and job details' }
        ]
      })
    }

    // Get specific subcontractor's module configuration
    const subcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.id, subcontractorId),
        eq(subcontractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (subcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      subcontractor: {
        id: subcontractor[0].id,
        name: subcontractor[0].name
      },
      enabledModules: subcontractor[0].enabledModules || ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection', 'timesheet'],
      availableModules: [
        { id: 'start-of-day', name: 'Start of Day Report', description: 'Daily morning health and safety check' },
        { id: 'end-of-day', name: 'End of Day Report', description: 'Daily evening status and incident report' },
        { id: 'job-hazard-analysis', name: 'Job Hazard Analysis (JHA)', description: 'Hazard identification and risk assessment' },
        { id: 'incident-report', name: 'Incident Report', description: 'Incident documentation and safety compliance reporting' },
        { id: 'quick-incident-report', name: 'Quick Incident Report', description: 'Quick incident documentation with basic details' },
        { id: 'near-miss-report', name: 'Near Miss Report', description: 'Document near miss incidents and potential hazards for safety analysis' },
        { id: 'vehicle-inspection', name: 'Vehicle Inspection', description: 'Daily vehicle inspection weekly report for equipment safety' },
        { id: 'timesheet', name: 'Timesheet', description: 'Time tracking and job details' }
      ],
      lastUpdated: {
        at: subcontractor[0].modulesLastUpdatedAt,
        by: subcontractor[0].modulesLastUpdatedBy,
        byUserId: subcontractor[0].modulesLastUpdatedByUserId
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
    const { enabledModules, subcontractorId } = body

    // Validate required fields
    if (!subcontractorId) {
      return NextResponse.json(
        { error: 'subcontractorId is required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(enabledModules)) {
      return NextResponse.json(
        { error: 'enabledModules must be an array' },
        { status: 400 }
      )
    }

    const validModules = ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection', 'timesheet']
    const invalidModules = enabledModules.filter(module => !validModules.includes(module))
    
    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid modules: ${invalidModules.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify subcontractor belongs to admin's company
    const existingSubcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.id, subcontractorId),
        eq(subcontractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingSubcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found or access denied' },
        { status: 404 }
      )
    }

    // Update subcontractor's enabled modules with audit trail
    const now = new Date()
    const updatedSubcontractor = await db.update(subcontractors)
      .set({
        enabledModules: enabledModules,
        modulesLastUpdatedAt: now,
        modulesLastUpdatedBy: auth.admin.name,
        modulesLastUpdatedByUserId: auth.admin.id,
        updatedAt: now
      })
      .where(eq(subcontractors.id, subcontractorId))
      .returning()

    return NextResponse.json({
      success: true,
      subcontractor: {
        id: updatedSubcontractor[0].id,
        name: updatedSubcontractor[0].name
      },
      enabledModules: updatedSubcontractor[0].enabledModules,
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