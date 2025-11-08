import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseProjects, expenseDocuments, projects } from '@/lib/db/schema'
import { put } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ projectId: string; expenseId: string }> }
) {
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

    const resolvedParams = await params
    const { projectId, expenseId } = resolvedParams

    // Verify project belongs to admin's company
    const project = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (project.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify expense belongs to this project and company
    const expenseResult = await db
      .select()
      .from(expenses)
      .innerJoin(expenseProjects, eq(expenses.id, expenseProjects.expenseId))
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(expenses.companyId, auth.admin.companyId),
          eq(expenseProjects.projectId, projectId)
        )
      )
      .limit(1)

    if (expenseResult.length === 0) {
      return NextResponse.json({ error: 'Expense not found in this project' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string
    const name = formData.get('name') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // File size limit (50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `File size exceeds 50MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB` 
      }, { status: 400 })
    }

    // Upload to Vercel Blob
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${sanitizedFileName}`
    
    const blob = await put(`project-expenses/${auth.admin.companyId}/${projectId}/${expenseId}/${filename}`, file, {
      access: 'public',
    })

    const blobKey = blob.pathname

    // Save document record
    const newDocument = await db
      .insert(expenseDocuments)
      .values({
        expenseId: expenseId,
        companyId: auth.admin.companyId,
        name: name || file.name,
        description: description || null,
        fileType: file.type,
        fileSize: file.size,
        url: blob.url,
        blobKey: blobKey,
        uploadedBy: auth.admin.id,
        uploadedByName: auth.admin.name
      })
      .returning()

    return NextResponse.json({
      success: true,
      document: newDocument[0],
      message: 'Document uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading project expense document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}