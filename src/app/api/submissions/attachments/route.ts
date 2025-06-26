import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { del } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
    }

    // Check for admin token first
    let decoded: any
    let isAdmin = false
    
    if (authHeader.startsWith('AdminBearer ')) {
      const adminToken = authHeader.substring(12)
      try {
        decoded = jwt.verify(adminToken, JWT_SECRET) as any
        if (!decoded.isAdmin || !decoded.admin || decoded.admin.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        isAdmin = true
      } catch (error) {
        return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
      }
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
    }

    const { submissionId, fileUrl, fileName } = await request.json()

    if (!submissionId || !fileUrl) {
      return NextResponse.json({ error: 'Missing submissionId or fileUrl' }, { status: 400 })
    }

    // Get the submission to verify ownership and get current files
    const submission = await db.select().from(submissions).where(eq(submissions.id, submissionId))
    if (!submission.length) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Check permissions - admin can delete any attachment, user can only delete their own
    const userId = isAdmin ? decoded.admin?.id : decoded.user?.id
    if (!isAdmin && submission[0].userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - can only delete your own attachments' }, { status: 403 })
    }

    // Delete the file from Vercel Blob
    try {
      await del(fileUrl)
    } catch (blobError) {
      console.error('Blob deletion error:', blobError)
      // Continue with database update even if blob deletion fails
    }

    // Remove the file from the submission's uploadedFiles array
    const currentFormData = submission[0].formData as any
    if (currentFormData.uploadedFiles && Array.isArray(currentFormData.uploadedFiles)) {
      currentFormData.uploadedFiles = currentFormData.uploadedFiles.filter((file: any) => 
        file.url !== fileUrl
      )

      // Update the submission in the database
      await db.update(submissions)
        .set({ 
          formData: currentFormData,
          updatedAt: new Date()
        })
        .where(eq(submissions.id, submissionId))
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attachment deleted successfully' 
    })

  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ 
      error: 'Failed to delete attachment' 
    }, { status: 500 })
  }
}