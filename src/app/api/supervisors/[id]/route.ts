import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { supervisors } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

async function getUserFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const adminCookieToken = request.cookies.get('adminAuthToken')?.value
  const contractorCookieToken = request.cookies.get('contractorAuthToken')?.value
  
  const token = authHeader?.replace('Bearer ', '') || adminCookieToken || contractorCookieToken

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.admin || decoded.contractor
  } catch {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    
    if (!user || !user.companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins can update supervisors
    if (!user.role || !['admin', 'super-admin'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const { name } = await request.json()
    const resolvedParams = await params
    const supervisorId = resolvedParams.id

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: 'Supervisor name is required' },
        { status: 400 }
      )
    }

    // Check if supervisor exists and belongs to user's company
    const existingSupervisor = await db
      .select()
      .from(supervisors)
      .where(
        and(
          eq(supervisors.id, supervisorId),
          eq(supervisors.companyId, user.companyId)
        )
      )
      .limit(1)

    if (existingSupervisor.length === 0) {
      return NextResponse.json(
        { message: 'Supervisor not found' },
        { status: 404 }
      )
    }

    // Check if another supervisor with this name already exists
    const duplicateSupervisor = await db
      .select()
      .from(supervisors)
      .where(
        and(
          eq(supervisors.companyId, user.companyId),
          eq(supervisors.name, name.trim()),
          sql`${supervisors.id} != ${supervisorId}`
        )
      )
      .limit(1)

    if (duplicateSupervisor.length > 0) {
      return NextResponse.json(
        { message: 'Another supervisor with this name already exists' },
        { status: 409 }
      )
    }

    // Update supervisor
    const [updatedSupervisor] = await db
      .update(supervisors)
      .set({
        name: name.trim(),
        updatedAt: new Date()
      })
      .where(eq(supervisors.id, supervisorId))
      .returning()

    return NextResponse.json({
      message: 'Supervisor updated successfully',
      supervisor: updatedSupervisor
    })
  } catch (error) {
    console.error('Error updating supervisor:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    
    if (!user || !user.companyId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only admins can delete supervisors
    if (!user.role || !['admin', 'super-admin'].includes(user.role)) {
      return NextResponse.json(
        { message: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const supervisorId = resolvedParams.id

    // Check if supervisor exists and belongs to user's company
    const existingSupervisor = await db
      .select()
      .from(supervisors)
      .where(
        and(
          eq(supervisors.id, supervisorId),
          eq(supervisors.companyId, user.companyId)
        )
      )
      .limit(1)

    if (existingSupervisor.length === 0) {
      return NextResponse.json(
        { message: 'Supervisor not found' },
        { status: 404 }
      )
    }

    // Delete supervisor
    await db
      .delete(supervisors)
      .where(eq(supervisors.id, supervisorId))

    return NextResponse.json({
      message: 'Supervisor deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting supervisor:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}