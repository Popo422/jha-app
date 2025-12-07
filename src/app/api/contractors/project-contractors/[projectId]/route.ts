import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/db';
import { contractors, contractorProjects } from '@/lib/db/schema';
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

function authenticateAdmin(request: NextRequest): { admin: any } {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = authenticateAdmin(request);
    const resolvedParams = await params;
    const projectId = resolvedParams.projectId;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get contractors assigned to this project
    const projectContractors = await db.select({
      contractor: contractors,
    })
      .from(contractorProjects)
      .leftJoin(contractors, eq(contractorProjects.contractorId, contractors.id))
      .where(and(
        eq(contractorProjects.projectId, projectId),
        eq(contractors.companyId, auth.admin.companyId)
      ));

    const contractorsList = projectContractors
      .filter(pc => pc.contractor)
      .map(pc => pc.contractor!);

    return NextResponse.json({
      success: true,
      contractors: contractorsList
    });

  } catch (error) {
    console.error('Error fetching project contractors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project contractors' },
      { status: 500 }
    );
  }
}