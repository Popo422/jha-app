import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { projectDocuments } from '@/lib/db/schema'
import { validateAdminSession } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const document = await db
      .select()
      .from(projectDocuments)
      .where(and(
        eq(projectDocuments.id, params.id),
        eq(projectDocuments.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document: document[0] })

  } catch (error) {
    console.error('Error fetching project document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const { name, description, category } = body

    // Check if document exists and belongs to company
    const existingDocument = await db
      .select()
      .from(projectDocuments)
      .where(and(
        eq(projectDocuments.id, params.id),
        eq(projectDocuments.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingDocument.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update document
    const updatedDocument = await db
      .update(projectDocuments)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category })
      })
      .where(eq(projectDocuments.id, params.id))
      .returning()

    return NextResponse.json({
      success: true,
      document: updatedDocument[0]
    })

  } catch (error) {
    console.error('Error updating project document:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique constraint')) {
      return NextResponse.json({ 
        error: 'A document with this name already exists in this project' 
      }, { status: 409 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    // Get document to delete from blob storage
    const document = await db
      .select()
      .from(projectDocuments)
      .where(and(
        eq(projectDocuments.id, params.id),
        eq(projectDocuments.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (document.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from Vercel Blob storage
    try {
      await del(document[0].blobKey)
    } catch (blobError) {
      console.error('Error deleting from blob storage:', blobError)
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await db
      .delete(projectDocuments)
      .where(eq(projectDocuments.id, params.id))

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting project document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}