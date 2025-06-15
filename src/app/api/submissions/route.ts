import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { put } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: TokenPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const submissionType = formData.get('submissionType') as string
    const date = formData.get('date') as string
    const dateTimeClocked = formData.get('dateTimeClocked') as string
    const jobSite = formData.get('jobSite') as string
    const formDataJson = formData.get('formData') as string

    // Validate required fields
    if (!submissionType || !jobSite || !formDataJson || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionType, jobSite, date, formData' },
        { status: 400 }
      )
    }

    if (!['end-of-day', 'job-hazard-analysis', 'start-of-day'].includes(submissionType)) {
      return NextResponse.json(
        { error: 'Invalid submission type' },
        { status: 400 }
      )
    }

    let parsedFormData
    try {
      parsedFormData = JSON.parse(formDataJson)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid form data JSON' },
        { status: 400 }
      )
    }

    // Handle file uploads
    const files = formData.getAll('files') as File[]
    const uploadedFiles: { filename: string; url: string }[] = []

    for (const file of files) {
      if (file.size > 0) {
        try {
          const blob = await put(file.name, file, {
            access: 'public',
          })
          uploadedFiles.push({
            filename: file.name,
            url: blob.url
          })
        } catch (error) {
          console.error('File upload error:', error)
          return NextResponse.json(
            { error: 'File upload failed' },
            { status: 500 }
          )
        }
      }
    }

    // Add uploaded files to form data
    parsedFormData.uploadedFiles = uploadedFiles

    // Create submission record
    const submission = await db.insert(submissions).values({
      completedBy: decoded.user.name,
      date: date,
      dateTimeClocked: dateTimeClocked ? new Date(dateTimeClocked) : null,
      company: decoded.contractor.name,
      jobSite: jobSite,
      submissionType: submissionType,
      formData: parsedFormData,
    }).returning()

    return NextResponse.json({
      success: true,
      submission: submission[0]
    })

  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    const token = request.cookies.get('authToken')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify JWT token
    let decoded: TokenPayload
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const submissionType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query conditions
    const conditions = [eq(submissions.company, decoded.contractor.name)]
    
    if (submissionType) {
      conditions.push(eq(submissions.submissionType, submissionType))
    }

    const result = await db.select().from(submissions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(submissions.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      submissions: result,
      meta: {
        limit,
        offset,
        company: decoded.contractor.name
      }
    })

  } catch (error) {
    console.error('Get submissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}