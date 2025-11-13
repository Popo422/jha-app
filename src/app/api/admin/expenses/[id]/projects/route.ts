import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseProjects, projects } from '@/lib/db/schema'

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
    const body = await request.json()
    const { projectIds } = body

    if (!projectIds || !Array.isArray(projectIds)) {
      return NextResponse.json({ 
        error: 'Project IDs array is required' 
      }, { status: 400 })
    }

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

    const expense = existingExpense[0]

    // Remove existing project assignments
    await db
      .delete(expenseProjects)
      .where(eq(expenseProjects.expenseId, expenseId))

    // Add new project assignments
    if (projectIds.length > 0) {
      // Calculate allocation per project (equal split by default)
      const percentagePerProject = (100 / projectIds.length).toFixed(2)
      const allocatedAmountPerProject = (parseFloat(expense.totalCost) / projectIds.length).toFixed(2)

      const projectAssignments = projectIds.map((projectId: string) => ({
        expenseId: expenseId,
        projectId,
        percentage: percentagePerProject,
        allocatedAmount: allocatedAmountPerProject,
        assignedBy: auth.admin.id,
        assignedByName: auth.admin.name
      }))

      await db.insert(expenseProjects).values(projectAssignments)
    }

    // Get updated project assignments with project names
    const updatedAssignments = await db
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

    return NextResponse.json({
      success: true,
      projectAssignments: updatedAssignments,
      message: 'Project assignments updated successfully'
    })

  } catch (error: any) {
    console.error('Error updating project assignments:', error)
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

    return NextResponse.json({
      success: true,
      projectAssignments
    })

  } catch (error: any) {
    console.error('Error fetching project assignments:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}