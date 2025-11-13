import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { validateAdminSession } from '@/lib/auth-utils'

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/vnd.autocad.dwg',
  'image/vnd.dwg',
  'application/acad'
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string
    const category = formData.get('category') as string || 'Other'
    const description = formData.get('description') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed types: PDF, Word, Excel, PowerPoint, Images, Text, ZIP, RAR, 7Z, DWG files.' 
      }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB.' 
      }, { status: 400 })
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    // Create a unique filename with path structure: companyId/projects/projectId/documents/filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const blobKey = `${companyId}/projects/${projectId}/documents/${timestamp}_${sanitizedFileName}`

    // Upload to Vercel Blob
    const blob = await put(blobKey, file, {
      access: 'public',
    })

    // Extract file type from extension
    const fileType = fileExtension?.toLowerCase() || 'unknown'

    return NextResponse.json({ 
      success: true, 
      fileData: {
        name: file.name,
        description,
        category,
        fileType,
        fileSize: file.size,
        url: blob.url,
        blobKey: blobKey
      }
    })

  } catch (error) {
    console.error('Upload project document error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload document' 
    }, { status: 500 })
  }
}

// Bulk upload endpoint
export async function PUT(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const formData = await request.formData()
    const projectId = formData.get('projectId') as string
    const category = formData.get('category') as string || 'Other'
    const description = formData.get('description') as string || ''

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get all files from FormData
    const files: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('files[') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 20) {
      return NextResponse.json({ error: 'Maximum 20 files allowed per bulk upload' }, { status: 400 })
    }

    const companyId = auth.admin.companyId
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 })
    }

    const uploadResults = []
    const errors = []

    for (const file of files) {
      try {
        // Validate each file
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type`)
          continue
        }

        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File too large (max 50MB)`)
          continue
        }

        // Create unique filename
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        const fileExtension = file.name.split('.').pop()
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const blobKey = `${companyId}/projects/${projectId}/documents/${timestamp}_${randomSuffix}_${sanitizedFileName}`

        // Upload to Vercel Blob
        const blob = await put(blobKey, file, {
          access: 'public',
        })

        // Extract file type from extension
        const fileType = fileExtension?.toLowerCase() || 'unknown'

        uploadResults.push({
          name: file.name,
          description,
          category,
          fileType,
          fileSize: file.size,
          url: blob.url,
          blobKey: blobKey
        })

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        errors.push(`${file.name}: Upload failed`)
      }
    }

    return NextResponse.json({ 
      success: true, 
      uploadedFiles: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: files.length,
        successful: uploadResults.length,
        failed: errors.length
      }
    })

  } catch (error) {
    console.error('Bulk upload project documents error:', error)
    return NextResponse.json({ 
      error: 'Failed to upload documents' 
    }, { status: 500 })
  }
}