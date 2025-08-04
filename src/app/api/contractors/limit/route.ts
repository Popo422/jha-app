import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, companies } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) {
    throw new Error('Admin authentication required')
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token')
    }
    return { admin: decoded.admin }
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}

interface AdminTokenPayload {
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

async function checkContractorLimit(companyId: string): Promise<{ canAdd: boolean; currentCount: number; limit: number; membershipLevel: string | null }> {
  const company = await db.select({
    membershipInfo: companies.membershipInfo
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  if (company.length === 0) {
    throw new Error('Company not found')
  }

  const membershipInfo = company[0].membershipInfo as any
  const membershipLevel = membershipInfo?.membershipLevel || '1'

  // Get current contractor count
  const contractorCountResult = await db.select({ count: count() })
    .from(contractors)
    .where(eq(contractors.companyId, companyId))

  const currentCount = contractorCountResult[0]?.count || 0
  let limit = 100 // Default limit for non-level 3 members
  if (membershipLevel === '4') {
    limit = 400
  } else if  (membershipLevel === '3') {
    limit = 200 // Limit for level 2 members
  } else if (membershipLevel === '2') {
    limit = 100
  }else if (membershipLevel === '1') {
    limit = 100
  }

  return {
    canAdd: currentCount < limit,
    currentCount,
    limit,
    membershipLevel
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const limitCheck = await checkContractorLimit(auth.admin.companyId)
    
    return NextResponse.json(limitCheck)

  } catch (error) {
    console.error('Get contractor limit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}