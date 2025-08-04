import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Helper function to authenticate admin
function authenticateAdmin(request: NextRequest): { admin: any } {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (!adminToken) {
    throw new Error('No admin authentication token found');
  }

  try {
    const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
    if (!decoded.admin || !decoded.isAdmin) {
      throw new Error('Invalid admin token');
    }
    return { admin: decoded.admin };
  } catch (error) {
    throw new Error('Invalid admin token');
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate admin
    let auth: { admin: any };
    try {
      auth = authenticateAdmin(request);
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const logoFile = formData.get('logo') as File;
    const companyId = formData.get('companyId') as string;
    const currentLogoUrl = formData.get('currentLogoUrl') as string;
    const removeLogo = formData.get('removeLogo') === 'true';

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Verify admin belongs to this company
    if (auth.admin.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Unauthorized - can only update your own company logo' },
        { status: 403 }
      );
    }

    let newLogoUrl: string | null = null;

    // Handle logo removal
    if (removeLogo) {
      // Delete old logo from Vercel Blob if it exists
      if (currentLogoUrl) {
        try {
          await del(currentLogoUrl);
        } catch (error) {
          console.warn('Failed to delete old logo from Vercel Blob:', error);
          // Continue anyway - database update is more important
        }
      }
      newLogoUrl = null;
    } 
    // Handle logo upload
    else if (logoFile) {
      // Validate file type
      if (!logoFile.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File must be an image' },
          { status: 400 }
        );
      }

      // Validate file size (max 5MB)
      if (logoFile.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Image file size must be less than 5MB' },
          { status: 400 }
        );
      }

      // Delete old logo from Vercel Blob if it exists
      if (currentLogoUrl) {
        try {
          await del(currentLogoUrl);
        } catch (error) {
          console.warn('Failed to delete old logo from Vercel Blob:', error);
          // Continue anyway - we still want to upload the new logo
        }
      }

      // Generate a unique filename
      const fileExtension = logoFile.name.split('.').pop() || 'png';
      const fileName = `company-logos/${companyId}-${Date.now()}.${fileExtension}`;

      // Upload to Vercel Blob
      const blob = await put(fileName, logoFile, {
        access: 'public',
      });

      newLogoUrl = blob.url;
    } else {
      return NextResponse.json(
        { error: 'Either provide a logo file or set removeLogo to true' },
        { status: 400 }
      );
    }

    // Update company logo URL in database
    await db.update(companies)
      .set({
        logoUrl: newLogoUrl,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId));

    // Generate new JWT token with updated admin data (matching login format)
    const updatedAdmin = {
      ...auth.admin,
      companyLogoUrl: newLogoUrl
    };

    const tokenPayload = {
      admin: updatedAdmin,
      isAdmin: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours (matching login)
    };

    const newToken = jwt.sign(tokenPayload, JWT_SECRET);

    // Create response with updated token in cookie
    const response = NextResponse.json({
      success: true,
      logoUrl: newLogoUrl,
      message: 'Company logo updated successfully'
    });

    // Set the updated token in cookie (matching login settings)
    response.cookies.set('adminAuthToken', newToken, {
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours (matching login)
      httpOnly: false, // Allow client-side access (matching login)
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Error updating company logo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}