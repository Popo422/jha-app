import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc, ilike, gte, lte, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { expenses, expenseProjects, expenseDocuments, projects } from '@/lib/db/schema'

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

export async function GET(request: NextRequest) {
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
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const minAmount = searchParams.get('minAmount')
    const maxAmount = searchParams.get('maxAmount')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

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

    // Get expenses assigned to this project
    const expenseProjectsQuery = db
      .select({ expenseId: expenseProjects.expenseId })
      .from(expenseProjects)
      .where(eq(expenseProjects.projectId, projectId))

    const expenseIds = (await expenseProjectsQuery).map(ep => ep.expenseId)

    if (expenseIds.length === 0) {
      return NextResponse.json({
        success: true,
        expenses: [],
        totalAmount: 0,
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }
      })
    }

    // Build query conditions
    const conditions = [
      eq(expenses.companyId, auth.admin.companyId),
      inArray(expenses.id, expenseIds)
    ]

    if (search) {
      conditions.push(ilike(expenses.name, `%${search}%`))
    }

    if (category) {
      conditions.push(eq(expenses.category, category))
    }

    if (dateFrom) {
      conditions.push(gte(expenses.date, dateFrom))
    }

    if (dateTo) {
      conditions.push(lte(expenses.date, dateTo))
    }

    if (minAmount) {
      conditions.push(gte(expenses.totalCost, minAmount))
    }

    if (maxAmount) {
      conditions.push(lte(expenses.totalCost, maxAmount))
    }

    // Get total count and total amount for pagination and summary
    const totalCount = await db
      .select({ count: expenses.id })
      .from(expenses)
      .where(and(...conditions))

    // Get total amount for all filtered expenses
    const totalAmountResult = await db
      .select({ 
        totalAmount: expenses.totalCost 
      })
      .from(expenses)
      .where(and(...conditions))

    // Calculate the sum of all filtered expenses
    const totalAmount = totalAmountResult.reduce((sum, expense) => {
      return sum + parseFloat(expense.totalAmount)
    }, 0)

    // Get paginated expenses
    const projectExpenses = await db
      .select({
        id: expenses.id,
        companyId: expenses.companyId,
        name: expenses.name,
        description: expenses.description,
        price: expenses.price,
        quantity: expenses.quantity,
        totalCost: expenses.totalCost,
        date: expenses.date,
        createdBy: expenses.createdBy,
        createdByName: expenses.createdByName,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt
      })
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    // Get document counts for each expense
    const expenseIdsForDocs = projectExpenses.map(e => e.id)
    const documentCounts = expenseIdsForDocs.length > 0 ? await db
      .select({
        expenseId: expenseDocuments.expenseId,
        count: expenseDocuments.id
      })
      .from(expenseDocuments)
      .where(inArray(expenseDocuments.expenseId, expenseIdsForDocs)) : []

    // Create a map of expense ID to document count
    const docCountMap = documentCounts.reduce((acc: Record<string, number>, doc) => {
      acc[doc.expenseId] = (acc[doc.expenseId] || 0) + 1
      return acc
    }, {})

    // Combine data
    const expensesWithDetails = projectExpenses.map(expense => ({
      ...expense,
      projectId,
      documents: [],
      documentCount: docCountMap[expense.id] || 0
    }))

    const total = totalCount.length
    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      expenses: expensesWithDetails,
      totalAmount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching project expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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
    const { 
      projectId,
      name, 
      description, 
      price, 
      quantity, 
      totalCost,
      date,
      category
    } = body

    if (!projectId || !name || !price || !quantity || !totalCost || !date) {
      return NextResponse.json({ 
        error: 'Project ID, name, price, quantity, total cost, and date are required' 
      }, { status: 400 })
    }

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

    // Create the expense
    const newExpense = await db
      .insert(expenses)
      .values({
        companyId: auth.admin.companyId,
        name,
        description: description || null,
        price: price.toString(),
        quantity: quantity.toString(),
        totalCost: totalCost.toString(),
        date,
        category: category || 'Other',
        createdBy: auth.admin.id,
        createdByName: auth.admin.name
      })
      .returning()

    const expense = newExpense[0]

    // Assign to project (100% allocation)
    await db.insert(expenseProjects).values({
      expenseId: expense.id,
      projectId,
      percentage: '100.00',
      allocatedAmount: totalCost.toString(),
      assignedBy: auth.admin.id,
      assignedByName: auth.admin.name
    })

    return NextResponse.json({
      success: true,
      expense: {
        ...expense,
        projectId,
        documents: [],
        documentCount: 0
      },
      message: 'Expense created successfully'
    })

  } catch (error) {
    console.error('Error creating project expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}