import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subcontractors } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// PostgreSQL error codes
const PG_UNIQUE_VIOLATION = '23505'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query conditions - filter by admin's company
    const conditions = [eq(subcontractors.companyId, auth.admin.companyId)]
    
    // Add search filter if specified
    if (search) {
      const searchCondition = ilike(subcontractors.name, `%${search}%`)
      conditions.push(searchCondition)
    }

    // Execute query
    const result = await db.select().from(subcontractors)
      .where(and(...conditions))
      .orderBy(desc(subcontractors.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      subcontractors: result,
      meta: {
        limit,
        offset,
        companyId: auth.admin.companyId
      }
    })

  } catch (error) {
    console.error('Get subcontractors error:', error)
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
    const { name } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Check if subcontractor name already exists within the same company
    const existingSubcontractor = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.name, name.trim()),
          eq(subcontractors.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingSubcontractor.length > 0) {
      return NextResponse.json(
        { error: 'Subcontractor name already exists in your company' },
        { status: 409 }
      )
    }

    // Prepare subcontractor data
    const subcontractorData = {
      name: name.trim(),
      companyId: auth.admin.companyId,
    }

    // Create subcontractor record
    const subcontractor = await db.insert(subcontractors).values(subcontractorData).returning()

    return NextResponse.json({
      success: true,
      subcontractor: subcontractor[0]
    })

  } catch (error: any) {
    console.error('Create subcontractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_id_name_unique')) {
        return NextResponse.json(
          { error: 'Subcontractor name already exists in your company' },
          { status: 409 }
        )
      }
    }
    
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
    const { id, name } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Subcontractor ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Check if subcontractor exists and belongs to admin's company
    const existingSubcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.id, id),
        eq(subcontractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingSubcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      updatedAt: new Date()
    }

    // Update subcontractor
    const updatedSubcontractor = await db.update(subcontractors)
      .set(updateData)
      .where(eq(subcontractors.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      subcontractor: updatedSubcontractor[0]
    })

  } catch (error: any) {
    console.error('Update subcontractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_id_name_unique')) {
        return NextResponse.json(
          { error: 'Subcontractor name already exists in your company' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const subcontractorId = searchParams.get('id')

    if (!subcontractorId) {
      return NextResponse.json(
        { error: 'Subcontractor ID is required' },
        { status: 400 }
      )
    }

    // Check if subcontractor exists and belongs to admin's company
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

    // Delete subcontractor
    await db.delete(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))

    return NextResponse.json({
      success: true,
      message: 'Subcontractor deleted successfully'
    })

  } catch (error) {
    console.error('Delete subcontractor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}