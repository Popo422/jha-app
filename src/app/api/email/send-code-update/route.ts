import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'
import { emailService } from '@/lib/email-service'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

interface AdminTokenPayload {
  admin: {
    id: string
    employeeId: string
    name: string
    role: string
    companyId: string
    email?: string
    companyName?: string
  }
  isAdmin: boolean
  iat: number
  exp: number
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

    const body = await request.json()
    const { contractorId } = body

    // Validation
    if (!contractorId) {
      return NextResponse.json(
        { error: 'Missing required field: contractorId' },
        { status: 400 }
      )
    }

    // Get contractor details
    const contractor = await db
      .select()
      .from(contractors)
      .where(
        and(
          eq(contractors.id, contractorId),
          eq(contractors.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (contractor.length === 0) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      )
    }

    const contractorData = contractor[0]

    // Send code update email
    try {
      await emailService.sendContractorNotification({
        contractorEmail: contractorData.email,
        contractorName: `${contractorData.firstName} ${contractorData.lastName}`,
        companyName: auth.admin.companyName || 'Your Company',
        contractorCode: contractorData.code,
        notificationType: 'code-update',
        message: `Your login code has been updated to: ${contractorData.code}`,
        subject: 'Your JHA Login Code Has Been Updated',
        adminEmail: 'zerniereyes@gmail.com',
        priority: 'high',
      });

      return NextResponse.json({
        success: true,
        message: 'Code update email sent successfully',
        contractor: {
          name: `${contractorData.firstName} ${contractorData.lastName}`,
          email: contractorData.email,
          code: contractorData.code
        }
      })

    } catch (emailError) {
      console.error('Failed to send code update email:', emailError);
      
      return NextResponse.json(
        { error: 'Failed to send email notification' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Send code update email error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}