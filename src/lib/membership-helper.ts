import jwt from 'jsonwebtoken'

export interface MembershipData {
  id: string
  user_id: string
  level_id: string
  start_time: string
  update_time: string
  expire_time: string
  notification: string
  status: string
  label: string
  level_slug: string
  badge_image_url: string
  is_expired: boolean
}

export interface UserData {
  id: number
  email: string
  name: string
}

export interface JWTPayload {
  iss: string
  iat: number
  exp: number
  data: {
    user: UserData
    membership: MembershipData[]
  }
}
export enum MembershipLevel {
  Free = 'free',
  Level1 = 'level1',
  Level2 = 'level2',
  Level3 = 'level3',
}

export interface MembershipVerificationResult {
  isValid: boolean
  hasLevel3Access: boolean
  user?: UserData
  memberships?: MembershipData[]
  error?: string
}

/**
 * Extracts access token from cookies
 */
export function getAccessTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const accessTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('access_token=')
  )
  
  if (!accessTokenCookie) return null
  
  return accessTokenCookie.split('=')[1]
}

/**
 * Verifies JWT token and extracts membership data
 */
export function verifyJWTToken(token: string, secretKey: string): JWTPayload | null {
  try {
    console.log("test",token, secretKey)
    const decoded = jwt.verify(token, secretKey) as JWTPayload
    return decoded
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

/**
 * Checks if user has membership level 3 access
 */
export function hasLevel3Membership(memberships: MembershipData[]): boolean {
  if (!memberships || memberships.length === 0) return false
  
  return memberships.some(membership => {
    // Check if membership is active and has level 3 or higher
    const levelId = parseInt(membership.level_id)
    const isActive = membership.status === '1'
    const isNotExpired = !membership.is_expired && new Date(membership.expire_time) > new Date()
    
    return levelId >= 3 && isActive && isNotExpired
  })
}

/**
 * Main function to verify membership access for onboarding
 */
export function verifyMembershipAccess(secretKey: string, token?: string): MembershipVerificationResult {
  try {
    // Get access token from cookies or use provided token
    const accessToken = token || getAccessTokenFromCookies()
    
    if (!accessToken) {
      return {
        isValid: false,
        hasLevel3Access: false,
        error: 'No access token found'
      }
    }
    
    // Verify and decode JWT
    const payload = verifyJWTToken(accessToken, secretKey)
    
    if (!payload) {
      return {
        isValid: false,
        hasLevel3Access: false,
        error: 'Invalid or expired token'
      }
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return {
        isValid: false,
        hasLevel3Access: false,
        error: 'Token expired'
      }
    }
    
    // Check membership level
    const hasAccess = hasLevel3Membership(payload.data.membership)
    
    return {
      isValid: true,
      hasLevel3Access: hasAccess,
      user: payload.data.user,
      memberships: payload.data.membership
    }
    
  } catch (error) {
    console.error('Membership verification error:', error)
    return {
      isValid: false,
      hasLevel3Access: false,
      error: 'Verification failed'
    }
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshTokenFromCookies()
    
    if (!refreshToken) {
      return false
    }
    
    const response = await fetch('https://field-safe.com/wp-json/jwt-auth/v1/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    })
    
    if (response.ok) {
      // New access token should be set in cookies automatically
      return true
    }
    
    return false
  } catch (error) {
    console.error('Token refresh failed:', error)
    return false
  }
}

/**
 * Gets refresh token from cookies
 */
function getRefreshTokenFromCookies(): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const refreshTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('refresh_token=')
  )
  
  if (!refreshTokenCookie) return null
  
  return refreshTokenCookie.split('=')[1]
}