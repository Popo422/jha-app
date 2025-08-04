import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get unique projects from approved timesheets
    const results = await db
      .select({
        project: timesheets.projectName
      })
      .from(timesheets)
      .where(and(
        eq(timesheets.companyId, companyId),
        eq(timesheets.status, 'approved')
      ))
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