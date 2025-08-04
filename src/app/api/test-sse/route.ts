import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sendEventToUser, getConnectedClients, getClientCount } from '@/lib/sse-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: TokenPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Send test SSE event
    console.log('Sending test SSE event to user:', decoded.user.id)
    console.log('Connected clients:', getConnectedClients())
    console.log('Total client count:', getClientCount())
    
    const sent = sendEventToUser(decoded.user.id, 'test_event', {
      message: 'This is a test SSE event',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'Test SSE event sent',
      userId: decoded.user.id,
      eventSent: sent,
      connectedClients: getConnectedClients(),
      clientCount: getClientCount()
    })

  } catch (error) {
    console.error('Test SSE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}