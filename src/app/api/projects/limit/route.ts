import { NextRequest, NextResponse } from 'next/server'
import { eq, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, companies } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth-utils'

async function checkProjectLimit(companyId: string): Promise<{
  canAdd: boolean; 
  currentCount: number; 
  limit: number; 
  membershipLevel: string | null 
}> {
  const company = await db.select({
    membershipInfo: companies.membershipInfo
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  if (company.length === 0) {
    throw new Error('Company not found')
  }

  const membershipInfo = company[0].membershipInfo as any
  const membershipLevel = membershipInfo?.membershipLevel || '1'

  // Get current project count
  const projectCountResult = await db.select({ count: count() })
    .from(projects)
    .where(eq(projects.companyId, companyId))

  const currentCount = projectCountResult[0]?.count || 0
  let limit = 5 // Default limit

  if (membershipLevel === '4') {
    limit = 50
  } else if (membershipLevel === '3') {
    limit = 25
  } else if (membershipLevel === '2') {
    limit = 10
  } else if (membershipLevel === '1') {
    limit = 5
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
    // Authenticate request - allow both contractors and admins
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: any; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const companyId = auth.isAdmin ? auth.admin.companyId : auth.contractor?.companyId
    
    if (!companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const limitData = await checkProjectLimit(companyId)
    
    return NextResponse.json(limitData)
  } catch (error) {
    console.error('Error checking project limit:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}