import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { timesheets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || '';

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

interface ContractorTokenPayload {
  contractor: {
    id: string;
    email: string;
    name: string;
    companyId: string;
  };
  isContractor: boolean;
  iat: number;
  exp: number;
}

function authenticateRequest(request: NextRequest, authType?: 'contractor' | 'admin' | 'any') {
  // Try admin token first (from cookie or header)
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null);

  // Try contractor token (from cookie or header)
  const contractorToken = request.cookies.get('contractorAuthToken')?.value ||
                         (request.headers.get('Authorization')?.startsWith('ContractorBearer ') ? 
                          request.headers.get('Authorization')?.replace('ContractorBearer ', '') : null) ||
                         (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                          request.headers.get('Authorization')?.replace('Bearer ', '') : null);

  let auth = null;

  // Check admin auth first (has priority)
  if (adminToken && (!authType || authType === 'admin' || authType === 'any')) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload;
      if (decoded.admin && decoded.isAdmin) {
        auth = { 
          type: 'admin' as const, 
          admin: decoded.admin, 
          companyId: decoded.admin.companyId,
          userId: decoded.admin.id,
          userName: decoded.admin.name 
        };
      }
    } catch (error) {
      // Admin token invalid, continue to contractor check
    }
  }

  // Check contractor auth if admin failed
  if (!auth && contractorToken && (!authType || authType === 'contractor' || authType === 'any')) {
    try {
      const decoded = jwt.verify(contractorToken, JWT_SECRET) as ContractorTokenPayload;
      if (decoded.contractor && decoded.isContractor) {
        auth = { 
          type: 'contractor' as const, 
          contractor: decoded.contractor, 
          companyId: decoded.contractor.companyId,
          userId: decoded.contractor.id,
          userName: decoded.contractor.name 
        };
      }
    } catch (error) {
      // Contractor token invalid
    }
  }

  if (!auth) {
    throw new Error('Authentication required');
  }

  return auth;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const timesheetId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const authType = searchParams.get('authType') as 'contractor' | 'admin' | 'any' | null;

    const auth = authenticateRequest(request, authType || 'admin');
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!timesheetId) {
      return NextResponse.json({ error: 'Timesheet ID is required' }, { status: 400 });
    }

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status is required (pending, approved, rejected)' 
      }, { status: 400 });
    }

    // Get existing timesheet to check ownership/permissions
    const existingTimesheet = await db.select()
      .from(timesheets)
      .where(and(
        eq(timesheets.id, timesheetId),
        eq(timesheets.companyId, auth.companyId)
      ))
      .limit(1);

    if (existingTimesheet.length === 0) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Only admins can approve/reject timesheets
    if ((status === 'approved' || status === 'rejected') && auth.type !== 'admin') {
      return NextResponse.json({ 
        error: 'Only administrators can approve or reject timesheets' 
      }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'approved' && auth.type === 'admin') {
      updateData.approvedBy = auth.userId;
      updateData.approvedByName = auth.userName;
      updateData.approvedAt = new Date().toISOString();
      updateData.rejectionReason = null; // Clear rejection reason if approved
    } else if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason || 'No reason provided';
      updateData.approvedBy = null;
      updateData.approvedByName = null;
      updateData.approvedAt = null;
    } else if (status === 'pending') {
      // Clear approval/rejection data
      updateData.approvedBy = null;
      updateData.approvedByName = null;
      updateData.approvedAt = null;
      updateData.rejectionReason = null;
    }

    // Update timesheet
    const updatedTimesheet = await db.update(timesheets)
      .set(updateData)
      .where(and(
        eq(timesheets.id, timesheetId),
        eq(timesheets.companyId, auth.companyId)
      ))
      .returning();

    if (updatedTimesheet.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update timesheet status' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      timesheet: updatedTimesheet[0],
      message: `Timesheet ${status} successfully`
    });

  } catch (error: any) {
    console.error('Error updating timesheet status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update timesheet status',
        details: error.message 
      },
      { status: 500 }
    );
  }
}