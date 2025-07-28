import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toolboxTalkReadEntries, contractors, companies } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { put } from '@vercel/blob';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// Helper function to authenticate request (supports both contractor and admin)
function authenticateRequest(request: NextRequest): { isAdmin: boolean; companyId?: string; userId?: string; userName?: string } {
  // Try admin token first
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
      if (decoded.admin && decoded.isAdmin) {
        return { 
          isAdmin: true, 
          companyId: decoded.admin.companyId,
          userId: decoded.admin.id,
          userName: decoded.admin.name
        };
      }
    } catch (error) {
      // Continue to try contractor token
    }
  }

  // Try contractor token
  const contractorToken = request.cookies.get('authToken')?.value || 
                         (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                          request.headers.get('Authorization')?.replace('Bearer ', '') : null);

  if (contractorToken) {
    try {
      const decoded = jwt.verify(contractorToken, JWT_SECRET) as any;
      return { 
        isAdmin: false, 
        companyId: decoded.contractor?.companyId,
        userId: decoded.user?.id,
        userName: decoded.user?.name
      };
    } catch (error) {
      throw new Error('Invalid contractor token');
    }
  }

  throw new Error('No valid authentication token found');
}

// GET - Fetch toolbox talk read entries (supports both contractor and admin)
export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    let auth;
    try {
      auth = authenticateRequest(request);
    } catch (error) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || auth.companyId;
    const toolboxTalkId = searchParams.get('toolboxTalkId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Ensure user can only access their own company's data
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build query conditions
    const conditions = [eq(toolboxTalkReadEntries.companyId, companyId)];
    if (toolboxTalkId) {
      conditions.push(eq(toolboxTalkReadEntries.toolboxTalkId, toolboxTalkId));
    }

    // Get read entries with optional toolbox talk ID filter
    const readEntries = await db
      .select()
      .from(toolboxTalkReadEntries)
      .where(and(...conditions))
      .orderBy(desc(toolboxTalkReadEntries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalQuery = await db
      .select({ count: toolboxTalkReadEntries.id })
      .from(toolboxTalkReadEntries)
      .where(and(...conditions));
    
    const total = totalQuery.length;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      readEntries,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching toolbox talk read entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch read entries' },
      { status: 500 }
    );
  }
}

// POST - Create a new toolbox talk read entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolboxTalkId, companyId, readBy, dateRead, signature } = body;
     // Validate required fields
    if (!toolboxTalkId || !companyId || !readBy || !dateRead || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    let modifiedSignature = signature;
      if (signature && signature.startsWith('data:image/')) {
      try {
        // Convert base64 signature to blob
        const base64Data = signature.split(',')[1]
        const mimeType = signature.split(';')[0].split(':')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        
        // Create company-specific path for signature
        const timestamp = Date.now()
        const signaturePath = `${companyId}/${`toolbox-talks`}/${toolboxTalkId}/signatures/signature-${readBy}-${timestamp}.png`
        
        // Upload signature to blob storage
        const signatureBlob = await put(signaturePath, buffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
        })
        
        // Replace base64 data with blob URL
        modifiedSignature = signatureBlob.url
      } catch (error) {
        console.error('Signature upload error:', error)
        return NextResponse.json(
          { error: 'Signature upload failed' },
          { status: 500 }
        )
      }
    }
   

    // Check if this person has already read this toolbox talk
    const existingEntry = await db
      .select()
      .from(toolboxTalkReadEntries)
      .where(
        and(
          eq(toolboxTalkReadEntries.toolboxTalkId, toolboxTalkId),
          eq(toolboxTalkReadEntries.readBy, readBy),
          eq(toolboxTalkReadEntries.companyId, companyId)
        )
      )
      .limit(1);

    if (existingEntry.length > 0) {
      return NextResponse.json(
        { error: 'You have already marked this toolbox talk as read' },
        { status: 409 }
      );
    }

    // Create the read entry
    const [newEntry] = await db
      .insert(toolboxTalkReadEntries)
      .values({
        toolboxTalkId,
        companyId,
        readBy,
        dateRead,
        signature: modifiedSignature,
      })
      .returning();

    return NextResponse.json({
      message: 'Toolbox talk marked as read successfully',
      readEntry: newEntry,
    });

  } catch (error) {
    console.error('Error creating toolbox talk read entry:', error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'You have already marked this toolbox talk as read' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create read entry' },
      { status: 500 }
    );
  }
}