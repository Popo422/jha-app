import { NextRequest, NextResponse } from 'next/server'
import { eq, and, desc, ilike, or } from 'drizzle-orm'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { changeOrders } from '@/lib/db/schema'
import { validateAdminSession } from '@/lib/auth-utils'

// Helper function to upload signature to Vercel Blob
async function uploadSignatureToBlob(signatureDataUrl: string, companyId: string, changeOrderId: string, signerType: string, signerName: string) {
  if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/')) {
    return null
  }

  try {
    // Convert base64 data URL to buffer
    const base64Data = signatureDataUrl.split(',')[1] // Remove data:image/png;base64, prefix
    const buffer = Buffer.from(base64Data, 'base64')

    // Create a unique filename
    const timestamp = Date.now()
    const sanitizedSignerName = (signerName || 'unknown').replace(/[^a-zA-Z0-9.-]/g, '_')
    const blobKey = `${companyId}/change-orders/signatures/${changeOrderId}_${signerType}_${sanitizedSignerName}_${timestamp}.png`

    // Upload to Vercel Blob
    const blob = await put(blobKey, buffer, {
      access: 'public',
      contentType: 'image/png',
    })

    return blob.url
  } catch (error) {
    console.error('Error uploading signature to blob:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const changeType = searchParams.get('changeType')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Build where conditions
    const whereConditions = [
      eq(changeOrders.projectId, projectId),
      eq(changeOrders.companyId, companyId)
    ]

    // Add search filter
    if (search) {
      whereConditions.push(
        or(
          ilike(changeOrders.title, `%${search}%`),
          ilike(changeOrders.description, `%${search}%`),
          ilike(changeOrders.requestedBy, `%${search}%`)
        )!
      )
    }

    // Add status filter
    if (status) {
      whereConditions.push(eq(changeOrders.status, status))
    }

    // Add change type filter
    if (changeType) {
      whereConditions.push(eq(changeOrders.changeType, changeType))
    }

    // Get total count
    const totalResult = await db
      .select({ count: changeOrders.id })
      .from(changeOrders)
      .where(and(...whereConditions))

    const total = totalResult.length

    // Get paginated results
    const offset = (page - 1) * pageSize
    const results = await db
      .select()
      .from(changeOrders)
      .where(and(...whereConditions))
      .orderBy(desc(changeOrders.createdAt))
      .limit(pageSize)
      .offset(offset)

    const totalPages = Math.ceil(total / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      changeOrders: results,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    })
  } catch (error) {
    console.error('Get change orders error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const {
      projectId,
      title,
      description,
      changeType,
      originalContractAmount,
      newAmount,
      costDifference,
      addedDays,
      originalEndDate,
      revisedEndDate,
      requestedBy,
      notesOrJustification,
      toBeApprovedBy,
      toBeApprovedByUserIds,
      keyStakeholder,
      status,
      approverSignature,
    } = body

    // Validation
    if (!projectId || !title || !changeType || !requestedBy) {
      return NextResponse.json(
        { error: 'Project ID, title, change type, and requested by are required' },
        { status: 400 }
      )
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Create change order first to get the ID
    const [newChangeOrder] = await db
      .insert(changeOrders)
      .values({
        projectId,
        companyId,
        title,
        description,
        changeType,
        originalContractAmount: originalContractAmount || null,
        newAmount: newAmount || null,
        costDifference: costDifference || null,
        addedDays: addedDays || 0,
        originalEndDate,
        revisedEndDate,
        requestedBy,
        requestedByUserId: auth.admin.id,
        notesOrJustification,
        toBeApprovedBy,
        toBeApprovedByUserIds: toBeApprovedByUserIds || [],
        keyStakeholder,
        status: status || 'Pending',
      })
      .returning()

    // Upload signature to Vercel Blob if provided
    let signatureUrl = null
    if (approverSignature) {
      signatureUrl = await uploadSignatureToBlob(
        approverSignature,
        companyId,
        newChangeOrder.id,
        'approver',
        toBeApprovedBy || 'Unknown'
      )
      
      // Update the change order with the signature URL
      if (signatureUrl) {
        await db
          .update(changeOrders)
          .set({ approverSignature: signatureUrl })
          .where(eq(changeOrders.id, newChangeOrder.id))
        
        // Update the returned object
        newChangeOrder.approverSignature = signatureUrl
      }
    }

    return NextResponse.json({
      success: true,
      changeOrder: newChangeOrder,
    })
  } catch (error) {
    console.error('Create change order error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { id, approverSignature, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Change order ID is required' }, { status: 400 })
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Build update object, excluding signature
    const cleanUpdateData = {
      title: updateData.title,
      description: updateData.description,
      changeType: updateData.changeType,
      originalContractAmount: updateData.originalContractAmount,
      newAmount: updateData.newAmount,
      costDifference: updateData.costDifference,
      addedDays: updateData.addedDays,
      originalEndDate: updateData.originalEndDate,
      revisedEndDate: updateData.revisedEndDate,
      requestedBy: updateData.requestedBy,
      notesOrJustification: updateData.notesOrJustification,
      toBeApprovedBy: updateData.toBeApprovedBy,
      toBeApprovedByUserIds: updateData.toBeApprovedByUserIds,
      keyStakeholder: updateData.keyStakeholder,
      status: updateData.status,
      updatedAt: new Date(),
    }

    // Update change order first (without signature)
    const [updatedChangeOrder] = await db
      .update(changeOrders)
      .set(cleanUpdateData)
      .where(
        and(
          eq(changeOrders.id, id),
          eq(changeOrders.companyId, companyId)
        )
      )
      .returning()

    // Handle signature upload separately
    if (approverSignature && approverSignature.startsWith('data:image/')) {
      const signatureUrl = await uploadSignatureToBlob(
        approverSignature,
        companyId,
        id,
        'approver',
        cleanUpdateData.toBeApprovedBy || 'Unknown'
      )
      
      if (signatureUrl) {
        await db
          .update(changeOrders)
          .set({ approverSignature: signatureUrl })
          .where(eq(changeOrders.id, id))
        
        updatedChangeOrder.approverSignature = signatureUrl
      }
    }

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