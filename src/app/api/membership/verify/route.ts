import { NextRequest, NextResponse } from 'next/server'
import { verifyMembershipAccess } from '@/lib/membership-helper'

const JWT_SECRET = process.env.WORDPRESS_JWT_SECRET || 'your-wordpress-jwt-secret-here'

export async function GET(request: NextRequest) {
  try {
    console.log("JWT_SECRET", JWT_SECRET)
    // Get access token from request cookies
    const accessToken = request.cookies.get('access_token')?.value
    
    if (!accessToken) {
      return NextResponse.json({
        isValid: false,
        hasLevel3Access: false,
        error: 'No access token found'
      }, { status: 401 })
    }
    
    // Verify membership using the helper function
    const result = verifyMembershipAccess(JWT_SECRET, accessToken)
    
    return NextResponse.json({
      isValid: result.isValid,
      hasLevel3Access: result.hasLevel3Access,
      user: result.user,
      memberships: result.memberships,
      error: result.error
    })
    
  } catch (error) {
    console.error('Membership verification API error:', error)
    return NextResponse.json({
      isValid: false,
      hasLevel3Access: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}