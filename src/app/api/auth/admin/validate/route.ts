import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Check if token contains admin data
    if (!decoded.admin || !decoded.isAdmin) {
      return NextResponse.json(
        { error: 'Invalid admin token' },
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