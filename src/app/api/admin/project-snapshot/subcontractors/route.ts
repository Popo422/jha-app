import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Get unique subcontractors from approved timesheets that exist in projects table
    const results = await db
      .select({
        subcontractor: timesheets.company
      })
      .from(timesheets)
      .innerJoin(projects, and(
        eq(timesheets.projectName, projects.name),
        eq(projects.companyId, companyId)
      ))
      .where(and(
        eq(timesheets.companyId, companyId),
        eq(timesheets.status, 'approved')
      ))
      .groupBy(timesheets.company)
      .orderBy(timesheets.company)

    const uniqueSubcontractors = results
      .map(row => row.subcontractor)
      .filter(name => name && name.trim() !== '')
      .sort()

    return NextResponse.json(uniqueSubcontractors)
  } catch (error) {
    console.error('Error fetching unique subcontractors:', error)
    return NextResponse.json({ error: 'Failed to fetch subcontractors' }, { status: 500 })
  }
}