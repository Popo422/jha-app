import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { supervisors, users } from '@/lib/db/schema'
import { eq, and, ilike, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const adminCookieToken = request.cookies.get('adminAuthToken')?.value
  const contractorCookieToken = request.cookies.get('contractorAuthToken')?.value
  
  const token = authHeader?.replace('Bearer ', '') || adminCookieToken || contractorCookieToken

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.admin || decoded.contractor
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    
    if (!user || !user.companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search')
    const fetchAll = searchParams.get('fetchAll') === 'true'

    const limit = fetchAll ? undefined : pageSize
    const offset = fetchAll ? undefined : (page - 1) * pageSize

    // Build conditions
    let conditions = eq(supervisors.companyId, user.companyId)
    
    if (search) {
      conditions = and(
        conditions,
        ilike(supervisors.name, `%${search}%`)
      ) as any
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(supervisors)
      .where(conditions)
    const totalCount = Number(countResult[0].count)

    // Get supervisors with pagination
    const baseQuery = db.select().from(supervisors).where(conditions)
    
    const supervisorsList = fetchAll
      ? await baseQuery
      : await baseQuery.limit(limit!).offset(offset!)

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({ 
      supervisors: supervisorsList,
      pagination: fetchAll ? null : {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })
  } catch (error) {
    console.error('Error fetching supervisors:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    
    if (!user || !user.companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins can create supervisors
    if (!user.role || !['admin', 'super-admin'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const { name } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Supervisor name is required' },
        { status: 400 }
      )
    }

    // Check if supervisor already exists in this company
    const existingSupervisor = await db
      .select()
      .from(supervisors)
      .where(
        and(
          eq(supervisors.companyId, user.companyId),
          eq(supervisors.name, name.trim())
        )
      )
      .limit(1)

    if (existingSupervisor.length > 0) {
      return NextResponse.json(
        { message: 'Supervisor with this name already exists' },
        { status: 409 }
      )
    }

    // Create new supervisor
    const [newSupervisor] = await db
      .insert(supervisors)
      .values({
        name: name.trim(),
        companyId: user.companyId,
      })
      .returning()

    return NextResponse.json({
      message: 'Supervisor created successfully',
      supervisor: newSupervisor
    })
  } catch (error) {
    console.error('Error creating supervisor:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}