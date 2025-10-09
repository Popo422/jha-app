import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { put, del, list } from '@vercel/blob'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

// Helper function to authenticate admin requests
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (!adminToken) {
    throw new Error('Admin authentication required')
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token')
    }
    return { admin: decoded.admin }
  } catch (error) {
    throw new Error('Invalid admin token')
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any }
    try {
      auth = authenticateAdmin(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const processUrl = formData.get('url') as string

    // Must provide either file or URL
    if (!file && !processUrl) {
      return NextResponse.json({ 
        error: 'Either file or URL must be provided' 
      }, { status: 400 })
    }

    let fileUrl: string
    let filename: string

    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg', 
        'image/jpg', 
        'image/png',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ 
          error: 'Invalid file type. Only PDF, Excel, CSV, and image files are allowed.' 
        }, { status: 400 })
      }

      // Validate file size (50MB limit for schedules)
      const maxSize = 50 * 1024 * 1024 // 50MB in bytes
      if (file.size > maxSize) {
        return NextResponse.json({ 
          error: 'File too large. Maximum size is 50MB.' 
        }, { status: 400 })
      }

      const companyId = auth.admin?.companyId
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }

      // Clean up any existing temp files for this company before uploading new one
      const tempPrefix = `temp-schedules/${companyId}/`
      try {
        const existingFiles = await list({ prefix: tempPrefix })
        if (existingFiles.blobs.length > 0) {
          console.log(`Cleaning up ${existingFiles.blobs.length} existing temp files`)
          await Promise.all(
            existingFiles.blobs.map(blob => del(blob.url))
          )
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup existing temp files:', cleanupError)
        // Continue with upload even if cleanup fails
      }

      // Create a unique filename in temp directory
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      filename = `temp-schedules/${companyId}/${timestamp}.${fileExtension}`

      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
      })

      fileUrl = blob.url
    } else {
      // Process URL
      fileUrl = processUrl
      filename = processUrl.split('/').pop() || 'external-file'
    }

    // Return file info - the actual AI processing will be done in a separate endpoint
    return NextResponse.json({ 
      success: true, 
      fileUrl,
      filename,
      message: 'File uploaded successfully. Use the extract-tasks endpoint to process it.',
      nextStep: {
        endpoint: '/api/admin/project-tasks/extract-tasks',
        method: 'POST',
        body: {
          fileUrl,
          projectId: 'your-project-id' // Client needs to provide this
        }
      }
    })

  } catch (error) {
    console.error('Upload schedule file error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload file' 
    }, { status: 500 })
  }
}