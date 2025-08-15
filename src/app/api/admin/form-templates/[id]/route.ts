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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if template exists and belongs to this company
    const existingTemplate = await db.select().from(formTemplates)
      .where(and(
        eq(formTemplates.id, params.id),
        eq(formTemplates.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (!existingTemplate.length) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Don't allow editing default templates
    if (existingTemplate[0].isDefault === 'true') {
      return NextResponse.json(
        { error: 'Cannot edit default templates' },
        { status: 403 }
      )
    }

    // Update template
    const updatedTemplate = await db.update(formTemplates)
      .set({
        name,
        description: description || null,
        modules
      })
      .where(and(
        eq(formTemplates.id, params.id),
        eq(formTemplates.companyId, auth.admin.companyId)
      ))
      .returning()

    return NextResponse.json({
      success: true,
      template: updatedTemplate[0],
      message: 'Template updated successfully'
    })

  } catch (error: any) {
    console.error('Update form template error:', error)
    
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Check if template exists and belongs to this company
    const existingTemplate = await db.select().from(formTemplates)
      .where(and(
        eq(formTemplates.id, params.id),
        eq(formTemplates.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (!existingTemplate.length) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Don't allow deleting default templates
    if (existingTemplate[0].isDefault === 'true') {
      return NextResponse.json(
        { error: 'Cannot delete default templates' },
        { status: 403 }
      )
    }

    // Delete template
    await db.delete(formTemplates)
      .where(and(
        eq(formTemplates.id, params.id),
        eq(formTemplates.companyId, auth.admin.companyId)
      ))

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    })

  } catch (error: any) {
    console.error('Delete form template error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}