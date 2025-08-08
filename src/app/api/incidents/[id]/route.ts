import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, or } from 'drizzle-orm'
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const incidentId = resolvedParams.id

    // Build conditions based on user type - only incident reports
    const conditions = [
      eq(submissions.id, incidentId),
      or(
        eq(submissions.submissionType, 'incident-report'),
        eq(submissions.submissionType, 'quick-incident-report')
      )
    ]
    
    // If admin, filter by company ID
    if (auth.isAdmin && auth.admin?.companyId) {
      conditions.push(eq(submissions.companyId, auth.admin.companyId))
    }
    // If not admin, filter by user ID
    else if (!auth.isAdmin && auth.userId) {
      conditions.push(eq(submissions.userId, auth.userId))
    }

    // Get the incident
    const result = await db.select().from(submissions)
      .where(and(...conditions))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      )
    }

    const submission = result[0]
    
    // Transform to incident format
    const formData = submission.formData as IncidentFormData
    const incident = {
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
      witnessName: formData?.witnessName || '',
      witnessStatement: formData?.witnessStatement || '',
      immediateAction: formData?.immediateAction || '',
      rootCause: formData?.rootCause || '',
      preventiveMeasures: formData?.preventiveMeasures || '',
      severity: formData?.severity || 'minor',
      status: formData?.status || 'reported',
      attachments: formData?.uploadedFiles?.map((file: any) => file.url) || [],
      formData: submission.formData,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt
    }

    return NextResponse.json({
      incident
    })

  } catch (error) {
    console.error('Get incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const incidentId = resolvedParams.id

    // Parse request body
    const body = await request.json()
    const { 
      reportedBy, 
      injuredEmployee, 
      projectName, 
      dateOfIncident, 
      company,
      description,
      injuryType,
      bodyPart,
      witnessName,
      witnessStatement,
      immediateAction,
      rootCause,
      preventiveMeasures,
      severity,
      status,
      formData 
    } = body

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
        { error: auth.isAdmin ? 'Incident not found' : 'Incident not found or you do not have permission to edit it' },
        { status: 404 }
      )
    }

    // Merge existing formData with updates
    const existingFormData = (existingIncident[0].formData as IncidentFormData) || {}
    let updatedFormData = { ...existingFormData }

    // Update form data fields if provided
    if (reportedBy !== undefined) updatedFormData.reportedBy = reportedBy
    if (injuredEmployee !== undefined) updatedFormData.injuredEmployee = injuredEmployee
    if (description !== undefined) updatedFormData.description = description
    if (injuryType !== undefined) updatedFormData.injuryType = injuryType
    if (bodyPart !== undefined) updatedFormData.bodyPart = bodyPart
    if (witnessName !== undefined) updatedFormData.witnessName = witnessName
    if (witnessStatement !== undefined) updatedFormData.witnessStatement = witnessStatement
    if (immediateAction !== undefined) updatedFormData.immediateAction = immediateAction
    if (rootCause !== undefined) updatedFormData.rootCause = rootCause
    if (preventiveMeasures !== undefined) updatedFormData.preventiveMeasures = preventiveMeasures
    if (severity !== undefined) updatedFormData.severity = severity
    if (status !== undefined) updatedFormData.status = status
    if (formData !== undefined) updatedFormData = { ...updatedFormData, ...formData }

    // Handle signature upload if present in formData
    if (updatedFormData.signature && updatedFormData.signature.startsWith('data:image/')) {
      try {
        // Convert base64 signature to blob
        const base64Data = updatedFormData.signature.split(',')[1]
        const mimeType = updatedFormData.signature.split(';')[0].split(':')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Create company-specific path for signature
        const timestamp = Date.now()
        const userId = auth.userId || existingIncident[0].userId
        const companyId = existingIncident[0].companyId
        const signaturePath = `${companyId}/incidents/signatures/signature-${userId}-${timestamp}.png`
        
        // Upload signature to blob storage
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        })
        
        // Replace base64 data with blob URL
        updatedFormData.signature = signatureBlob.url
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
    if (reportedBy !== undefined) updateData.completedBy = reportedBy
    if (dateOfIncident !== undefined) updateData.date = dateOfIncident
    if (company !== undefined) updateData.company = company
    if (projectName !== undefined) updateData.projectName = projectName
    updateData.formData = updatedFormData

    // Update the incident
    const updatedIncident = await db.update(submissions)
      .set(updateData)
      .where(eq(submissions.id, incidentId))
      .returning()

    // Send SSE event about the updated incident
    const targetUserId = auth.isAdmin ? existingIncident[0].userId : auth.userId!
    sendEventToUser(targetUserId, 'incident_updated', {
      submissionId: incidentId,
      submissionType: existingIncident[0].submissionType,
      date: updatedIncident[0].date,
      projectName: updatedIncident[0].projectName,
      injuredEmployee: updatedFormData.injuredEmployee || updatedFormData.injuredParty || updatedFormData.injuredPerson,
      updatedByAdmin: auth.isAdmin
    })

    // Transform updated result to incident format
    const incident = {
      id: updatedIncident[0].id,
      reportedBy: updatedIncident[0].completedBy,
      injuredEmployee: updatedFormData.injuredEmployee || updatedFormData.injuredParty || updatedFormData.injuredPerson || '',
      projectName: updatedIncident[0].projectName,
      dateReported: updatedIncident[0].createdAt,
      dateOfIncident: updatedIncident[0].date,
      incidentType: updatedIncident[0].submissionType as 'incident-report' | 'quick-incident-report',
      company: updatedIncident[0].company,
      description: updatedFormData.description || '',
      injuryType: updatedFormData.injuryType || '',
      bodyPart: updatedFormData.bodyPart || '',
      witnessName: updatedFormData.witnessName || '',
      witnessStatement: updatedFormData.witnessStatement || '',
      immediateAction: updatedFormData.immediateAction || '',
      rootCause: updatedFormData.rootCause || '',
      preventiveMeasures: updatedFormData.preventiveMeasures || '',
      severity: updatedFormData.severity || 'minor',
      status: updatedFormData.status || 'reported',
      attachments: updatedFormData.uploadedFiles?.map((file: any) => file.url) || [],
      formData: updatedFormData,
      createdAt: updatedIncident[0].createdAt,
      updatedAt: updatedIncident[0].updatedAt
    }

    return NextResponse.json({
      success: true,
      incident,
      message: 'Incident updated successfully'
    })

  } catch (error) {
    console.error('Update incident error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const resolvedParams = await params
    const incidentId = resolvedParams.id

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
    if (!auth.isAdmin && auth.userId) {
      sendEventToUser(auth.userId, 'incident_deleted', {
        submissionId: incidentId,
        submissionType: existingIncident[0].submissionType,
        date: existingIncident[0].date,
        projectName: existingIncident[0].projectName,
        injuredEmployee: (existingIncident[0].formData as IncidentFormData)?.injuredEmployee || (existingIncident[0].formData as IncidentFormData)?.injuredParty || (existingIncident[0].formData as IncidentFormData)?.injuredPerson
      })
    } else if (auth.isAdmin) {
      // Send SSE event to the original submission owner if admin is deleting
      sendEventToUser(existingIncident[0].userId, 'incident_deleted', {
        submissionId: incidentId,
        submissionType: existingIncident[0].submissionType,
        date: existingIncident[0].date,
        projectName: existingIncident[0].projectName,
        injuredEmployee: (existingIncident[0].formData as IncidentFormData)?.injuredEmployee || (existingIncident[0].formData as IncidentFormData)?.injuredParty || (existingIncident[0].formData as IncidentFormData)?.injuredPerson,
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