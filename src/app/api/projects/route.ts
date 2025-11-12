import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike, sql, count, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects, companies, subcontractors, subcontractorProjects, projectDocuments } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth-utils'
import { del } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// PostgreSQL error codes
const PG_UNIQUE_VIOLATION = '23505'

// Helper function to authenticate admin requests (legacy - keeping for backwards compatibility)
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

async function checkProjectLimit(companyId: string, additionalCount: number): Promise<{ canAdd: boolean; currentCount: number; limit: number; membershipLevel: string | null }> {
  const company = await db.select({
    membershipInfo: companies.membershipInfo
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  if (company.length === 0) {
    throw new Error('Company not found')
  }

  const membershipInfo = company[0].membershipInfo as any
  const membershipLevel = membershipInfo?.membershipLevel || '1'

  // Get current project count
  const projectCountResult = await db.select({ count: count() })
    .from(projects)
    .where(eq(projects.companyId, companyId))

  const currentCount = projectCountResult[0]?.count || 0
  let limit = 5 // Default limit
  
  if (membershipLevel === '4') {
    limit = 50
  } else if (membershipLevel === '3') {
    limit = 25
  } else if (membershipLevel === '2') {
    limit = 10
  } else if (membershipLevel === '1') {
    limit = 5
  }

  return {
    canAdd: (currentCount + additionalCount) <= limit,
    currentCount,
    limit,
    membershipLevel
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin') || 'contractor'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: any; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const companyId = auth.isAdmin ? auth.admin.companyId : auth.contractor?.companyId
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get remaining query parameters for pagination and filtering
    const search = searchParams.get('search')
    const projectManager = searchParams.get('projectManager')
    const location = searchParams.get('location')
    const subcontractorName = searchParams.get('subcontractorName')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build query conditions - filter by user's company
    const conditions = [eq(projects.companyId, companyId)]
    
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

    // Add project manager filter if specified
    if (projectManager && projectManager !== 'all') {
      conditions.push(eq(projects.projectManager, projectManager))
    }

    // Add location filter if specified
    if (location && location !== 'all') {
      conditions.push(eq(projects.location, location))
    }

    // Add subcontractor filter if specified
    if (subcontractorName) {
      // Filter by subcontractor name using junction table
      const subcontractorCondition = sql`EXISTS (
        SELECT 1 FROM ${subcontractorProjects} sp
        JOIN ${subcontractors} s ON sp.subcontractor_id = s.id
        WHERE sp.project_id = ${projects.id} 
        AND s.name = ${subcontractorName}
      )`;
      conditions.push(subcontractorCondition);
    }

    // Add date filters if specified
    if (dateFrom) {
      conditions.push(gte(projects.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      // Add one day to dateTo to include the entire day
      const dateToEnd = new Date(dateTo)
      dateToEnd.setDate(dateToEnd.getDate() + 1)
      conditions.push(lte(projects.createdAt, dateToEnd))
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(projects)
      .where(and(...conditions))
    const totalCount = Number(countResult[0].count)

    // Execute query with pagination and subcontractor count
    const result = await db.select({
      id: projects.id,
      name: projects.name,
      projectManager: projects.projectManager,
      location: projects.location,
      companyId: projects.companyId,
      projectCost: projects.projectCost,
      startDate: projects.startDate,
      endDate: projects.endDate,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      subcontractorCount: sql<number>`(
        SELECT COALESCE(COUNT(*), 0) FROM subcontractor_projects
        WHERE subcontractor_projects.project_id = projects.id
      )`
    }).from(projects)
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

      // Check project limit
      const limitCheck = await checkProjectLimit(auth.admin.companyId, projectsData.length)
      if (!limitCheck.canAdd) {
        return NextResponse.json(
          { 
            error: 'Project limit exceeded',
            message: `Adding ${projectsData.length} projects would exceed your limit of ${limitCheck.limit}. Current count: ${limitCheck.currentCount}`,
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
            membershipLevel: limitCheck.membershipLevel
          },
          { status: 403 }
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
      const preparedProjects = uniqueProjects.map((project: any) => {
        return {
          name: project.name.trim(),
          projectManager: 'Project Manager', // Default for onboarding, can be updated later
          location: project.location.trim(),
          companyId: auth.admin.companyId,
          projectCost: project.projectCost ? project.projectCost.toString() : null,
          startDate: project.startDate || null,
          endDate: project.endDate || null,
        }
      })

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
    const { name, projectManager, location, projectCost, startDate, endDate, projectCode, contractId } = body

    // Validate required fields
    if (!name || !projectManager || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, projectManager, location' },
        { status: 400 }
      )
    }

    // Check project limit
    const limitCheck = await checkProjectLimit(auth.admin.companyId, 1)
    if (!limitCheck.canAdd) {
      return NextResponse.json(
        { 
          error: 'Project limit exceeded',
          message: `You have reached your project limit of ${limitCheck.limit}. Current count: ${limitCheck.currentCount}`,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          membershipLevel: limitCheck.membershipLevel
        },
        { status: 403 }
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
      projectCost: projectCost ? projectCost.toString() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      projectCode: projectCode ? projectCode.trim() : null,
      contractId: contractId ? contractId.trim() : null,
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
    const { id, name, projectManager, location, projectCost, startDate, endDate, projectCode, contractId } = body

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
      projectCost: projectCost ? projectCost.toString() : null,
      startDate: startDate || null,
      endDate: endDate || null,
      projectCode: projectCode ? projectCode.trim() : null,
      contractId: contractId ? contractId.trim() : null,
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

    // Get all project documents to clean up Vercel Blob storage
    const documents = await db.select({
      blobKey: projectDocuments.blobKey,
      url: projectDocuments.url
    }).from(projectDocuments)
      .where(eq(projectDocuments.projectId, projectId))

    // Delete files from Vercel Blob storage
    const blobDeletionPromises = documents.map(async (doc) => {
      try {
        await del(doc.url)
        console.log(`Successfully deleted blob: ${doc.blobKey}`)
      } catch (error) {
        console.error(`Failed to delete blob ${doc.blobKey}:`, error)
        // Continue with deletion even if blob cleanup fails
      }
    })

    // Wait for all blob deletions to complete (but don't fail if some fail)
    await Promise.allSettled(blobDeletionPromises)

    // Delete project (this will cascade delete all related records including project_documents)
    await db.delete(projects)
      .where(eq(projects.id, projectId))

    return NextResponse.json({
      success: true,
      message: 'Project and all associated files deleted successfully'
    })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}