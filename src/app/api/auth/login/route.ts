import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, companies } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function POST(request: NextRequest) {
  try {
    const { contractorCode, rememberMe } = await request.json()

    if (!contractorCode) {
      return NextResponse.json(
        { error: 'Contractor code is required' },
        { status: 400 }
      )
    }

    // Find contractor by code
    const contractorResult = await db.select({
      contractor: contractors,
      company: companies
    })
    .from(contractors)
    .leftJoin(companies, eq(contractors.companyId, companies.id))
    .where(eq(contractors.code, contractorCode.toUpperCase()))
    .limit(1)

    if (contractorResult.length === 0) {
      return NextResponse.json(
        { error: 'Invalid contractor code' },
        { status: 401 }
      )
    }

    const { contractor: contractorData, company } = contractorResult[0]

    // Create user object from contractor data
    const user = {
      id: contractorData.id,
      email: contractorData.email,
      name: `${contractorData.firstName} ${contractorData.lastName}`,
      companyId: contractorData.companyId
    }

    const contractor = {
      id: contractorData.id,
      name: `${contractorData.firstName} ${contractorData.lastName}`,
      companyName: contractorData.companyName || company?.name || 'Unknown Company',
      code: contractorData.code,
      companyId: contractorData.companyId,
      companyLogoUrl: company?.logoUrl || null,
      language: contractorData.language || 'en',
      type: contractorData.type || 'contractor',
      isForeman: (contractorData.type === 'foreman')
    }

    // Generate JWT token with user and contractor info
    const expirationHours = rememberMe ? 30 * 24 : 24 // 30 days or 24 hours
    const tokenPayload = {
      user,
      contractor,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (expirationHours * 60 * 60)
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
      maxAge: expirationHours * 60 * 60, // Match token expiration
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