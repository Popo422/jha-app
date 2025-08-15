import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { formTemplates } from '@/lib/db/schema'

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

    // Get all form templates for this company
    const templates = await db.select().from(formTemplates)
      .where(eq(formTemplates.companyId, auth.admin.companyId))

    return NextResponse.json({
      success: true,
      templates: templates
    })

  } catch (error) {
    console.error('Get form templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { name, description, modules } = body

    // Validate required fields
    if (!name || !modules || !Array.isArray(modules)) {
      return NextResponse.json(
        { error: 'Name and modules are required' },
        { status: 400 }
      )
    }

    // Validate modules
    const validModules = ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection', 'timesheet']
    const invalidModules = modules.filter(module => !validModules.includes(module))
    
    if (invalidModules.length > 0) {
      return NextResponse.json(
        { error: `Invalid modules: ${invalidModules.join(', ')}` },
        { status: 400 }
      )
    }

    // Create new template
    const newTemplate = await db.insert(formTemplates)
      .values({
        name,
        description: description || null,
        modules,
        companyId: auth.admin.companyId,
        createdBy: auth.admin.id,
        createdByName: auth.admin.name,
        isDefault: 'false'
      })
      .returning()

    return NextResponse.json({
      success: true,
      template: newTemplate[0],
      message: 'Form template created successfully'
    })

  } catch (error: any) {
    console.error('Create form template error:', error)
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}