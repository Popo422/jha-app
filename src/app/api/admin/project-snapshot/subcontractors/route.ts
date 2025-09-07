import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, projects, subcontractors, subcontractorProjects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const project = searchParams.get('project')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Use junction table to get subcontractors related to projects
    let query = db
      .select({
        name: subcontractors.name
      })
      .from(subcontractors)
      .where(eq(subcontractors.companyId, companyId))

    // If project filter is specified, only get subcontractors assigned to that project
    if (project) {
      query = db
        .select({
          name: subcontractors.name
        })
        .from(subcontractors)
        .innerJoin(subcontractorProjects, eq(subcontractors.id, subcontractorProjects.subcontractorId))
        .innerJoin(projects, eq(subcontractorProjects.projectId, projects.id))
        .where(and(
          eq(subcontractors.companyId, companyId),
          eq(projects.name, project)
        ))
    }

    const results = await query

    const subcontractorNames = results
      .map(row => row.name)
      .filter(name => name && name.trim() !== '')
      .sort()

    return NextResponse.json(subcontractorNames)
  } catch (error) {
    console.error('Error fetching subcontractors:', error)
    return NextResponse.json({ error: 'Failed to fetch subcontractors' }, { status: 500 })
  }
}