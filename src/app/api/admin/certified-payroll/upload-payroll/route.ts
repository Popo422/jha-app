import { NextRequest, NextResponse } from 'next/server';
import { put, del, list } from '@vercel/blob';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AdminTokenPayload {
  admin: {
    id: string;
    employeeId: string;
    name: string;
    role: string;
    companyId: string;
  };
  isAdmin: boolean;
  iat: number;
  exp: number;
}

function authenticateAdmin(request: NextRequest): { admin: AdminTokenPayload['admin'] } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (!adminToken) {
    throw new Error('Admin authentication required');
  }
  
  const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload;
  if (!decoded.admin || !decoded.isAdmin) {
    throw new Error('Invalid admin token');
  }
  
  return { admin: decoded.admin };
}

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateAdmin(request);
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const url = formData.get('url') as string;

    if (!file && !url) {
      return NextResponse.json(
        { error: 'Either file or url must be provided' },
        { status: 400 }
      );
    }

    // Validate file type for PDF and images
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Only PDF and image files (JPEG, PNG, WebP) are allowed for payroll documents' },
          { status: 400 }
        );
      }

      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size must be less than 50MB' },
          { status: 400 }
        );
      }
    }

    const companyId = auth.admin.companyId;
    const tempPrefix = `temp-payroll/${companyId}/`;

    // Clean up existing temp files for this company
    try {
      const { blobs } = await list({ prefix: tempPrefix });
      if (blobs.length > 0) {
        const deletePromises = blobs.map(async (blob) => {
          try {
            await del(blob.url);
          } catch (deleteError) {
            console.warn('Failed to delete temp file:', blob.url, deleteError);
          }
        });
        await Promise.allSettled(deletePromises);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }

    let fileToUpload: File;
    let fileName: string;

    if (file) {
      fileToUpload = file;
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop() || 'pdf';
      fileName = `${tempPrefix}${timestamp}.${fileExtension}`;
    } else if (url) {
      // Handle URL upload
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch file from URL' },
            { status: 400 }
          );
        }

        const contentType = response.headers.get('content-type');
        const allowedContentTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const isValidType = allowedContentTypes.some(type => contentType?.includes(type));
        
        if (!isValidType) {
          return NextResponse.json(
            { error: 'URL must point to a PDF or image file (JPEG, PNG, WebP)' },
            { status: 400 }
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Check file size
        const maxSize = 50 * 1024 * 1024;
        if (buffer.length > maxSize) {
          return NextResponse.json(
            { error: 'File size must be less than 50MB' },
            { status: 400 }
          );
        }

        // Determine file extension based on content type
        const getExtensionFromContentType = (contentType: string | null): string => {
          if (contentType?.includes('application/pdf')) return 'pdf';
          if (contentType?.includes('image/jpeg') || contentType?.includes('image/jpg')) return 'jpg';
          if (contentType?.includes('image/png')) return 'png';
          if (contentType?.includes('image/webp')) return 'webp';
          return 'pdf'; // fallback
        };

        const fileExtension = getExtensionFromContentType(contentType);
        const fileName_base = fileExtension === 'pdf' ? 'payroll-document' : 'payroll-image';

        fileToUpload = new File([buffer], `${fileName_base}.${fileExtension}`, {
          type: contentType || 'application/pdf'
        });

        const timestamp = Date.now();
        fileName = `${tempPrefix}${timestamp}.${fileExtension}`;
      } catch (fetchError) {
        console.error('Error fetching file from URL:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch file from the provided URL' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'No valid file or URL provided' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const blob = await put(fileName, fileToUpload, {
      access: 'public',
    });

    return NextResponse.json({
      success: true,
      fileUrl: blob.url,
      fileName: fileName.split('/').pop(),
      message: 'Payroll document uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading payroll document:', error);
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}