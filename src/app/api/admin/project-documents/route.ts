import { NextRequest, NextResponse } from 'next/server'
import { eq, and, desc, ilike, or, sql, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projectDocuments, projects } from '@/lib/db/schema'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Verify project belongs to company
    const project = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build where conditions
    const conditions = [
      eq(projectDocuments.projectId, projectId),
      eq(projectDocuments.companyId, auth.admin.companyId)
    ]

    if (search) {
      conditions.push(
        or(
          ilike(projectDocuments.name, `%${search}%`),
          ilike(projectDocuments.uploadedByName, `%${search}%`),
          ilike(projectDocuments.description, `%${search}%`)
        )!
      )
    }

    if (category && category !== 'All Categories') {
      conditions.push(eq(projectDocuments.category, category))
    }


    // Get total count
    const totalCount = await db
      .select({ count: count() })
      .from(projectDocuments)
      .where(and(...conditions))

    // Get paginated results
    const documents = await db
      .select()
      .from(projectDocuments)
      .where(and(...conditions))
      .orderBy(desc(projectDocuments.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    const totalPages = Math.ceil(totalCount[0].count / pageSize)

    return NextResponse.json({
      documents,
      pagination: {
        page,
        pageSize,
        total: totalCount[0].count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching project documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { 
      projectId, 
      name, 
      description,
      category, 
      fileType, 
      fileSize, 
      url,
      blobKey
    } = body

    if (!projectId || !name || !fileType || !fileSize || !url || !blobKey) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, name, fileType, fileSize, url, blobKey' 
      }, { status: 400 })
    }

    // Verify project belongs to company
    const project = await db.select()
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create document record
    const document = await db.insert(projectDocuments).values({
      projectId,
      name,
      description,
      category: category || 'Other',
      fileType,
      fileSize,
      url,
      blobKey,
      companyId: auth.admin.companyId,
      uploadedBy: auth.admin.id,
      uploadedByName: auth.admin.name
    }).returning()

    return NextResponse.json({
      success: true,
      document: document[0]
    })

  } catch (error) {
    console.error('Error creating project document:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json({ 
        error: 'A document with this name already exists in this project' 
      }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}