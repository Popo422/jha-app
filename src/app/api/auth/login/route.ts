import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function POST(request: NextRequest) {
  try {
    const { companyCode } = await request.json()

    // Validate company code
    const VALID_CODE = 'Zerni17'
    
    if (companyCode !== VALID_CODE) {
      return NextResponse.json(
        { error: 'Invalid company code' },
        { status: 401 }
      )
    }

    // Hardcoded user and contractor data (as requested)
    const user = {
      id: '1',
      email: 'contractor@zerni.com',
      name: 'John Contractor'
    }

    const contractor = {
      id: 'contractor_1',
      name: 'Zerni Construction',
      code: companyCode
    }

    // Generate JWT token with user and contractor info
    const tokenPayload = {
      user,
      contractor,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    const authData = {
      user,
      contractor,
      token
    }

    const response = NextResponse.json(authData)
    
    // Set the cookie on the server side
    response.cookies.set('authToken', token, {
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
      httpOnly: false, // Allow client-side access for debugging
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}