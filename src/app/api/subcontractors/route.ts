import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm'
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

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build query conditions - filter by admin's company
    const conditions = [eq(subcontractors.companyId, auth.admin.companyId)]
    
    // Add search filter if specified
    if (search) {
      const searchCondition = ilike(subcontractors.name, `%${search}%`)
      conditions.push(searchCondition)
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(subcontractors)
      .where(and(...conditions))
    const totalCount = Number(countResult[0].count)

    // Execute query with pagination
    const result = await db.select().from(subcontractors)
      .where(and(...conditions))
      .orderBy(desc(subcontractors.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      subcontractors: result,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
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
    
    // Check if this is a bulk operation
    if (Array.isArray(body.subcontractors)) {
      // Bulk create subcontractors
      const { subcontractors: subcontractorsData } = body
      
      if (!subcontractorsData || subcontractorsData.length === 0) {
        return NextResponse.json(
          { error: 'No subcontractors provided' },
          { status: 400 }
        )
      }

      // Validate each subcontractor
      for (const subcontractor of subcontractorsData) {
        if (!subcontractor.name) {
          return NextResponse.json(
            { error: 'Missing required field in subcontractor data: name' },
            { status: 400 }
          )
        }
      }

      // Get existing subcontractor names to avoid duplicates
      const existingSubcontractors = await db
        .select({ name: subcontractors.name })
        .from(subcontractors)
        .where(eq(subcontractors.companyId, auth.admin.companyId))

      const existingNames = new Set(existingSubcontractors.map(s => s.name.toLowerCase()))

      // Filter out duplicates and prepare data
      const uniqueSubcontractors = subcontractorsData.filter((subcontractor: any) => 
        !existingNames.has(subcontractor.name.trim().toLowerCase())
      )

      if (uniqueSubcontractors.length === 0) {
        return NextResponse.json(
          { error: 'All subcontractors already exist in your company' },
          { status: 409 }
        )
      }

      // Prepare subcontractor data
      const preparedSubcontractors = uniqueSubcontractors.map((subcontractor: any) => ({
        name: subcontractor.name.trim(),
        companyId: auth.admin.companyId,
      }))

      // Create subcontractors with enhanced error handling
      const createdSubcontractors = []
      const errors = []
      
      for (const subcontractorData of preparedSubcontractors) {
        try {
          const [createdSubcontractor] = await db.insert(subcontractors).values(subcontractorData).returning()
          createdSubcontractors.push(createdSubcontractor)
        } catch (insertError: any) {
          if (insertError.code === '23505') {
            if (insertError.constraint?.includes('company_subcontractor_unique')) {
              errors.push(`Subcontractor '${subcontractorData.name}' already exists in your company`)
            } else {
              errors.push(`Duplicate entry detected for subcontractor '${subcontractorData.name}'`)
            }
          } else {
            errors.push(`Failed to create subcontractor '${subcontractorData.name}': ${insertError.message}`)
          }
        }
      }

      const totalSkipped = (subcontractorsData.length - uniqueSubcontractors.length) + errors.length

      if (errors.length > 0 && createdSubcontractors.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Failed to create any subcontractors',
            errors: errors 
          },
          { status: 409 }
        )
      }

      return NextResponse.json({
        success: true,
        subcontractors: createdSubcontractors,
        created: createdSubcontractors.length,
        skipped: totalSkipped,
        ...(errors.length > 0 && { warnings: errors })
      })
    }

    // Single subcontractor creation (existing logic)
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
      if (error.constraint?.includes('company_subcontractor_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Subcontractor name already exists in your company',
            message: 'A subcontractor with this name already exists in your company. Subcontractor names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to create subcontractor due to an unexpected error' 
      },
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
      if (error.constraint?.includes('company_subcontractor_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Subcontractor name already exists in your company',
            message: 'Another subcontractor with this name already exists in your company. Subcontractor names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to update subcontractor due to an unexpected error' 
      },
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