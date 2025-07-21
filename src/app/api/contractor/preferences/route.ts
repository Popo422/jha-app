import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to authenticate contractor requests
function authenticateContractor(request: NextRequest): { contractor: any } {
  const contractorToken = request.cookies.get('authToken')?.value || 
                         (request.headers.get('Authorization')?.startsWith('Bearer ') ? 
                          request.headers.get('Authorization')?.replace('Bearer ', '') : null)
  
  if (!contractorToken) {
    throw new Error('Contractor authentication required')
  }

  try {
    const decoded = jwt.verify(contractorToken, JWT_SECRET) as any
    if (!decoded.contractor) {
      throw new Error('Invalid contractor token')
    }
    return { contractor: decoded.contractor }
  } catch (error) {
    throw new Error('Invalid contractor token')
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate contractor
    let auth: { contractor: any }
    try {
      auth = authenticateContractor(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Contractor authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { language } = body

    // Validate language
    if (!language || !['en', 'es', 'pl', 'zh'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be "en", "es", "pl", or "zh"' },
        { status: 400 }
      )
    }

    // Update contractor's language preference in database
    const updatedContractor = await db.update(contractors)
      .set({ 
        language: language,
        updatedAt: new Date()
      })
      .where(eq(contractors.id, auth.contractor.id))
      .returning()

    if (updatedContractor.length === 0) {
      return NextResponse.json(
        { error: 'Contractor not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Language preference updated successfully',
      contractor: {
        ...auth.contractor,
        language: language
      }
    })

  } catch (error: any) {
    console.error('Update contractor preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}