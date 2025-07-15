import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate contractor requests
function authenticateContractor(request: NextRequest): { user: any } {
  const token = request.cookies.get('authToken')?.value || 
                (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                 request.headers.get('Authorization')?.replace('Bearer ', '') : null)
  
  if (!token) {
    throw new Error('Authentication required')
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    if (!decoded.user) {
      throw new Error('Invalid token')
    }
    return { user: decoded.user }
  } catch (error) {
    throw new Error('Invalid token')
  }
}

interface TokenPayload {
  user: {
    id: string
    email: string
    name: string
    companyId: string
  }
  iat: number
  exp: number
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate contractor
    let auth: { user: any }
    try {
      auth = authenticateContractor(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get company's enabled modules
    const company = await db.select().from(companies)
      .where(eq(companies.id, auth.user.companyId))
      .limit(1)

    if (company.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' + JSON.stringify(auth.user) },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      enabledModules: company[0].enabledModules || ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'timesheet']
    })

  } catch (error) {
    console.error('Get company modules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}