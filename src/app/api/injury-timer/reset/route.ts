import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { companies } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to get company ID and user info from auth
function getAuthFromRequest(request: NextRequest): { companyId: string; resetBy: string } | null {
  // Try admin token first
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as any
      if (decoded.admin?.companyId) {
        return {
          companyId: decoded.admin.companyId,
          resetBy: `Admin: ${decoded.admin.name}`
        }
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
      if (decoded.contractor?.companyId && decoded.user?.name) {
        return {
          companyId: decoded.contractor.companyId,
          resetBy: `Contractor: ${decoded.user.name}`
        }
      }
    } catch (error) {
      // Token invalid
    }
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request)
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const [updatedCompany] = await db
      .update(companies)
      .set({
        injuryTimerLastReset: new Date(),
        injuryTimerResetBy: auth.resetBy,
        updatedAt: new Date()
      })
      .where(eq(companies.id, auth.companyId))
      .returning()

    return NextResponse.json({
      lastResetTime: updatedCompany.injuryTimerLastReset!.toISOString(),
      message: 'Timer reset successfully',
    })
  } catch (error) {
    console.error('Error resetting injury timer:', error)
    return NextResponse.json(
      { error: 'Failed to reset injury timer' },
      { status: 500 }
    )
  }
}