import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// PostgreSQL error codes
const PG_UNIQUE_VIOLATION = '23505'

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) {
    throw new Error('Admin authentication required')
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token')
    }
    return { admin: decoded.admin }
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}


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

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build query conditions - filter by admin's company
    const conditions = [eq(projects.companyId, auth.admin.companyId)]
    
    // Add search filter if specified
    if (search) {
      const searchCondition = or(
        ilike(projects.name, `%${search}%`),
        ilike(projects.projectManager, `%${search}%`),
        ilike(projects.location, `%${search}%`)
      )
      if (searchCondition) {
        conditions.push(searchCondition)
      }
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(projects)
      .where(and(...conditions))
    const totalCount = Number(countResult[0].count)

    // Execute query with pagination
    const result = await db.select().from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      projects: result,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Check if this is a bulk operation
    if (Array.isArray(body.projects)) {
      // Bulk create projects
      const { projects: projectsData } = body
      
      if (!projectsData || projectsData.length === 0) {
        return NextResponse.json(
          { error: 'No projects provided' },
          { status: 400 }
        )
      }

      // Validate each project
      for (const project of projectsData) {
        if (!project.name || !project.location) {
          return NextResponse.json(
            { error: 'Missing required fields in project data: name, location' },
            { status: 400 }
          )
        }
      }

      // Get existing project names to avoid duplicates
      const existingProjects = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.companyId, auth.admin.companyId))

      const existingNames = new Set(existingProjects.map(p => p.name.toLowerCase()))

      // Filter out duplicates and prepare data
      const uniqueProjects = projectsData.filter((project: any) => 
        !existingNames.has(project.name.trim().toLowerCase())
      )

      if (uniqueProjects.length === 0) {
        return NextResponse.json(
          { error: 'All projects already exist in your company' },
          { status: 409 }
        )
      }

      // Prepare project data with projectManager from first project manager in company or default
      const preparedProjects = uniqueProjects.map((project: any) => ({
        name: project.name.trim(),
        projectManager: 'Project Manager', // Default for onboarding, can be updated later
        location: project.location.trim(),
        companyId: auth.admin.companyId,
      }))

      // Create projects
      const createdProjects = await db.insert(projects).values(preparedProjects).returning()

      return NextResponse.json({
        success: true,
        projects: createdProjects,
        created: createdProjects.length,
        skipped: projectsData.length - uniqueProjects.length
      })
    }

    // Single project creation (existing logic)
    const { name, projectManager, location } = body

    // Validate required fields
    if (!name || !projectManager || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, projectManager, location' },
        { status: 400 }
      )
    }

    // Check if project name already exists within the same company
    const existingProject = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.name, name.trim()),
          eq(projects.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingProject.length > 0) {
      return NextResponse.json(
        { error: 'Project name already exists in your company' },
        { status: 409 }
      )
    }

    // Prepare project data
    const projectData = {
      name: name.trim(),
      projectManager: projectManager.trim(),
      location: location.trim(),
      companyId: auth.admin.companyId,
    }

    // Create project record
    const project = await db.insert(projects).values(projectData).returning()

    return NextResponse.json({
      success: true,
      project: project[0]
    })

  } catch (error: any) {
    console.error('Create project error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_project_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Project name already exists in your company',
            message: 'A project with this name already exists in your company. Project names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to create project due to an unexpected error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }


    const body = await request.json()
    const { id, name, projectManager, location } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!name || !projectManager || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, projectManager, location' },
        { status: 400 }
      )
    }

    // Check if project exists and belongs to admin's company
    const existingProject = await db.select().from(projects)
      .where(and(
        eq(projects.id, id),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      projectManager: projectManager.trim(),
      location: location.trim(),
      updatedAt: new Date()
    }

    // Update project
    const updatedProject = await db.update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning()

    return NextResponse.json({
      success: true,
      project: updatedProject[0]
    })

  } catch (error: any) {
    console.error('Update project error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_project_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Project name already exists in your company',
            message: 'Another project with this name already exists in your company. Project names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to update project due to an unexpected error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }


    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Check if project exists and belongs to admin's company
    const existingProject = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingProject.length === 0) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Delete project
    await db.delete(projects)
      .where(eq(projects.id, projectId))

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}