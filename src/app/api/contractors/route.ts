import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, companies } from '@/lib/db/schema'
import { emailService } from '@/lib/email-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

const PG_UNIQUE_VIOLATION = '23505'
async function checkContractorLimit(companyId: string): Promise<{ canAdd: boolean; currentCount: number; limit: number; membershipLevel: string | null }> {
  const company = await db.select({
    membershipInfo: companies.membershipInfo
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  if (company.length === 0) {
    throw new Error('Company not found')
  }

  const membershipInfo = company[0].membershipInfo as any
  const membershipLevel = membershipInfo?.membershipLevel || '1'

  // Get current contractor count
  const contractorCountResult = await db.select({ count: count() })
    .from(contractors)
    .where(eq(contractors.companyId, companyId))

  const currentCount = contractorCountResult[0]?.count || 0
  let limit = 100 // Default limit for non-level 3 members
  if (membershipLevel === '3') {
    limit = 400
  } else if  (membershipLevel === '2') {
    limit = 200 // Limit for level 2 members
  } else if (membershipLevel === '1') {
    limit = 100
  }

  return {
    canAdd: currentCount < limit,
    currentCount,
    limit,
    membershipLevel
  }
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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build query conditions - filter by admin's company
    const conditions = [eq(contractors.companyId, auth.admin.companyId)]
    
    // Add search filter if specified
    if (search) {
      const searchCondition = or(
        ilike(contractors.firstName, `%${search}%`),
        ilike(contractors.lastName, `%${search}%`),
        ilike(contractors.email, `%${search}%`),
        ilike(contractors.code, `%${search}%`)
      )
      if (searchCondition) {
        conditions.push(searchCondition)
      }
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(contractors)
      .where(and(...conditions))
    const totalCount = Number(countResult[0].count)

    // Execute query
    const result = await db.select().from(contractors)
      .where(and(...conditions))
      .orderBy(desc(contractors.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      contractors: result,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      meta: {
        limit,
        offset,
        companyId: auth.admin.companyId
      }
    })

  } catch (error) {
    console.error('Get contractors error:', error)
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
    const { firstName, lastName, email, code, rate, companyName, language } = body

    // Validate required fields
    if (!firstName || !lastName || !email || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, code' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const limitCheck = await checkContractorLimit(auth.admin.companyId)
    if (!limitCheck.canAdd && limitCheck.membershipLevel !== '3') {
      return NextResponse.json(
        { 
          error: 'Contractor limit exceeded',
          message: `You have reached the maximum number of contractors (${limitCheck.limit}) for your membership level. Please upgrade to add more contractors.`,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          membershipLevel: limitCheck.membershipLevel
        },
        { status: 403 }
      )
    }

    const existingEmailContractor = await db
      .select()
      .from(contractors)
      .where(
        and(
          eq(contractors.email, email.trim().toLowerCase()),
          eq(contractors.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingEmailContractor.length > 0) {
      return NextResponse.json(
        { error: 'Email address already exists in your company' },
        { status: 409 }
      )
    }

    // Check if contractor code already exists
    const existingCodeContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.code, code.trim().toUpperCase()))
      .limit(1)

    if (existingCodeContractor.length > 0) {
      return NextResponse.json(
        { error: 'Contractor code already exists' },
        { status: 409 }
      )
    }

    // Prepare contractor data
    const contractorData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      code: code.trim().toUpperCase(),
      companyId: auth.admin.companyId,
    }

    // Add rate if provided and valid
    if (rate !== undefined && rate !== null && rate !== '') {
      const rateValue = parseFloat(rate)
      if (!isNaN(rateValue) && rateValue >= 0 && rateValue <= 9999.99) {
        contractorData.rate = rateValue.toFixed(2)
      }
    }

    // Add company name if provided
    if (companyName && companyName.trim()) {
      contractorData.companyName = companyName.trim()
    }

    // Add language if provided, otherwise default to 'en'
    if (language && (language === 'en' || language === 'es')) {
      contractorData.language = language
    } else {
      contractorData.language = 'en'
    }

    // Create contractor record
    const contractor = await db.insert(contractors).values(contractorData).returning()

    // // Send welcome email (non-blocking)
    // try {
    //   await emailService.sendContractorWelcomeEmail({
    //     contractorEmail: contractor[0].email,
    //     contractorName: `${contractor[0].firstName} ${contractor[0].lastName}`,
    //     contractorCode: contractor[0].code,
    //     companyName: auth.admin.companyName || 'Your Company',
    //     adminEmail: 'zerniereyes@gmail.com',
    //   });
    // } catch (emailError) {
    //   console.error('Failed to send welcome email:', emailError);
    //   // Don't fail the contractor creation if email fails
    // }

    return NextResponse.json({
      success: true,
      contractor: contractor[0]
    })

  } catch (error: any) {
    console.error('Create contractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_email') || error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email address already exists in your company' },
          { status: 409 }
        )
      }
      if (error.constraint?.includes('code')) {
        return NextResponse.json(
          { error: 'Contractor code already exists' },
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
    const { id, firstName, lastName, email, code, rate, companyName, language } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, code' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if contractor exists and belongs to admin's company
    const existingContractor = await db.select().from(contractors)
      .where(and(
        eq(contractors.id, id),
        eq(contractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingContractor.length === 0) {
      return NextResponse.json(
        { error: 'Contractor not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      code: code.trim().toUpperCase(),
      updatedAt: new Date()
    }

    // Add rate if provided and valid
    if (rate !== undefined && rate !== null && rate !== '') {
      const rateValue = parseFloat(rate)
      if (!isNaN(rateValue) && rateValue >= 0 && rateValue <= 9999.99) {
        updateData.rate = rateValue.toFixed(2)
      }
    } else {
      // Set rate to null if empty string is provided
      updateData.rate = null
    }

    // Add company name if provided, otherwise set to null
    if (companyName && companyName.trim()) {
      updateData.companyName = companyName.trim()
    } else {
      updateData.companyName = null
    }

    // Add language if provided, otherwise default to 'en'
    if (language && (language === 'en' || language === 'es')) {
      updateData.language = language
    } else {
      updateData.language = 'en'
    }

    // Update contractor
    const updatedContractor = await db.update(contractors)
      .set(updateData)
      .where(eq(contractors.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      contractor: updatedContractor[0]
    })

  } catch (error: any) {
    console.error('Update contractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('email')) {
        return NextResponse.json(
          { error: 'Email address already exists' },
          { status: 409 }
        )
      }
      if (error.constraint?.includes('code')) {
        return NextResponse.json(
          { error: 'Contractor code already exists' },
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
    const contractorId = searchParams.get('id')

    if (!contractorId) {
      return NextResponse.json(
        { error: 'Contractor ID is required' },
        { status: 400 }
      )
    }

    // Check if contractor exists and belongs to admin's company
    const existingContractor = await db.select().from(contractors)
      .where(and(
        eq(contractors.id, contractorId),
        eq(contractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingContractor.length === 0) {
      return NextResponse.json(
        { error: 'Contractor not found or access denied' },
        { status: 404 }
      )
    }

    // Delete contractor
    await db.delete(contractors)
      .where(eq(contractors.id, contractorId))

    return NextResponse.json({
      success: true,
      message: 'Contractor deleted successfully'
    })

  } catch (error) {
    console.error('Delete contractor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}