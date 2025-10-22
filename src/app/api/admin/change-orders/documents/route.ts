import { NextRequest, NextResponse } from 'next/server'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { changeOrderDocuments } from '@/lib/db/schema'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const changeOrderId = searchParams.get('changeOrderId')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    if (!changeOrderId) {
      return NextResponse.json({ error: 'Change Order ID is required' }, { status: 400 })
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Build where conditions
    let whereConditions = [
      eq(changeOrderDocuments.changeOrderId, changeOrderId),
      eq(changeOrderDocuments.companyId, companyId)
    ]

    // Add search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(changeOrderDocuments.name, `%${search}%`),
          ilike(changeOrderDocuments.uploadedByName, `%${search}%`),
          ilike(changeOrderDocuments.description, `%${search}%`)
        )!
      )
    }

    // Add category filter
    if (category) {
      whereConditions.push(eq(changeOrderDocuments.category, category))
    }

    // Get total count
    const totalResult = await db
      .select({ count: changeOrderDocuments.id })
      .from(changeOrderDocuments)
      .where(and(...whereConditions))

    const total = totalResult.length

    // Get paginated results
    const offset = (page - 1) * pageSize
    const results = await db
      .select()
      .from(changeOrderDocuments)
      .where(and(...whereConditions))
      .orderBy(desc(changeOrderDocuments.createdAt))
      .limit(pageSize)
      .offset(offset)

    const totalPages = Math.ceil(total / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      documents: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Get change order documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      changeOrderId,
      projectId,
      name,
      description,
      category,
      fileType,
      fileSize,
      url,
      blobKey,
    } = body

    // Validation
    if (!changeOrderId || !name || !url || !blobKey) {
      return NextResponse.json(
        { error: 'Change order ID, name, URL, and blob key are required' },
        { status: 400 }
      )
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Create document record
    const [newDocument] = await db
      .insert(changeOrderDocuments)
      .values({
        changeOrderId,
        projectId,
        companyId,
        name,
        description,
        category: category || 'Supporting Document',
        fileType: fileType || 'unknown',
        fileSize: fileSize || 0,
        url,
        blobKey,
        uploadedBy: auth.admin.id,
        uploadedByName: auth.admin.name,
      })
      .returning()

    return NextResponse.json({
      success: true,
      document: newDocument,
    })
  } catch (error) {
    console.error('Create change order document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}