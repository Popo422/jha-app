import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { toolboxTalks } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate and get user info
function authenticateRequest(request: NextRequest, authType: 'contractor' | 'admin' | 'any' = 'any'): { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any } {
  if (authType === 'contractor') {
    // Only try contractor token
    const userToken = request.cookies.get('authToken')?.value || 
                     (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                      request.headers.get('Authorization')?.replace('Bearer ', '') : null)

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
        return { 
          isAdmin: false, 
          userId: decoded.user.id, 
          userName: decoded.user.name,
          contractor: decoded.contractor 
        }
      } catch (error) {
        throw new Error('Invalid contractor token')
      }
    }
    throw new Error('No contractor authentication token found')
  }

  if (authType === 'admin') {
    // Only try admin token
    const adminToken = request.cookies.get('adminAuthToken')?.value || 
                      (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                       request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
    
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
        if (decoded.admin && decoded.isAdmin) {
          return { isAdmin: true, admin: decoded.admin }
        }
      } catch (error) {
        throw new Error('Invalid admin token')
      }
    }
    throw new Error('No admin authentication token found')
  }

  // Default behavior - try admin token first, then user token
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return { isAdmin: true, admin: decoded.admin }
      }
    } catch (error) {
      // Continue to try user token
    }
  }

  // Try user token
  const userToken = request.cookies.get('authToken')?.value || 
                   (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                    request.headers.get('Authorization')?.replace('Bearer ', '') : null)

  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
      return { 
        isAdmin: false, 
        userId: decoded.user.id, 
        userName: decoded.user.name,
        contractor: decoded.contractor 
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  throw new Error('No valid authentication token found')
}

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
  companyId: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

interface AdminTokenPayload {
  admin: {
    id: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}

// GET - Fetch published toolbox talks for contractors
export async function GET(request: NextRequest) {
  try {
    // Only contractors can access this endpoint
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'contractor')
    } catch (error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const companyId = auth.contractor?.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get published toolbox talks for the user's company
    const talks = await db.select().from(toolboxTalks).where(
      and(
        eq(toolboxTalks.companyId, companyId),
        eq(toolboxTalks.status, 'published')
      )
    ).orderBy(desc(toolboxTalks.publishedAt))

    return NextResponse.json({ toolboxTalks: talks })

  } catch (error) {
    console.error('Get toolbox talks error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch toolbox talks' 
    }, { status: 500 })
  }
}