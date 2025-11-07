import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseProjects, expenseDocuments, projects, companies } from '@/lib/db/schema'
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

    // Get expense with company verification
    const expenseResult = await db
      .select({
        expense: expenses,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.id, expenseId),
          eq(expenses.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (expenseResult.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const expense = expenseResult[0].expense

    // Get project assignments
    const projectAssignments = await db
      .select({
        id: expenseProjects.id,
        expenseId: expenseProjects.expenseId,
        projectId: expenseProjects.projectId,
        percentage: expenseProjects.percentage,
        allocatedAmount: expenseProjects.allocatedAmount,
        assignedBy: expenseProjects.assignedBy,
        assignedByName: expenseProjects.assignedByName,
        assignedAt: expenseProjects.assignedAt,
        projectName: projects.name
      })
      .from(expenseProjects)
      .innerJoin(projects, eq(expenseProjects.projectId, projects.id))
      .where(eq(expenseProjects.expenseId, expenseId))

    // Get documents
    const documents = await db
      .select()
      .from(expenseDocuments)
      .where(eq(expenseDocuments.expenseId, expenseId))

    // Combine data
    const expenseWithDetails = {
      ...expense,
      projects: projectAssignments.map(p => ({
        id: p.id,
        expenseId: p.expenseId,
        projectId: p.projectId,
        percentage: p.percentage,
        allocatedAmount: p.allocatedAmount,
        assignedBy: p.assignedBy,
        assignedByName: p.assignedByName,
        assignedAt: p.assignedAt,
        project: {
          id: p.projectId,
          name: p.projectName
        }
      })),
      documents,
      projectNames: projectAssignments.map(p => p.projectName),
      documentCount: documents.length
    }

    return NextResponse.json({
      success: true,
      expense: expenseWithDetails
    })

  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()
    const { 
      name, 
      description, 
      price, 
      quantity, 
      totalCost,
      date
    } = body

    // Get the existing expense and verify it belongs to admin's company
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

    // Use provided total cost or keep existing
    const finalTotalCost = totalCost !== undefined ? totalCost.toString() : existingExpense[0].totalCost;

    // Update the expense
    const updatedExpense = await db
      .update(expenses)
      .set({
        name: name || existingExpense[0].name,
        description: description !== undefined ? description : existingExpense[0].description,
        price: price !== undefined ? price.toString() : existingExpense[0].price,
        quantity: quantity !== undefined ? quantity.toString() : existingExpense[0].quantity,
        totalCost: finalTotalCost,
        date: date || existingExpense[0].date,
        updatedAt: new Date()
      })
      .where(eq(expenses.id, expenseId))
      .returning()

    return NextResponse.json({
      success: true,
      expense: {
        ...updatedExpense[0],
        projects: [],
        documents: [],
        projectNames: [],
        documentCount: 0
      },
      message: 'Expense updated successfully'
    })

  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get the existing expense and verify it belongs to admin's company
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
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}