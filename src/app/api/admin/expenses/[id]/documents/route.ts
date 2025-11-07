import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseDocuments } from '@/lib/db/schema'
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

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/pdf'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const expenseId = resolvedParams.id

    // Verify expense exists and belongs to admin's company
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(expenses.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json({ 
        error: 'File is required' 
      }, { status: 400 })
    }

    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Only JPG, PNG, and PDF files are allowed.'
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File size too large. Maximum size is 10MB.'
      }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedFileName}`
    
    // Upload to Vercel Blob
    const blobKey = `${auth.admin.companyId}/expenses/${expenseId}/documents/${fileName}`
    
    const blob = await put(blobKey, file, {
      access: 'public',
    })

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

  } catch (error: any) {
    console.error('Error uploading document:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const expenseId = resolvedParams.id

    // Verify expense exists and belongs to admin's company
    const existingExpense = await db
      .select()
      .from(expenses)
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(expenses.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Get documents
    const documents = await db
      .select()
      .from(expenseDocuments)
      .where(eq(expenseDocuments.expenseId, expenseId))

    return NextResponse.json({
      success: true,
      documents
    })

  } catch (error: any) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}