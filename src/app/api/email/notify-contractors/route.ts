import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, inArray } from 'drizzle-orm'
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
    const { 
      contractorIds, 
      notificationType, 
      message, 
      subject, 
      dueDate, 
      priority = 'normal',
      sendToAll = false
    } = body

    // Validation
    if (!notificationType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: notificationType, message' },
        { status: 400 }
      )
    }

    if (!sendToAll && (!contractorIds || contractorIds.length === 0)) {
      return NextResponse.json(
        { error: 'Either contractorIds must be provided or sendToAll must be true' },
        { status: 400 }
      )
    }

    // Valid notification types
    const validTypes = ['reminder', 'announcement', 'deadline', 'update', 'alert']
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get contractors to notify
    let contractorsToNotify
    if (sendToAll) {
      contractorsToNotify = await db
        .select()
        .from(contractors)
        .where(eq(contractors.companyId, auth.admin.companyId))
    } else {
      contractorsToNotify = await db
        .select()
        .from(contractors)
        .where(
          and(
            eq(contractors.companyId, auth.admin.companyId),
            inArray(contractors.id, contractorIds)
          )
        )
    }

    if (contractorsToNotify.length === 0) {
      return NextResponse.json(
        { error: 'No contractors found to notify' },
        { status: 404 }
      )
    }

    // Send notifications
    const emailPromises = contractorsToNotify.map(contractor => 
      emailService.sendContractorNotification({
        contractorEmail: contractor.email,
        contractorName: `${contractor.firstName} ${contractor.lastName}`,
        companyName: auth.admin.companyName || 'Your Company',
        notificationType,
        message,
        subject,
        adminEmail: 'zerniereyes@gmail.com',
        dueDate,
        priority,
      })
    )

    const results = await Promise.allSettled(emailPromises)
    
    const successful = results.filter(result => result.status === 'fulfilled').length
    const failed = results.filter(result => result.status === 'rejected').length

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to send notification to ${contractorsToNotify[index].email}:`, result.reason)
      }
    })

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${successful} contractors`,
      stats: {
        total: contractorsToNotify.length,
        successful,
        failed,
      },
      notificationType,
    })

  } catch (error: any) {
    console.error('Notify contractors error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}