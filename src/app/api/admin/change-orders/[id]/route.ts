import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { changeOrders } from '@/lib/db/schema'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const companyId = auth.admin.companyId

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const [changeOrder] = await db
      .select()
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.id, id),
          eq(changeOrders.companyId, companyId)
        )
      )
      .limit(1)

    if (!changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    return NextResponse.json({
      changeOrder,
    })
  } catch (error) {
    console.error('Get change order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const body = await request.json()
    const companyId = auth.admin.companyId

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Update change order
    const [updatedChangeOrder] = await db
      .update(changeOrders)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(changeOrders.id, id),
          eq(changeOrders.companyId, companyId)
        )
      )
      .returning()

    if (!updatedChangeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      changeOrder: updatedChangeOrder,
    })
  } catch (error) {
    console.error('Update change order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const resolvedParams = await params
    const { id } = resolvedParams
    const companyId = auth.admin.companyId

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Delete change order (documents will be deleted by cascade)
    const [deletedChangeOrder] = await db
      .delete(changeOrders)
      .where(
        and(
          eq(changeOrders.id, id),
          eq(changeOrders.companyId, companyId)
        )
      )
      .returning()

    if (!deletedChangeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete change order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}