import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { eq, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, companies } from '@/lib/db/schema'
import * as bcrypt from 'bcrypt'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email with admin or super-admin role
    const userResult = await db.select({
      user: users,
      company: companies
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(
      eq(users.email, email)
    )
    .limit(1)

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const { user: userData, company } = userResult[0]

    // Check if user has admin or super-admin role
    if (userData.role !== 'admin' && userData.role !== 'super-admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userData.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Admin user data
    const admin = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      companyId: userData.companyId,
      companyName: company?.name || 'Unknown Company'
    }

    // Generate JWT token with admin info
    const tokenPayload = {
      admin,
      isAdmin: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    const authData = {
      admin,
      token,
      isAdmin: true
    }

    const response = NextResponse.json(authData)
    
    // Set the admin auth cookie
    response.cookies.set('adminAuthToken', token, {
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}