import { NextRequest, NextResponse } from 'next/server'
import { validateAdminSession } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { submissions, subcontractors } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { put } from '@vercel/blob'

interface IncidentFormData {
  reportedBy: string
  injuredEmployee: string
  dateOfIncident: string
  description?: string
  injuryType?: string
  bodyPart?: string
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  status: 'reported' | 'investigating' | 'closed'
  uploadedFiles?: { filename: string; url: string }[]
  [key: string]: any
}

export async function POST(request: NextRequest) {
  try {
    // Validate admin session
    const validation = await validateAdminSession(request)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status })
    }

    const companyId = validation.company?.id
    const userId = validation.admin?.id

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
    const severityValue = formData.get('severity') as string || 'minor'
    const severity = ['minor', 'moderate', 'major', 'critical'].includes(severityValue) 
      ? severityValue as 'minor' | 'moderate' | 'major' | 'critical'
      : 'minor'
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

    // Handle file uploads - use admin's companyId or a default path for admin uploads
    const files = formData.getAll('files') as File[]
    const uploadedFiles: { filename: string; url: string }[] = []
    const uploadCompanyId = companyId || 'admin' // Fallback to 'admin' for admin uploads

    for (const file of files) {
      if (file.size > 0) {
        try {
          // Create company-specific path: companyId/incidents/filename
          const timestamp = Date.now()
          const fileExtension = file.name.split('.').pop()
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const blobPath = `${uploadCompanyId}/incidents/${timestamp}_${cleanFileName}`
          
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
        const timestamp = Date.now()
        const signaturePath = `${uploadCompanyId}/incidents/signatures/${timestamp}_signature.${mimeType.split('/')[1]}`
        
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          addRandomSuffix: false,
          contentType: mimeType,
        })
        
        // Replace base64 data with blob URL
        incidentFormData.signature = signatureBlob.url
      } catch (error) {
        console.error('Signature upload error:', error)
        // Continue without signature upload
      }
    }

    // Use admin's company ID and the selected subcontractor name
    if (!companyId) {
      return NextResponse.json(
        { error: 'Admin company not found' },
        { status: 400 }
      )
    }

    // Insert incident into database
    try {
      const result = await db.insert(submissions).values({
        userId: userId,
        companyId: companyId, // Admin's company ID
        completedBy: reportedBy,
        date: new Date().toISOString(),
        company: company, // Subcontractor name (text)
        projectName: projectName,
        submissionType: incidentType,
        formData: incidentFormData,
      }).returning({ id: submissions.id, createdAt: submissions.createdAt })

      const submissionId = result[0].id

      return NextResponse.json({ 
        success: true, 
        id: submissionId,
        message: 'Incident created successfully'
      })
    } catch (error) {
      console.error('Database insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create incident' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Incident creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}