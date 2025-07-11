import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to get company ID from auth
function getCompanyIdFromAuth(request: NextRequest): string | null {
  // Try admin token first
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as any
      if (decoded.admin?.companyId) {
        return decoded.admin.companyId
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
      const decoded = jwt.verify(userToken, JWT_SECRET) as any
      if (decoded.contractor?.companyId) {
        return decoded.contractor.companyId
      }
    } catch (error) {
      // Token invalid
    }
  }

  return null
}

export async function GET(request: NextRequest) {
  try {
    const companyId = getCompanyIdFromAuth(request)
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1)

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      )
    }

    // If no timer has been set, initialize it
    if (!company.injuryTimerLastReset) {
      const [updatedCompany] = await db
        .update(companies)
        .set({
          injuryTimerLastReset: new Date(),
          updatedAt: new Date()
        })
        .where(eq(companies.id, companyId))
        .returning()

      return NextResponse.json({
        lastResetTime: updatedCompany.injuryTimerLastReset!.toISOString(),
      })
    }

    return NextResponse.json({
      lastResetTime: company.injuryTimerLastReset.toISOString(),
    })
  } catch (error) {
    console.error('Error fetching injury timer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch injury timer' },
      { status: 500 }
    )
  }
}