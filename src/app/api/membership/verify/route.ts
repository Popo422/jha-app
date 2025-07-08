import { NextRequest, NextResponse } from 'next/server'
import { verifyMembershipAccess } from '@/lib/membership-helper'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
    
    if (!result.isValid || !result.hasLevel3Access) {
      return NextResponse.json({
        isValid: result.isValid,
        hasLevel3Access: result.hasLevel3Access,
        user: result.user,
        memberships: result.memberships,
        error: result.error
      })
    }

    // Check if company already exists for this WordPress user
    const wordpressUserId = result.user?.id?.toString()
    let hasExistingCompany = false
    
    if (wordpressUserId) {
      const existingCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.wordpressUserId, wordpressUserId))
        .limit(1)
      
      hasExistingCompany = existingCompany.length > 0
    }
    
    return NextResponse.json({
      isValid: result.isValid,
      hasLevel3Access: result.hasLevel3Access,
      user: result.user,
      memberships: result.memberships,
      error: result.error,
      hasExistingCompany: hasExistingCompany,
      redirectTo: hasExistingCompany ? '/admin/login' : undefined
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