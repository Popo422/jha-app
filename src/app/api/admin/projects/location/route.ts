import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    const authResult = await validateAdminSession(request)
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const projectName = searchParams.get('projectName')

    if (!projectName) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      )
    }

    // Query for the project location within the admin's company
    const project = await db
      .select({
        id: projects.id,
        name: projects.name,
        location: projects.location,
        projectManager: projects.projectManager
      })
      .from(projects)
      .where(
        and(
          eq(projects.name, projectName.trim()),
          eq(projects.companyId, authResult.admin.companyId)
        )
      )
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project[0].id,
        name: project[0].name,
        location: project[0].location,
        projectManager: project[0].projectManager
      }
    })

  } catch (error) {
    console.error('Get project location error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}