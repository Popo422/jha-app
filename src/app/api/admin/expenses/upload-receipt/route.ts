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

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'application/pdf'
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB (matching project tasks)

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
    const url = formData.get('url') as string

    if (!file && !url) {
      return NextResponse.json({ 
        error: 'Either file or URL is required' 
      }, { status: 400 })
    }

    if (file) {
      // Validate file
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json({
          error: 'Invalid file type. Only JPG, PNG, and PDF files are allowed.'
        }, { status: 400 })
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: 'File size too large. Maximum size is 50MB.'
        }, { status: 400 })
      }

      const companyId = auth.admin?.companyId
      if (!companyId) {
        return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
      }

      // Clean up any existing temp receipt files for this company before uploading new one
      const tempPrefix = `temp-receipts/${companyId}/`
      try {
        const existingFiles = await list({ prefix: tempPrefix })
        if (existingFiles.blobs.length > 0) {
          console.log(`Cleaning up ${existingFiles.blobs.length} existing temp receipt files`)
          await Promise.all(
            existingFiles.blobs.map(blob => del(blob.url))
          )
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup existing temp receipt files:', cleanupError)
        // Continue with upload even if cleanup fails
      }

      // Create a unique filename in temp directory
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `temp-receipts/${companyId}/${timestamp}.${fileExtension}`
      
      // Upload to Vercel Blob
      const blobKey = fileName
      
      const blob = await put(blobKey, file, {
        access: 'public',
      })

      return NextResponse.json({
        success: true,
        fileUrl: blob.url,
        filename: fileName,
        message: 'Receipt uploaded successfully. Use the extract-expenses endpoint to process it.',
        nextStep: {
          endpoint: '/api/admin/expenses/extract-expenses',
          method: 'POST',
          payload: { fileUrl: blob.url }
        }
      })
    }

    if (url) {
      // For URL uploads, just validate and return the URL
      try {
        const urlObject = new URL(url)
        if (!['http:', 'https:'].includes(urlObject.protocol)) {
          throw new Error('Invalid protocol')
        }

        return NextResponse.json({
          success: true,
          fileUrl: url,
          filename: url.split('/').pop() || 'receipt',
          message: 'Receipt URL validated successfully'
        })
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid URL provided'
        }, { status: 400 })
      }
    }

    return NextResponse.json({ 
      error: 'No valid file or URL provided' 
    }, { status: 400 })

  } catch (error: any) {
    console.error('Error uploading receipt:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}