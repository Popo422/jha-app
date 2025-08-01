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

async function handleBulkCreateAdmins(admin: any, adminUsersData: any[]) {
  if (!adminUsersData || !Array.isArray(adminUsersData)) {
    return NextResponse.json(
      { message: 'Invalid request body. Expected adminUsers array.' },
      { status: 400 }
    )
  }

  // Validate each admin user
  for (const user of adminUsersData) {
    if (!user.name || !user.email) {
      return NextResponse.json(
        { message: 'Each admin user must have name and email' },
        { status: 400 }
      )
    }
    if (user.role && user.role !== 'admin' && user.role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Role must be either "admin" or "super-admin"' },
        { status: 400 }
      )
    }
  }

  // Pre-filter duplicates instead of failing
  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.companyId, admin.companyId))
  
  const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()))
  const uniqueUsers = adminUsersData.filter((user: any) => 
    !existingEmails.has(user.email.trim().toLowerCase())
  )
  
  const skippedUsers = adminUsersData.filter((user: any) => 
    existingEmails.has(user.email.trim().toLowerCase())
  )
  
  const skippedCount = skippedUsers.length

  // Insert admin users with enhanced error handling
  const insertedUsers = []
  const errors = []
  const saltRounds = 12
  
  for (const user of uniqueUsers) {
    try {
      // Generate password if not provided
      const password = user.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      const [insertedUser] = await db.insert(users).values({
        name: user.name.trim(),
        email: user.email.trim(),
        password: hashedPassword,
        role: user.role || 'admin',
        companyId: admin.companyId,
        companyName: user.companyName?.trim() || null
      }).returning()
      
      insertedUsers.push({
        id: insertedUser.id,
        email: insertedUser.email,
        name: insertedUser.name,
        role: insertedUser.role
      })
    } catch (insertError: any) {
      if (insertError.code === '23505') {
        errors.push(`Admin user with email ${user.email} already exists`)
      } else {
        errors.push(`Failed to create admin user ${user.name}: ${insertError.message}`)
      }
    }
  }

  if (errors.length > 0 && insertedUsers.length === 0) {
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to create any admin users',
        errors: errors 
      },
      { status: 409 }
    )
  }

  return NextResponse.json({
    success: true,
    adminUsers: insertedUsers,
    message: `Successfully created ${insertedUsers.length} admin user${insertedUsers.length !== 1 ? 's' : ''}`,
    created: insertedUsers.length,
    ...(skippedCount > 0 && { skipped: skippedCount }),
    ...(errors.length > 0 && { warnings: errors })
  })
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
    const fetchAll = searchParams.get('fetchAll') === 'true'
    const limit = fetchAll ? undefined : pageSize
    const offset = fetchAll ? undefined : (page - 1) * pageSize

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
    const baseQuery = db.select({
      user: users,
      company: companies
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(conditions)
    
    const adminUsers = fetchAll
      ? await baseQuery
      : await baseQuery.limit(limit!).offset(offset!)

    const admins = adminUsers.map(({ user, company }) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyName: user.companyName || '',
      organizationName: company?.name || 'Unknown Company',
      createdAt: user.createdAt
    }))

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({ 
      adminUsers: admins,
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

    const body = await request.json()
    
    // Check if this is a bulk creation request
    if (body.adminUsers && Array.isArray(body.adminUsers)) {
      return await handleBulkCreateAdmins(admin, body.adminUsers)
    }

    const { name, email, password, role, companyName } = body

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
        companyId: admin.companyId,
        companyName: companyName || null
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