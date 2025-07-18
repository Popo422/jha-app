import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, projects, contractors, subcontractors } from '@/lib/db/schema'
import { eq, and, or, like, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectFilter = searchParams.get('project')
    const subcontractorFilter = searchParams.get('subcontractor')
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Build the WHERE conditions
    const whereConditions = [
      eq(timesheets.companyId, companyId),
      eq(timesheets.status, 'approved')
    ]

    // Add filters to WHERE clause
    if (projectFilter) {
      whereConditions.push(eq(timesheets.projectName, projectFilter))
    }
    
    if (subcontractorFilter) {
      whereConditions.push(like(timesheets.company, `%${subcontractorFilter}%`))
    }

    // Execute the query with all filters in WHERE clause
    const results = await db
      .select({
        projectName: timesheets.projectName,
        projectManager: projects.projectManager,
        contractorCount: sql<number>`COUNT(DISTINCT ${timesheets.userId})`.as('contractorCount'),
        totalSpend: sql<number>`SUM(${timesheets.timeSpent}::numeric * COALESCE(${contractors.rate}::numeric, 0))`.as('totalSpend'),
        subcontractorCount: sql<number>`COUNT(DISTINCT ${timesheets.company})`.as('subcontractorCount')
      })
      .from(timesheets)
      .leftJoin(projects, and(
        eq(timesheets.projectName, projects.name),
        eq(projects.companyId, companyId)
      ))
      .leftJoin(contractors, and(
        eq(sql`${timesheets.userId}::uuid`, contractors.id),
        eq(contractors.companyId, companyId)
      ))
      .where(and(...whereConditions))
      .groupBy(timesheets.projectName, projects.projectManager)

    // Format the results
    const formattedResults = results.map(row => ({
      projectId: row.projectName, // Use project name as unique ID
      projectName: row.projectName,
      projectManager: row.projectManager || '', // Empty string if not in projects table
      contractorCount: Number(row.contractorCount) || 0,
      totalSpend: Number(row.totalSpend) || 0,
      subcontractorCount: Number(row.subcontractorCount) || 0 // Count of unique subcontractors
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error('Error fetching project snapshot:', error)
    return NextResponse.json({ error: 'Failed to fetch project snapshot data' }, { status: 500 })
  }
}