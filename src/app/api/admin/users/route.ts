import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, companies } from '@/lib/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

async function getAdminFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('adminAuthToken')?.value
  
  const token = authHeader?.replace('Bearer ', '') || cookieToken

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.admin
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request)
    
    if (!admin || admin.role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Access denied. Super-admin privileges required.' },
        { status: 403 }
      )
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build conditions
    const conditions = and(
      eq(users.companyId, admin.companyId),
      or(
        eq(users.role, 'admin'),
        eq(users.role, 'super-admin')
      )
    )

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(users)
      .where(conditions)
    const totalCount = Number(countResult[0].count)

    // Get admin users from the same company with pagination
    const adminUsers = await db.select({
      user: users,
      company: companies
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(conditions)
    .limit(limit)
    .offset(offset)

    const admins = adminUsers.map(({ user, company }) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: company?.name || 'Unknown Company',
      createdAt: user.createdAt
    }))

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({ 
      admins,
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
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request)
    
    if (!admin || admin.role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Access denied. Super-admin privileges required.' },
        { status: 403 }
      )
    }

    const { name, email, password, role } = await request.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Name, email, password, and role are required' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Role must be either "admin" or "super-admin"' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create new admin user
    const [newAdmin] = await db
      .insert(users)
      .values({
        email,
        name,
        password: hashedPassword,
        role,
        companyId: admin.companyId
      })
      .returning()

    return NextResponse.json({
      message: 'Admin user created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role
      }
    })
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}