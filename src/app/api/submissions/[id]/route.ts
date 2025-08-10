import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin') || 'admin'
    
    // Authenticate request
    let auth
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const submissionId = id

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Get the submission
    const submission = await db.select().from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1)

    if (submission.length === 0) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      )
    }

    const foundSubmission = submission[0]

    // Check if user has access to this submission
    const companyId = auth.isAdmin ? auth.admin.companyId : auth.contractor?.companyId
    
    if (!companyId || foundSubmission.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json(foundSubmission)

  } catch (error) {
    console.error('Get submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}