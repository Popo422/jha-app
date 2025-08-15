import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subcontractors } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

interface TokenPayload {
  user: {
    id: string
    email: string
    name: string
    companyId: string
  }
  contractor: {
    id: string
    name: string
    companyName: string
    code: string
    companyId: string
    companyLogoUrl: string
    language: string
  }
  iat: number
  exp: number
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate contractor
    const token = request.cookies.get('authToken')?.value || 
                  (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                   request.headers.get('Authorization')?.replace('Bearer ', '') : null)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    let decoded: TokenPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
      if (!decoded.contractor) {
        throw new Error('Invalid token - contractor info missing')
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Find subcontractor by company name within the contractor's company
    // If contractor.companyName doesn't match any subcontractor, use default modules
    let enabledModules = ['start-of-day', 'end-of-day', 'job-hazard-analysis', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection', 'timesheet']
    
    const subcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.name, decoded.contractor.companyName),
        eq(subcontractors.companyId, decoded.contractor.companyId)
      ))
      .limit(1)

    if (subcontractor.length > 0) {
      enabledModules = subcontractor[0].enabledModules || enabledModules
    }

    return NextResponse.json({
      success: true,
      enabledModules: enabledModules
    })

  } catch (error) {
    console.error('Get subcontractor modules error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}