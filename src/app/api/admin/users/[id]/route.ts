import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { AdminJWTPayload } from '@/types/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

async function getAdminFromToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cookieToken = request.cookies.get('adminAuthToken')?.value
  
  const token = authHeader?.replace('Bearer ', '') || cookieToken

  if (!token) {
    return null
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJWTPayload
    return decoded.admin
  } catch {
    return null
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request)
    
    if (!admin || admin.role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Access denied. Super-admin privileges required.' },
        { status: 403 }
      )
    }

    const { name, email, password, role } = await request.json()
    const resolvedParams = await params
    const userId = resolvedParams.id

    // Check if user exists and belongs to same company
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.companyId, admin.companyId)
        )
      )
      .limit(1)

    if (existingUser.length === 0) {
      return NextResponse.json(
        { message: 'Admin user not found' },
        { status: 404 }
      )
    }

    // Prevent super-admin from demoting themselves
    if (userId === admin.id && role && role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Cannot demote yourself from super-admin role' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Partial<{
      name: string
      email: string
      role: string
      password: string
    }> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (role && (role === 'admin' || role === 'super-admin')) {
      updateData.role = role
    }
    if (password) {
      const saltRounds = 12
      updateData.password = await bcrypt.hash(password, saltRounds)
    }

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning()

    return NextResponse.json({
      message: 'Admin user updated successfully',
      admin: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    })
  } catch (error) {
    console.error('Error updating admin user:', error)
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
    const admin = await getAdminFromToken(request)
    
    if (!admin || admin.role !== 'super-admin') {
      return NextResponse.json(
        { message: 'Access denied. Super-admin privileges required.' },
        { status: 403 }
      )
    }

    const resolvedParams = await params
    const userId = resolvedParams.id

    // Check if user exists and belongs to same company
    const existingUser = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.companyId, admin.companyId)
        )
      )
      .limit(1)

    if (existingUser.length === 0) {
      return NextResponse.json(
        { message: 'Admin user not found' },
        { status: 404 }
      )
    }

    const userToDelete = existingUser[0]

    // Prevent super-admin from deleting themselves
    if (userId === admin.id) {
      return NextResponse.json(
        { message: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Prevent deletion of any super-admin account
    if (userToDelete.role === 'super-admin') {
      return NextResponse.json(
        { message: 'Super-admin accounts cannot be deleted' },
        { status: 403 }
      )
    }

    // Delete user
    await db
      .delete(users)
      .where(eq(users.id, userId))

    return NextResponse.json({
      message: 'Admin user deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}