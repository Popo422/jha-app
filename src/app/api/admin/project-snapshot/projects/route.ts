import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets } from '@/lib/db/schema'
import { eq, and, like } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const subcontractorFilter = searchParams.get('subcontractor')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Build conditions for filtering
    const conditions = [
      eq(timesheets.companyId, companyId),
      eq(timesheets.status, 'approved')
    ]

    // Add subcontractor filter if provided
    if (subcontractorFilter) {
      conditions.push(like(timesheets.company, `%${subcontractorFilter}%`))
    }

    // Get unique projects from timesheets
    const results = await db
      .select({
        project: timesheets.projectName
      })
      .from(timesheets)
      .where(and(...conditions))
      .groupBy(timesheets.projectName)
      .orderBy(timesheets.projectName)

    const uniqueProjects = results
      .map(row => row.project)
      .filter(name => name && name.trim() !== '')
      .sort()

    return NextResponse.json(uniqueProjects)
  } catch (error) {
    console.error('Error fetching unique projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}