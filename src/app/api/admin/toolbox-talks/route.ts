import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { toolboxTalks } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate and get user info
function authenticateRequest(request: NextRequest, authType: 'contractor' | 'admin' | 'any' = 'any'): { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any } {
  if (authType === 'contractor') {
    // Only try contractor token
    const userToken = request.cookies.get('authToken')?.value || 
                     (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                      request.headers.get('Authorization')?.replace('Bearer ', '') : null)

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
        return { 
          isAdmin: false, 
          userId: decoded.user.id, 
          userName: decoded.user.name,
          contractor: decoded.contractor 
        }
      } catch (error) {
        throw new Error('Invalid contractor token')
      }
    }
    throw new Error('No contractor authentication token found')
  }

  if (authType === 'admin') {
    // Only try admin token
    const adminToken = request.cookies.get('adminAuthToken')?.value || 
                      (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                       request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
    
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
        if (decoded.admin && decoded.isAdmin) {
          return { isAdmin: true, admin: decoded.admin }
        }
      } catch (error) {
        throw new Error('Invalid admin token')
      }
    }
    throw new Error('No admin authentication token found')
  }

  // Default behavior - try admin token first, then user token
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return { isAdmin: true, admin: decoded.admin }
      }
    } catch (error) {
      // Continue to try user token
    }
  }

  // Try user token
  const userToken = request.cookies.get('authToken')?.value || 
                   (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                    request.headers.get('Authorization')?.replace('Bearer ', '') : null)

  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
      return { 
        isAdmin: false, 
        userId: decoded.user.id, 
        userName: decoded.user.name,
        contractor: decoded.contractor 
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  throw new Error('No valid authentication token found')
}

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
  companyId: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

interface AdminTokenPayload {
  admin: {
    id: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}

// GET - Fetch toolbox talks for admin with pagination (drafts and published)
export async function GET(request: NextRequest) {
  try {
    // Only admins can access this endpoint
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const companyId = auth.admin?.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const fetchAll = searchParams.get('fetchAll') === 'true'
    const limit = fetchAll ? undefined : pageSize
    const offset = fetchAll ? undefined : (page - 1) * pageSize

    // Build conditions
    const conditions = eq(toolboxTalks.companyId, companyId)

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(toolboxTalks)
      .where(conditions)
    const totalCount = Number(countResult[0].count)

    // Get toolbox talks for the admin's company with pagination
    const baseQuery = db.select().from(toolboxTalks).where(conditions)
      .orderBy(desc(toolboxTalks.createdAt))
    
    const talks = fetchAll
      ? await baseQuery
      : await baseQuery.limit(limit!).offset(offset!)

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({ 
      toolboxTalks: talks,
      pagination: fetchAll ? null : {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('Get admin toolbox talks error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch toolbox talks' 
    }, { status: 500 })
  }
}

// POST - Create new toolbox talk
export async function POST(request: NextRequest) {
  try {
    // Only admins can access this endpoint
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const { title, content, status } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const companyId = auth.admin?.companyId
    const authorId = auth.admin?.id
    const authorName = auth.admin?.name

    if (!companyId || !authorId || !authorName) {
      return NextResponse.json({ error: 'Admin info missing' }, { status: 400 })
    }

    const newTalk = {
      title,
      content,
      status: status || 'draft',
      companyId,
      authorId,
      authorName,
      publishedAt: status === 'published' ? new Date() : null,
    }

    const result = await db.insert(toolboxTalks).values(newTalk).returning()

    return NextResponse.json({ 
      success: true, 
      toolboxTalk: result[0] 
    }, { status: 201 })

  } catch (error) {
    console.error('Create toolbox talk error:', error)
    return NextResponse.json({ 
      error: 'Failed to create toolbox talk' 
    }, { status: 500 })
  }
}

// PUT - Update toolbox talk
export async function PUT(request: NextRequest) {
  try {
    // Only admins can access this endpoint
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const { id, title, content, status } = await request.json()

    if (!id || !title || !content) {
      return NextResponse.json({ error: 'ID, title and content are required' }, { status: 400 })
    }

    const companyId = auth.admin?.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Check if toolbox talk exists and belongs to admin's company
    const existingTalk = await db.select().from(toolboxTalks).where(
      and(
        eq(toolboxTalks.id, id),
        eq(toolboxTalks.companyId, companyId)
      )
    )

    if (!existingTalk.length) {
      return NextResponse.json({ error: 'Toolbox talk not found' }, { status: 404 })
    }

    const updateData: any = {
      title,
      content,
      status: status || 'draft',
      updatedAt: new Date(),
    }

    // Set publishedAt if status is published and wasn't published before
    if (status === 'published' && existingTalk[0].status !== 'published') {
      updateData.publishedAt = new Date()
    }

    const result = await db.update(toolboxTalks)
      .set(updateData)
      .where(eq(toolboxTalks.id, id))
      .returning()

    return NextResponse.json({ 
      success: true, 
      toolboxTalk: result[0] 
    })

  } catch (error) {
    console.error('Update toolbox talk error:', error)
    return NextResponse.json({ 
      error: 'Failed to update toolbox talk' 
    }, { status: 500 })
  }
}

// DELETE - Delete toolbox talk
export async function DELETE(request: NextRequest) {
  try {
    // Only admins can access this endpoint
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const companyId = auth.admin?.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Check if toolbox talk exists and belongs to admin's company
    const existingTalk = await db.select().from(toolboxTalks).where(
      and(
        eq(toolboxTalks.id, id),
        eq(toolboxTalks.companyId, companyId)
      )
    )

    if (!existingTalk.length) {
      return NextResponse.json({ error: 'Toolbox talk not found' }, { status: 404 })
    }

    await db.delete(toolboxTalks).where(eq(toolboxTalks.id, id))

    return NextResponse.json({ 
      success: true, 
      message: 'Toolbox talk deleted successfully' 
    })

  } catch (error) {
    console.error('Delete toolbox talk error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete toolbox talk' 
    }, { status: 500 })
  }
}