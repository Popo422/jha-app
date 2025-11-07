import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, desc, like, gte, lte, sql, inArray } from 'drizzle-orm'
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search');
    const projectId = searchParams.get('projectId');
    const category = searchParams.get('category');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // Build where conditions
    const conditions: any[] = [eq(expenses.companyId, auth.admin.companyId)];

    if (search) {
      conditions.push(
        sql`(${expenses.name} ILIKE ${`%${search}%`} OR ${expenses.description} ILIKE ${`%${search}%`})`
      );
    }

    if (category) {
      conditions.push(eq(expenses.category, category));
    }

    if (dateFrom) {
      conditions.push(gte(expenses.date, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(expenses.date, dateTo));
    }

    if (minAmount) {
      conditions.push(gte(expenses.totalCost, minAmount));
    }

    if (maxAmount) {
      conditions.push(lte(expenses.totalCost, maxAmount));
    }

    // Get expenses with pagination
    const offset = (page - 1) * pageSize;
    
    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(expenses)
      .where(and(...conditions));
    
    const total = totalResult[0]?.count || 0;

    // Get expenses with project and document counts
    const expenseResults = await db
      .select({
        expense: expenses,
        projectCount: sql<number>`count(distinct ${expenseProjects.projectId})`,
        documentCount: sql<number>`count(distinct ${expenseDocuments.id})`
      })
      .from(expenses)
      .leftJoin(expenseProjects, eq(expenses.id, expenseProjects.expenseId))
      .leftJoin(expenseDocuments, eq(expenses.id, expenseDocuments.expenseId))
      .where(and(...conditions))
      .groupBy(expenses.id)
      .orderBy(desc(expenses.createdAt))
      .limit(pageSize)
      .offset(offset);

    // Get project assignments and documents for each expense
    const expenseIds = expenseResults.map(r => r.expense.id);
    
    let projectAssignments: any[] = [];
    let documentCounts: any[] = [];
    
    if (expenseIds.length > 0) {
      // Get project assignments
      projectAssignments = await db
        .select({
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
        .where(inArray(expenseProjects.expenseId, expenseIds));

      // Get document info
      documentCounts = await db
        .select({
          expenseId: expenseDocuments.expenseId,
          id: expenseDocuments.id,
          name: expenseDocuments.name,
          description: expenseDocuments.description,
          fileType: expenseDocuments.fileType,
          fileSize: expenseDocuments.fileSize,
          url: expenseDocuments.url,
          blobKey: expenseDocuments.blobKey,
          uploadedBy: expenseDocuments.uploadedBy,
          uploadedByName: expenseDocuments.uploadedByName,
          createdAt: expenseDocuments.createdAt
        })
        .from(expenseDocuments)
        .where(inArray(expenseDocuments.expenseId, expenseIds));
    }

    // Combine data
    const expensesWithDetails = expenseResults.map(result => {
      const expenseProjects = projectAssignments.filter(p => p.expenseId === result.expense.id);
      const expenseDocs = documentCounts.filter(d => d.expenseId === result.expense.id);
      
      return {
        ...result.expense,
        projects: expenseProjects.map(p => ({
          id: `${p.expenseId}-${p.projectId}`,
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
        documents: expenseDocs,
        projectNames: expenseProjects.map(p => p.projectName),
        documentCount: expenseDocs.length
      };
    });

    // Filter by project if specified
    const filteredExpenses = projectId 
      ? expensesWithDetails.filter(expense => 
          expense.projects.some(p => p.projectId === projectId)
        )
      : expensesWithDetails;

    const totalPages = Math.ceil(total / pageSize);
    
    return NextResponse.json({
      success: true,
      expenses: filteredExpenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const body = await request.json();
    const { 
      name, 
      description, 
      price, 
      quantity, 
      totalCost,
      date,
      category,
      projectIds
    } = body;

    if (!name || !price || !quantity || !totalCost || !date) {
      return NextResponse.json({ 
        error: 'Name, price, quantity, total cost, and date are required' 
      }, { status: 400 });
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
      .returning();

    const expense = newExpense[0];

    // Assign to projects if provided
    if (projectIds && projectIds.length > 0) {
      const projectAssignments = projectIds.map((projectId: string) => ({
        expenseId: expense.id,
        projectId,
        percentage: '100.00', // Default to 100% for single project, can be customized later
        allocatedAmount: totalCost.toString(),
        assignedBy: auth.admin.id,
        assignedByName: auth.admin.name
      }));

      await db.insert(expenseProjects).values(projectAssignments);
    }

    // Fetch the complete expense with relations
    const completeExpense = await db
      .select({
        expense: expenses,
      })
      .from(expenses)
      .where(eq(expenses.id, expense.id))
      .limit(1);

    return NextResponse.json({
      success: true,
      expense: {
        ...completeExpense[0].expense,
        projects: [],
        documents: [],
        projectNames: [],
        documentCount: 0
      },
      message: 'Expense created successfully'
    });

  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}