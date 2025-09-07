import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, subcontractors, contractors } from '@/lib/db/schema'
import { eq, and, sql, ilike, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

function authenticateAdminRequest(request: NextRequest) {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return decoded.admin
      }
    } catch (error) {
      throw new Error('Invalid admin token')
    }
  }
  throw new Error('No admin authentication token found')
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    let admin: AdminTokenPayload['admin']
    try {
      admin = authenticateAdminRequest(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Now add contractors join with proper UUID casting (following working pattern)
    const results = await db
      .select({
        subcontractor: subcontractors.name,
        foreman: subcontractors.foreman,
        totalHours: sql<number>`coalesce(sum(${timesheets.timeSpent}::numeric), 0)`,
        totalCost: sql<number>`sum(${timesheets.timeSpent}::numeric * coalesce(${contractors.rate}::numeric, 0))`,
        entriesCount: sql<number>`count(${timesheets.id})`,
        uniqueContractors: sql<number>`count(distinct ${contractors.id})`
      })
      .from(subcontractors)
      .leftJoin(timesheets, and(
        eq(subcontractors.name, timesheets.company),
        eq(timesheets.status, 'approved'),
        eq(timesheets.companyId, companyId)
      ))
      .leftJoin(contractors, eq(sql`${timesheets.userId}::uuid`, contractors.id))
      .where(and(
        eq(subcontractors.companyId, companyId),
        ...(search ? [or(
          ilike(subcontractors.name, `%${search}%`),
          ilike(subcontractors.foreman, `%${search}%`)
        )] : [])
      ))
      .groupBy(subcontractors.name, subcontractors.foreman)
      .orderBy(sql`coalesce(sum(${timesheets.timeSpent}::numeric * coalesce(${contractors.rate}::numeric, 0)), 0) desc nulls last`)
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    // Get total count for pagination
    const totalCountResult = await db
      .select({
        count: sql<number>`count(distinct ${subcontractors.name})`
      })
      .from(subcontractors)
      .where(and(
        eq(subcontractors.companyId, companyId),
        ...(search ? [or(
          ilike(subcontractors.name, `%${search}%`),
          ilike(subcontractors.foreman, `%${search}%`)
        )] : [])
      ))

    const totalCount = parseInt(totalCountResult[0]?.count.toString() || '0')
    const totalPages = Math.ceil(totalCount / pageSize)

    // Format results with proper null handling
    const formattedResults = results.map(row => ({
      subcontractor: row.subcontractor,
      foreman: row.foreman || 'N/A',
      totalHours: parseFloat((row.totalHours || 0).toString()),
      totalCost: parseFloat((row.totalCost || 0).toString()),
      uniqueContractors: parseInt((row.uniqueContractors || 0).toString()),
      entriesCount: parseInt((row.entriesCount || 0).toString()),
      avgCostPerHour: (row.totalHours && row.totalCost && row.totalHours > 0) ? parseFloat((row.totalCost || 0).toString()) / parseFloat((row.totalHours || 0).toString()) : 0
    }))

    // Calculate summary statistics
    const totalHours = formattedResults.reduce((sum, item) => sum + item.totalHours, 0)
    const totalCost = formattedResults.reduce((sum, item) => sum + item.totalCost, 0)
    const totalSubcontractors = formattedResults.length
    const avgCostPerSubcontractor = totalSubcontractors > 0 ? totalCost / totalSubcontractors : 0
    const topSubcontractor = formattedResults.length > 0 ? formattedResults[0] : null

    return NextResponse.json({
      allSubcontractors: formattedResults,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalSubcontractors,
        avgCostPerSubcontractor: Math.round(avgCostPerSubcontractor * 100) / 100,
        avgCostPerHour: totalHours > 0 ? Math.round((totalCost / totalHours) * 100) / 100 : 0,
        topSubcontractor: topSubcontractor ? {
          name: topSubcontractor.subcontractor,
          hours: topSubcontractor.totalHours,
          cost: topSubcontractor.totalCost
        } : null
      },
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching all subcontractors data:', error)
    return NextResponse.json({ error: 'Failed to fetch subcontractors data' }, { status: 500 })
  }
}