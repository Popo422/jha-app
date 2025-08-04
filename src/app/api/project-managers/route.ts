import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectManagers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { authenticateRequest } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { isAdmin: boolean; admin?: any }
    try {
      auth = authenticateRequest(request, 'admin')
    } catch (error) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const admin = auth.admin
    if (!admin || !['admin', 'super-admin'].includes(admin.role)) {
      return NextResponse.json(
        { message: 'Access denied. Admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { projectManagers: managersData } = body

    if (!managersData || !Array.isArray(managersData)) {
      return NextResponse.json(
        { message: 'Invalid request body. Expected projectManagers array.' },
        { status: 400 }
      )
    }

    // Validate each project manager
    for (const manager of managersData) {
      if (!manager.name || !manager.email) {
        return NextResponse.json(
          { message: 'Each project manager must have name and email' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate emails within the company
    for (const manager of managersData) {
      const existingManager = await db
        .select()
        .from(projectManagers)
        .where(
          and(
            eq(projectManagers.companyId, admin.companyId),
            eq(projectManagers.email, manager.email.trim())
          )
        )
        .limit(1)

      if (existingManager.length > 0) {
        return NextResponse.json(
          { message: `Project manager with email ${manager.email} already exists` },
          { status: 409 }
        )
      }
    }

    // Insert project managers with enhanced error handling
    const insertedManagers = []
    const errors = []
    
    for (const manager of managersData) {
      try {
        const [insertedManager] = await db.insert(projectManagers).values({
          name: manager.name.trim(),
          email: manager.email.trim(),
          phone: manager.phone?.trim() || null,
          companyId: admin.companyId,
        }).returning()
        
        insertedManagers.push(insertedManager)
      } catch (insertError: any) {
        if (insertError.code === '23505') {
          if (insertError.constraint?.includes('company_email_unique')) {
            errors.push(`Project manager with email ${manager.email} already exists in your company`)
          } else {
            errors.push(`Duplicate entry detected for ${manager.email}`)
          }
        } else {
          errors.push(`Failed to create project manager ${manager.name}: ${insertError.message}`)
        }
      }
    }

    if (errors.length > 0 && insertedManagers.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Failed to create any project managers',
          errors: errors 
        },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      projectManagers: insertedManagers,
      message: `Successfully created ${insertedManagers.length} project manager${insertedManagers.length !== 1 ? 's' : ''}`,
      ...(errors.length > 0 && { warnings: errors, skipped: errors.length })
    })

  } catch (error: any) {
    console.error('Error creating project managers:', error)
    
    // Handle database constraint violations at the outer level
    if (error.code === '23505') {
      if (error.constraint?.includes('company_email_unique')) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Duplicate email address detected',
            error: 'One or more project manager emails already exist in your company' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error',
        error: 'Failed to create project managers' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    
    if (!user || !user.companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all project managers for this company
    const managersData = await db
      .select()
      .from(projectManagers)
      .where(eq(projectManagers.companyId, user.companyId))

    return NextResponse.json(managersData)
  } catch (error) {
    console.error('Error fetching project managers:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}