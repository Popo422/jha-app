import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, gte, lte, or, ilike, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { submissions } from '@/lib/db/schema'
import { put } from '@vercel/blob'
import { sendEventToUser } from '@/lib/sse-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

interface IncidentFormData {
  injuredEmployee?: string
  injuredParty?: string
  description?: string
  injuryType?: string
  bodyPart?: string
  witnessName?: string
  witnessStatement?: string
  immediateAction?: string
  rootCause?: string
  preventiveMeasures?: string
  severity?: string
  status?: string
  uploadedFiles?: Array<{ filename: string; url: string }>
  signature?: string
  [key: string]: any
}

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
    const reportedBy = formData.get('reportedBy') as string
    const injuredEmployee = formData.get('injuredEmployee') as string
    const projectName = formData.get('projectName') as string
    const dateOfIncident = formData.get('dateOfIncident') as string
    const incidentType = formData.get('incidentType') as string
    const company = formData.get('company') as string
    const description = formData.get('description') as string
    const injuryType = formData.get('injuryType') as string
    const bodyPart = formData.get('bodyPart') as string
    const severity = formData.get('severity') as string || 'minor'
    const formDataJson = formData.get('formData') as string

    // Validate required fields
    if (!reportedBy || !injuredEmployee || !projectName || !dateOfIncident || !incidentType || !company) {
      return NextResponse.json(
        { error: 'Missing required fields: reportedBy, injuredEmployee, projectName, dateOfIncident, incidentType, company' },
        { status: 400 }
      )
    }

    if (!['incident-report', 'quick-incident-report'].includes(incidentType)) {
      return NextResponse.json(
        { error: 'Invalid incident type' },
        { status: 400 }
      )
    }

    let parsedFormData = {}
    if (formDataJson) {
      try {
        parsedFormData = JSON.parse(formDataJson)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid form data JSON' },
          { status: 400 }
        )
      }
    }

    // Handle file uploads
    const files = formData.getAll('files') as File[]
    const uploadedFiles: { filename: string; url: string }[] = []
    const companyId = decoded.contractor.companyId

    for (const file of files) {
      if (file.size > 0) {
        try {
          // Create company-specific path: companyId/incidents/filename
          const timestamp = Date.now()
          const fileExtension = file.name.split('.').pop()
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const blobPath = `${companyId}/incidents/${timestamp}_${cleanFileName}`
          
          const blob = await put(blobPath, file, {
            access: 'public',
            addRandomSuffix: false,
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

    // Build incident form data
    const incidentFormData: IncidentFormData = {
      ...parsedFormData,
      reportedBy,
      injuredEmployee,
      dateOfIncident,
      description,
      injuryType,
      bodyPart,
      severity,
      status: 'reported',
      uploadedFiles
    }

    // Handle signature upload if present
    if (incidentFormData.signature && incidentFormData.signature.startsWith('data:image/')) {
      try {
        // Convert base64 signature to blob
        const base64Data = incidentFormData.signature.split(',')[1]
        const mimeType = incidentFormData.signature.split(';')[0].split(':')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Create company-specific path for signature
        const timestamp = Date.now()
        const signaturePath = `${companyId}/incidents/signatures/signature-${decoded.user.id}-${timestamp}.png`
        
        // Upload signature to blob storage
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        })
        
        // Replace base64 data with blob URL
        incidentFormData.signature = signatureBlob.url
      } catch (error) {
        console.error('Signature upload error:', error)
        return NextResponse.json(
          { error: 'Signature upload failed' },
          { status: 500 }
        )
      }
    }

    // Create incident submission record using existing submissions table
    const submission = await db.insert(submissions).values({
      userId: decoded.user.id,
      companyId: decoded.contractor.companyId,
      completedBy: reportedBy,
      date: dateOfIncident,
      dateTimeClocked: new Date(),
      company: company,
      projectName: projectName,
      submissionType: incidentType,
      formData: incidentFormData,
    }).returning()

    // Send SSE event to user about the new incident
    sendEventToUser(decoded.user.id, 'incident_created', {
      submissionType: incidentType,
      date: dateOfIncident,
      projectName: projectName,
      submissionId: submission[0].id,
      injuredEmployee: injuredEmployee
    })

    return NextResponse.json({
      success: true,
      incident: {
        id: submission[0].id,
        reportedBy,
        injuredEmployee,
        projectName,
        dateReported: submission[0].createdAt,
        dateOfIncident,
        incidentType,
        company,
        description,
        severity,
        status: 'reported',
        createdAt: submission[0].createdAt,
        updatedAt: submission[0].updatedAt,
        formData: incidentFormData
      }
    })

  } catch (error) {
    console.error('Incident creation error:', error)
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

    // Get query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const limit = fetchAll ? undefined : pageSize;
    const offset = fetchAll ? undefined : (page - 1) * pageSize;
    const incidentType = searchParams.get('incidentType')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const company = searchParams.get('company')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const search = searchParams.get('search')

    // Build query conditions - only get incident reports
    const conditions = [
      or(
        eq(submissions.submissionType, 'incident-report'),
        eq(submissions.submissionType, 'quick-incident-report')
      )
    ]
    
    // If admin, filter by company ID
    if (auth.isAdmin && auth.admin?.companyId) {
      conditions.push(eq(submissions.companyId, auth.admin.companyId))
    }
    // If not admin, filter by user ID for user's own submissions only
    else if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }
    
    // Add incident type filter if specified
    if (incidentType) {
      conditions.push(eq(submissions.submissionType, incidentType))
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
          sql`${submissions.formData}->>'injuredEmployee' ILIKE ${`%${search}%`}`,
          sql`${submissions.formData}->>'description' ILIKE ${`%${search}%`}`
        )
      )
    }

    // Add status filter if specified (stored in formData)
    if (status) {
      conditions.push(sql`${submissions.formData}->>'status' = ${status}`)
    }

    // Add severity filter if specified (stored in formData)
    if (severity) {
      conditions.push(sql`${submissions.formData}->>'severity' = ${severity}`)
    }

    // Get total count for pagination
    const countResult = await db.select({ count: sql`count(*)` }).from(submissions)
      .where(and(...conditions))
    const totalCount = Number(countResult[0].count)

    // Execute query
    const baseQuery = db.select().from(submissions)
      .where(and(...conditions))
      .orderBy(desc(submissions.createdAt));
    
    const result = fetchAll
      ? await baseQuery
      : await baseQuery.limit(limit!).offset(offset!);

    // Transform results to incident format
    const incidents = result.map(submission => {
      const formData = submission.formData as IncidentFormData
      return {
        id: submission.id,
        reportedBy: submission.completedBy,
        injuredEmployee: formData?.injuredEmployee || formData?.injuredParty || formData?.injuredPerson || '',
        projectName: submission.projectName,
        dateReported: submission.createdAt,
        dateOfIncident: submission.date,
        incidentType: submission.submissionType as 'incident-report' | 'quick-incident-report',
        company: submission.company,
        description: formData?.description || '',
        injuryType: formData?.injuryType || '',
        bodyPart: formData?.bodyPart || '',
        severity: formData?.severity || 'minor',
        status: formData?.status || 'reported',
        attachments: formData?.uploadedFiles?.map((file: any) => file.url) || [],
        formData: submission.formData,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      }
    })

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      incidents,
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
    console.error('Get incidents error:', error)
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

    // Get incident ID from URL path
    const incidentId = searchParams.get('id') || request.url.split('/').pop()

    if (!incidentId) {
      return NextResponse.json(
        { error: 'Incident ID is required' },
        { status: 400 }
      )
    }

    // Build conditions based on user type - only incident reports
    const conditions = [
      eq(submissions.id, incidentId),
      or(
        eq(submissions.submissionType, 'incident-report'),
        eq(submissions.submissionType, 'quick-incident-report')
      )
    ]
    
    // If not admin, also check that the submission belongs to the user
    if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }

    // First check if the incident exists (and belongs to user if not admin)
    const existingIncident = await db.select().from(submissions)
      .where(and(...conditions))
      .limit(1)

    if (existingIncident.length === 0) {
      return NextResponse.json(
        { error: auth.isAdmin ? 'Incident not found' : 'Incident not found or you do not have permission to delete it' },
        { status: 404 }
      )
    }

    // Delete the incident
    await db.delete(submissions)
      .where(eq(submissions.id, incidentId))

    // Send SSE event about the deleted incident
    const existingFormData = existingIncident[0].formData as IncidentFormData
    if (!auth.isAdmin && auth.userId) {
      sendEventToUser(auth.userId, 'incident_deleted', {
        submissionId: incidentId,
        submissionType: existingIncident[0].submissionType,
        date: existingIncident[0].date,
        projectName: existingIncident[0].projectName,
        injuredEmployee: existingFormData?.injuredEmployee || existingFormData?.injuredParty || existingFormData?.injuredPerson
      })
    } else if (auth.isAdmin) {
      // Send SSE event to the original submission owner if admin is deleting
      sendEventToUser(existingIncident[0].userId, 'incident_deleted', {
        submissionId: incidentId,
        submissionType: existingIncident[0].submissionType,
        date: existingIncident[0].date,
        projectName: existingIncident[0].projectName,
        injuredEmployee: existingFormData?.injuredEmployee || existingFormData?.injuredParty || existingFormData?.injuredPerson,
        deletedByAdmin: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Incident deleted successfully'
    })

  } catch (error) {
    console.error('Delete incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}