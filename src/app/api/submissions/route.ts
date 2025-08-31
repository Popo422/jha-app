import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, gte, lte, or, ilike, sql, not, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { put } from '@vercel/blob'
import { sendEventToUser } from '@/lib/sse-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate and get user info
function authenticateRequest(request: NextRequest, authType: 'contractor' | 'admin' | 'any' = 'any'): { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any } {
  if (authType === 'contractor') {
    // Only try contractor token
    const userToken = request.cookies.get('authToken')?.value || 
                     (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                      request.headers.get('Authorization')?.replace('Bearer ', '') : null)

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
        return { 
          isAdmin: false, 
          userId: decoded.user.id, 
          userName: decoded.user.name,
          contractor: decoded.contractor 
        }
      } catch (error) {
        throw new Error('Invalid contractor token')
      }
    }
    throw new Error('No contractor authentication token found')
  }

  if (authType === 'admin') {
    // Only try admin token
    const adminToken = request.cookies.get('adminAuthToken')?.value || 
                      (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                       request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
    
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
        if (decoded.admin && decoded.isAdmin) {
          return { isAdmin: true, admin: decoded.admin }
        }
      } catch (error) {
        throw new Error('Invalid admin token')
      }
    }
    throw new Error('No admin authentication token found')
  }

  // Default behavior - try admin token first, then user token
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return { isAdmin: true, admin: decoded.admin }
      }
    } catch (error) {
      // Continue to try user token
    }
  }

  // Try user token
  const userToken = request.cookies.get('authToken')?.value || 
                   (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                    request.headers.get('Authorization')?.replace('Bearer ', '') : null)

  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, JWT_SECRET) as TokenPayload
      return { 
        isAdmin: false, 
        userId: decoded.user.id, 
        userName: decoded.user.name,
        contractor: decoded.contractor 
      }
    } catch (error) {
      throw new Error('Invalid token')
    }
  }

  throw new Error('No valid authentication token found')
}

interface AuthUser {
  id: string
  email: string
  name: string
}

interface AuthContractor {
  id: string
  name: string
  code: string
  companyId: string
  companyName: string
}

interface TokenPayload {
  user: AuthUser
  contractor: AuthContractor
  iat: number
  exp: number
}

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

