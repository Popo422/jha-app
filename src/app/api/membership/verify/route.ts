import { NextRequest, NextResponse } from 'next/server'
import { verifyMembershipAccess } from '@/lib/membership-helper'
import { db } from '@/lib/db'
import { companies, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import * as jwt from 'jsonwebtoken'

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
    let authData = null
    
    if (wordpressUserId) {
      const existingCompany = await db
        .select()
        .from(companies)
        .where(eq(companies.wordpressUserId, wordpressUserId))
        .limit(1)
      
      hasExistingCompany = existingCompany.length > 0
      
      // If company exists and has a super admin, generate auto-login
      if (hasExistingCompany && existingCompany[0].createdBy) {
        const superAdmin = await db
          .select()
          .from(users)
          .where(eq(users.id, existingCompany[0].createdBy))
          .limit(1)
        
        if (superAdmin.length > 0) {
          // Generate JWT token for auto-login
          const AUTH_JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'
          
          const admin = {
            id: superAdmin[0].id,
            email: superAdmin[0].email,
            name: superAdmin[0].name,
            role: superAdmin[0].role,
            companyId: superAdmin[0].companyId,
            companyName: existingCompany[0].name,
            companyLogoUrl: existingCompany[0].logoUrl || null
          }

          const tokenPayload = {
            admin,
            isAdmin: true,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
          }

          const token = jwt.sign(tokenPayload, AUTH_JWT_SECRET)

          authData = {
            admin,
            token,
            isAdmin: true
          }
        }
      }
    }
    
    const response = NextResponse.json({
      isValid: result.isValid,
      hasLevel3Access: result.hasLevel3Access,
      user: result.user,
      memberships: result.memberships,
      error: result.error,
      hasExistingCompany: hasExistingCompany,
      autoLogin: hasExistingCompany && authData !== null,
      authData: authData,
      redirectTo: hasExistingCompany && !authData ? '/admin/login' : undefined
    })

    // Set admin auth cookie if we have auth data
    if (authData) {
      response.cookies.set('adminAuthToken', authData.token, {
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    }

    return response
    
  } catch (error) {
    console.error('Membership verification API error:', error)
    return NextResponse.json({
      isValid: false,
      hasLevel3Access: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}