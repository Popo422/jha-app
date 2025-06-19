import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { addSSEClient, removeSSEClient } from '@/lib/sse-service'

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

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return new Response('Authentication required', { status: 401 })
    }

    // Verify JWT token
    let decoded: TokenPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return new Response('Invalid token', { status: 401 })
    }

    const userId = decoded.user.id
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      start(controller) {
        // Store client connection using the shared service
        addSSEClient(userId, controller, encoder)

        // Send initial connection message
        const data = JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString()
        })
        controller.enqueue(encoder.encode(`data: ${data}\n\n`))

        // Send keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`data: {"type":"ping","timestamp":"${new Date().toISOString()}"}\n\n`))
          } catch (error) {
            console.error(`Keep-alive error for user ${userId}:`, error)
            clearInterval(keepAlive)
            removeSSEClient(userId)
          }
        }, 30000)

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          console.log(`SSE client disconnected: ${userId}`)
          clearInterval(keepAlive)
          removeSSEClient(userId)
        })
      },
      cancel() {
        console.log(`SSE client cancelled: ${userId}`)
        removeSSEClient(userId)
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    })

  } catch (error) {
    console.error('SSE connection error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