export async function POST(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use auth data instead of decoded
    const decoded = {
      user: { id: auth.userId!, name: auth.userName! },
      contractor: auth.contractor!
    }

    // Parse form data
    const formData = await request.formData()
    const submissionType = formData.get('submissionType') as string
    const date = formData.get('date') as string
    const dateTimeClocked = formData.get('dateTimeClocked') as string
    const projectName = formData.get('projectName') as string
    const formDataJson = formData.get('formData') as string

    // Validate required fields
    if (!submissionType || !projectName || !formDataJson || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: submissionType, projectName, date, formData' },
        { status: 400 }
      )
    }

    if (!['end-of-day', 'end-of-day-v2', 'job-hazard-analysis', 'start-of-day', 'start-of-day-v2', 'timesheet', 'incident-report', 'quick-incident-report', 'near-miss-report', 'vehicle-inspection'].includes(submissionType)) {
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
    const companyId = decoded.contractor.companyId

    for (const file of files) {
      if (file.size > 0) {
        try {
          // Create company-specific path: companyId/submissionType/filename
          const timestamp = Date.now()
          const fileExtension = file.name.split('.').pop()
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') // sanitize filename
          const blobPath = `${companyId}/${submissionType}/${timestamp}_${cleanFileName}`
          
          const blob = await put(blobPath, file, {
            access: 'public',
            addRandomSuffix: false, // We're already adding timestamp for uniqueness
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

    // Handle signature upload if present
    if (parsedFormData.signature && parsedFormData.signature.startsWith('data:image/')) {
      try {
        // Convert base64 signature to blob
        const base64Data = parsedFormData.signature.split(',')[1]
        const mimeType = parsedFormData.signature.split(';')[0].split(':')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Create company-specific path for signature
        const timestamp = Date.now()
        const signaturePath = `${companyId}/${submissionType}/signatures/signature-${decoded.user.id}-${timestamp}.png`
        
        // Upload signature to blob storage
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        })
        
        // Replace base64 data with blob URL
        parsedFormData.signature = signatureBlob.url
      } catch (error) {
        console.error('Signature upload error:', error)
        return NextResponse.json(
          { error: 'Signature upload failed' },
          { status: 500 }
        )
      }
    }

    // Create submission record
    const submission = await db.insert(submissions).values({
      userId: decoded.user.id,
      companyId: decoded.contractor.companyId,
      completedBy: parsedFormData.completedBy || decoded.user.name,
      date: date,
      dateTimeClocked: dateTimeClocked ? new Date(dateTimeClocked) : null,
      company: parsedFormData.company || decoded.contractor.companyName,
      projectName: projectName,
      submissionType: submissionType,
      formData: parsedFormData,
    }).returning()

    // Send SSE event to user about the new submission
    console.log('Sending SSE event for submission:', {
      userId: decoded.user.id,
      submissionType: submissionType,
      date: date,
      projectName: projectName,
      submissionId: submission[0].id
    })
    sendEventToUser(decoded.user.id, 'submission_created', {
      submissionType: submissionType,
      date: date,
      projectName: projectName,
      submissionId: submission[0].id
    })

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
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get remaining query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const limit = fetchAll ? undefined : pageSize;
    const offset = fetchAll ? undefined : (page - 1) * pageSize;
    const submissionType = searchParams.get('type')
    const excludeTypes = searchParams.get('excludeTypes')?.split(',').filter(Boolean)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const company = searchParams.get('company')
    const search = searchParams.get('search')

    // Build query conditions
    const conditions = []
    
    // If admin, filter by company ID
    if (auth.isAdmin && auth.admin?.companyId) {
      conditions.push(eq(submissions.companyId, auth.admin.companyId))
    }
    // If not admin, filter by user ID for user's own submissions only
    else if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }
    
    // Add submission type filter if specified
    if (submissionType) {
      conditions.push(eq(submissions.submissionType, submissionType))
    }
    
    // Add exclude types filter if specified
    if (excludeTypes && excludeTypes.length > 0) {
      conditions.push(not(inArray(submissions.submissionType, excludeTypes)))
    }

    // Add date range filters if specified
    if (dateFrom) {
      conditions.push(gte(submissions.date, dateFrom))
    }
    if (dateTo) {
      conditions.push(lte(submissions.date, dateTo))
    }

    // Add company filter if specified
    if (company) {
      conditions.push(eq(submissions.company, company))
    }

    // Add search filter if specified
    if (search) {
      conditions.push(
        or(
          ilike(submissions.completedBy, `%${search}%`),
          ilike(submissions.company, `%${search}%`),
          ilike(submissions.projectName, `%${search}%`),
          ilike(submissions.submissionType, `%${search}%`)
        )
      )
    }

    // Get total count for pagination
    let totalCount
    if (conditions.length === 0) {
      // No conditions - admin viewing all submissions
      const countResult = await db.select({ count: sql`count(*)` }).from(submissions)
      totalCount = Number(countResult[0].count)
    } else if (conditions.length === 1) {
      // Single condition
      const countResult = await db.select({ count: sql`count(*)` }).from(submissions)
        .where(conditions[0])
      totalCount = Number(countResult[0].count)
    } else {
      // Multiple conditions
      const countResult = await db.select({ count: sql`count(*)` }).from(submissions)
        .where(and(...conditions))
      totalCount = Number(countResult[0].count)
    }

    // Execute query - handle different condition scenarios
    let result
    if (conditions.length === 0) {
      // No conditions - admin viewing all submissions
      const baseQuery = db.select().from(submissions)
        .orderBy(desc(submissions.createdAt));
      
      result = fetchAll
        ? await baseQuery
        : await baseQuery.limit(limit!).offset(offset!);
    } else if (conditions.length === 1) {
      // Single condition
      const baseQuery = db.select().from(submissions)
        .where(conditions[0])
        .orderBy(desc(submissions.createdAt));
      
      result = fetchAll
        ? await baseQuery
        : await baseQuery.limit(limit!).offset(offset!);
    } else {
      // Multiple conditions
      const baseQuery = db.select().from(submissions)
        .where(and(...conditions))
        .orderBy(desc(submissions.createdAt));
      
      result = fetchAll
        ? await baseQuery
        : await baseQuery.limit(limit!).offset(offset!);
    }

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      submissions: result,
      pagination: fetchAll ? null : {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      },
      meta: {
        limit: fetchAll ? null : limit,
        offset: fetchAll ? null : offset,
        fetchAll,
        isAdmin: auth.isAdmin,
        userId: auth.userId || null
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

export async function DELETE(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get submission ID from URL
    const submissionId = searchParams.get('id')

    if (!submissionId) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Build conditions based on user type
    const conditions = [eq(submissions.id, submissionId)]
    
    // If not admin, also check that the submission belongs to the user
    if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }

    // First check if the submission exists (and belongs to user if not admin)
    const existingSubmission = await db.select().from(submissions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1)

    if (existingSubmission.length === 0) {
      return NextResponse.json(
        { error: auth.isAdmin ? 'Submission not found' : 'Submission not found or you do not have permission to delete it' },
        { status: 404 }
      )
    }

    // Delete the submission
    await db.delete(submissions)
      .where(eq(submissions.id, submissionId))

    // Send SSE event to the submission owner about the deleted submission (if not admin deleting)
    if (!auth.isAdmin && auth.userId) {
      sendEventToUser(auth.userId, 'submission_deleted', {
        submissionId: submissionId,
        submissionType: existingSubmission[0].submissionType,
        date: existingSubmission[0].date,
        projectName: existingSubmission[0].projectName
      })
    } else if (auth.isAdmin) {
      // Send SSE event to the original submission owner if admin is deleting
      sendEventToUser(existingSubmission[0].userId, 'submission_deleted', {
        submissionId: submissionId,
        submissionType: existingSubmission[0].submissionType,
        date: existingSubmission[0].date,
        projectName: existingSubmission[0].projectName,
        deletedByAdmin: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Submission deleted successfully'
    })

  } catch (error) {
    console.error('Delete submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin' | 'any') || 'any'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: AuthContractor; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { id, completedBy, date, dateTimeClocked, company, projectName, formData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Submission ID is required' },
        { status: 400 }
      )
    }

    // Build conditions based on user type
    const conditions = [eq(submissions.id, id)]
    
    // If not admin, also check that the submission belongs to the user
    if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }

    // First check if the submission exists (and belongs to user if not admin)
    const existingSubmission = await db.select().from(submissions)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .limit(1)

    if (existingSubmission.length === 0) {
      return NextResponse.json(
        { error: auth.isAdmin ? 'Submission not found' : 'Submission not found or you do not have permission to edit it' },
        { status: 404 }
      )
    }

    // Handle signature upload if present in formData
    let processedFormData = formData
    if (formData && formData.signature && formData.signature.startsWith('data:image/')) {
      try {
        // Convert base64 signature to blob
        const base64Data = formData.signature.split(',')[1]
        const mimeType = formData.signature.split(';')[0].split(':')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Create company-specific path for signature
        const timestamp = Date.now()
        const userId = auth.userId || existingSubmission[0].userId
        const companyId = existingSubmission[0].companyId
        const submissionType = existingSubmission[0].submissionType
        const signaturePath = `${companyId}/${submissionType}/signatures/signature-${userId}-${timestamp}.png`
        
        // Upload signature to blob storage
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        })
        
        // Replace base64 data with blob URL
        processedFormData = { ...formData, signature: signatureBlob.url }
      } catch (error) {
        console.error('Signature upload error:', error)
        return NextResponse.json(
          { error: 'Signature upload failed' },
          { status: 500 }
        )
      }
    }

    // Build update object with only provided fields
    const updateData: any = {}
    if (completedBy !== undefined) updateData.completedBy = completedBy
    if (date !== undefined) updateData.date = date
    if (dateTimeClocked !== undefined) {
      updateData.dateTimeClocked = dateTimeClocked ? new Date(dateTimeClocked) : null
    }
    if (company !== undefined) updateData.company = company
    if (projectName !== undefined) updateData.projectName = projectName
    if (processedFormData !== undefined) updateData.formData = processedFormData

    // Update the submission
    const updatedSubmission = await db.update(submissions)
      .set(updateData)
      .where(eq(submissions.id, id))
      .returning()

    // Send SSE event about the updated submission
    const targetUserId = auth.isAdmin ? existingSubmission[0].userId : auth.userId!
    sendEventToUser(targetUserId, 'submission_updated', {
      submissionId: id,
      submissionType: existingSubmission[0].submissionType,
      date: updatedSubmission[0].date,
      projectName: updatedSubmission[0].projectName,
      updatedByAdmin: auth.isAdmin
    })

    return NextResponse.json({
      success: true,
      submission: updatedSubmission[0],
      message: 'Submission updated successfully'
    })

  } catch (error) {
    console.error('Update submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}