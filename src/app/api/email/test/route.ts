import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
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
    const { testEmail, emailType = 'welcome' } = body

    // Validation
    if (!testEmail) {
      return NextResponse.json(
        { error: 'Missing required field: testEmail' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    try {
      let result;

      if (emailType === 'welcome') {
        // Send test welcome email
        result = await emailService.sendContractorWelcomeEmail({
          contractorEmail: testEmail,
          contractorName: 'Test User',
          contractorCode: 'TEST123',
          companyName: 'Test Company',
          adminEmail: 'zerniereyes@gmail.com',
          loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`
        });
      } else {
        // Send test notification email
        result = await emailService.sendContractorNotification({
          contractorEmail: testEmail,
          contractorName: 'Test User',
          companyName: 'Test Company',
          notificationType: emailType,
          message: 'This is a test email from the JHA system.',
          subject: `Test ${emailType} Email`,
          adminEmail: 'zerniereyes@gmail.com',
          priority: 'normal',
        });
      }

      return NextResponse.json({
        success: true,
        message: `Test ${emailType} email sent successfully`,
        details: result,
        sentTo: testEmail
      })

    } catch (emailError) {
      console.error('Failed to send test email:', emailError);
      
      return NextResponse.json(
        { 
          error: 'Failed to send test email',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Test email error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}