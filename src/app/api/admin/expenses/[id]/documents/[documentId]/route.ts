import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseDocuments } from '@/lib/db/schema'
import { del } from '@vercel/blob'

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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; documentId: string }> }) {
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
    const documentId = resolvedParams.documentId

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

    // Get the document to delete
    const document = await db
      .select()
      .from(expenseDocuments)
      .where(
        and(
          eq(expenseDocuments.id, documentId),
          eq(expenseDocuments.expenseId, expenseId)
        )
      )
      .limit(1)

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const doc = document[0]

    // Delete from Vercel Blob storage
    try {
      await del(doc.url)
    } catch (blobError) {
      console.error('Error deleting from blob storage:', blobError)
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await db
      .delete(expenseDocuments)
      .where(eq(expenseDocuments.id, documentId))

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}