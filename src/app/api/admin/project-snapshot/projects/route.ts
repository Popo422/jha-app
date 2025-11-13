import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, projects, subcontractors, subcontractorProjects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const subcontractor = searchParams.get('subcontractor')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // Use junction table to get projects related to subcontractors
    let query = db
      .select({
        name: projects.name,
        location: projects.location
      })
      .from(projects)
      .where(eq(projects.companyId, companyId))

    // If subcontractor filter is specified, only get projects assigned to that subcontractor
    if (subcontractor) {
      query = db
        .select({
          name: projects.name,
          location: projects.location
        })
        .from(projects)
        .innerJoin(subcontractorProjects, eq(projects.id, subcontractorProjects.projectId))
        .innerJoin(subcontractors, eq(subcontractorProjects.subcontractorId, subcontractors.id))
        .where(and(
          eq(projects.companyId, companyId),
          eq(subcontractors.name, subcontractor)
        ))
    }

    const results = await query

    const projectsWithLocation = results
      .filter(row => row.name && row.name.trim() !== '')
      .map(row => ({
        name: row.name,
        location: row.location || ''
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(projectsWithLocation)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}