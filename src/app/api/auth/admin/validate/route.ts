import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import { AdminJWTPayload } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJWTPayload

    // Check if token contains admin data with all required fields
    if (!decoded.admin || !decoded.isAdmin || 
        !decoded.admin.email || !decoded.admin.companyName) {
      return NextResponse.json(
        { error: 'Invalid or incomplete admin token' },
        { status: 401 }
      )
    }

    // Return admin data
    return NextResponse.json({
      admin: decoded.admin,
      isAdmin: decoded.isAdmin,
      token: token
    })
  } catch (error) {
    console.error('Admin token validation error:', error)
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }
}