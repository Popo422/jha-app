import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseProjects, expenseDocuments, projects } from '@/lib/db/schema'
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

export async function GET(
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

    // Get expense and verify it's assigned to this project
    const expenseResult = await db
      .select({
        expense: expenses,
      })
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

    const expense = expenseResult[0].expense

    // Get documents
    const documents = await db
      .select()
      .from(expenseDocuments)
      .where(eq(expenseDocuments.expenseId, expenseId))

    const expenseWithDetails = {
      ...expense,
      projectId,
      documents,
      documentCount: documents.length
    }

    return NextResponse.json({
      success: true,
      expense: expenseWithDetails
    })

  } catch (error) {
    console.error('Error fetching project expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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
    const body = await request.json()
    const { 
      name, 
      description, 
      price, 
      quantity, 
      totalCost,
      date
    } = body

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

    // Get existing expense and verify it's assigned to this project
    const existingExpense = await db
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

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found in this project' }, { status: 404 })
    }

    const currentExpense = existingExpense[0].expenses

    // Update the expense
    const updatedExpense = await db
      .update(expenses)
      .set({
        name: name || currentExpense.name,
        description: description !== undefined ? description : currentExpense.description,
        price: price !== undefined ? price.toString() : currentExpense.price,
        quantity: quantity !== undefined ? quantity.toString() : currentExpense.quantity,
        totalCost: totalCost !== undefined ? totalCost.toString() : currentExpense.totalCost,
        date: date || currentExpense.date,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, expenseId))
      .returning()

    return NextResponse.json({
      success: true,
      expense: {
        ...updatedExpense[0],
        projectId,
        documents: [],
        documentCount: 0
      },
      message: 'Expense updated successfully'
    })

  } catch (error) {
    console.error('Error updating project expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Get existing expense and verify it's assigned to this project
    const existingExpense = await db
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

    if (existingExpense.length === 0) {
      return NextResponse.json({ error: 'Expense not found in this project' }, { status: 404 })
    }

    // Get all documents associated with this expense before deleting
    const documents = await db
      .select()
      .from(expenseDocuments)
      .where(eq(expenseDocuments.expenseId, expenseId))

    // Delete files from Vercel Blob storage
    if (documents.length > 0) {
      const deletePromises = documents.map(async (doc) => {
        try {
          if (doc.blobKey) {
            await del(doc.blobKey)
          }
        } catch (error) {
          console.error(`Failed to delete blob ${doc.blobKey}:`, error)
          // Continue with other deletions even if one fails
        }
      })

      // Wait for all blob deletions to complete
      await Promise.allSettled(deletePromises)
    }

    // Delete the expense (cascade will handle related records)
    await db
      .delete(expenses)
      .where(eq(expenses.id, expenseId))

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
      deletedFiles: documents.length
    })

  } catch (error) {
    console.error('Error deleting project expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}