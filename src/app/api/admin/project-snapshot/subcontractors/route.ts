import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const projectFilter = searchParams.get('project')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Build conditions for filtering
    const conditions = [
      eq(timesheets.companyId, companyId),
      eq(timesheets.status, 'approved')
    ]

    // Add project filter if provided
    if (projectFilter) {
      conditions.push(eq(timesheets.projectName, projectFilter))
    }

    // Get unique subcontractors from timesheets
    const results = await db
      .select({
        subcontractor: timesheets.company
      })
      .from(timesheets)
      .where(and(...conditions))
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