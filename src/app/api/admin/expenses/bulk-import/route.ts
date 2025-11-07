import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { expenses, expenseProjects } from '@/lib/db/schema'

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
    const { extractedExpenses, projectIds } = body

    if (!extractedExpenses || !Array.isArray(extractedExpenses) || extractedExpenses.length === 0) {
      return NextResponse.json({ 
        error: 'Extracted expenses array is required' 
      }, { status: 400 })
    }

    const createdExpenses = []

    // Create each expense
    for (const expenseData of extractedExpenses) {
      const { name, description, price, quantity, date, projectIds: expenseProjectIds } = expenseData

      if (!name || !price || !quantity || !date) {
        continue // Skip invalid expenses
      }

      const totalCost = (parseFloat(price) * parseFloat(quantity)).toString()

      // Create the expense
      const newExpense = await db
        .insert(expenses)
        .values({
          companyId: auth.admin.companyId,
          name,
          description: description || null,
          price: price.toString(),
          quantity: quantity.toString(),
          totalCost,
          date,
          createdBy: auth.admin.id,
          createdByName: auth.admin.name
        })
        .returning()

      const expense = newExpense[0]

      // Assign to projects if provided in the expense data
      const projectIdsToAssign = expenseProjectIds && expenseProjectIds.length > 0 ? expenseProjectIds : projectIds
      
      if (projectIdsToAssign && projectIdsToAssign.length > 0) {
        const projectAssignments = projectIdsToAssign.map((projectId: string) => ({
          expenseId: expense.id,
          projectId,
          percentage: '100.00', // Default to 100% for bulk import
          allocatedAmount: totalCost,
          assignedBy: auth.admin.id,
          assignedByName: auth.admin.name
        }))

        await db.insert(expenseProjects).values(projectAssignments)
      }

      createdExpenses.push(expense)
    }

    return NextResponse.json({
      success: true,
      expenses: createdExpenses,
      count: createdExpenses.length,
      message: `Successfully imported ${createdExpenses.length} expense${createdExpenses.length > 1 ? 's' : ''}`
    })

  } catch (error: any) {
    console.error('Error bulk importing expenses:', error)
    return NextResponse.json({ 
      error: 'Internal server error during bulk import' 
    }, { status: 500 })
  }
}