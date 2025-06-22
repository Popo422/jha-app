import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function POST(request: NextRequest) {
  try {
    const { employeeId, pin } = await request.json()

    // Validate employee ID and PIN (hardcoded for now)
    const VALID_ADMIN_CREDENTIALS = {
      employeeId: 'admin001',
      pin: '1234'
    }
    
    if (employeeId !== VALID_ADMIN_CREDENTIALS.employeeId || pin !== VALID_ADMIN_CREDENTIALS.pin) {
      return NextResponse.json(
        { error: 'Invalid employee ID or PIN' },
        { status: 401 }
      )
    }

    // Admin user data
    const admin = {
      id: 'admin_1',
      employeeId: employeeId,
      name: 'Admin User',
      role: 'admin'
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