import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export interface AuthUser {
  id: string
  email: string
  name: string
}

export interface AuthContractor {
  id: string
  name: string
  code: string
  companyId: string
  companyName: string
}

export interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

export interface AdminTokenPayload {
  admin: {
    id: string
    employeeId: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}

export interface AuthResult {
  isAdmin: boolean
  userId?: string
  userName?: string
  contractor?: AuthContractor
  admin?: any
}

// Helper function to authenticate and get user info
export function authenticateRequest(request: NextRequest, authType: 'contractor' | 'admin' | 'any' = 'any'): AuthResult {
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

// Simplified admin session validation for API endpoints
export async function validateAdminSession(request: NextRequest) {
  try {
    const auth = authenticateRequest(request, 'admin')
    if (!auth.isAdmin || !auth.admin?.companyId) {
      return { success: false, error: 'Admin authentication required', status: 401 }
    }
    
    return { 
      success: true, 
      admin: auth.admin,
      company: { id: auth.admin.companyId }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed', 
      status: 401 
    }
  }
}