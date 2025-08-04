import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// Helper function to fetch fresh contractor language from database
async function getContractorLanguage(contractorId: string, fallbackLanguage: string = 'en'): Promise<string> {
  try {
    const dbContractor = await db.select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1)
    
    if (dbContractor.length > 0) {
      return dbContractor[0].language || fallbackLanguage
    }
    return fallbackLanguage
  } catch (dbError) {
    console.error('Error fetching contractor language:', dbError)
    return fallbackLanguage
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Always fetch the most current language preference from database
    // This ensures admin changes are picked up on refresh
    let contractorData = decoded.contractor
    if (contractorData?.id) {
      const currentLanguage = await getContractorLanguage(
        contractorData.id, 
        contractorData.language || 'en'
      )
      contractorData = {
        ...contractorData,
        language: currentLanguage
      }
    }

    // Return the user and contractor info from the token
    return NextResponse.json({
      valid: true,
      user: decoded.user,
      contractor: contractorData,
      token
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Authorization token is required' },
        { status: 401 }
      )
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as any

    // Always fetch the most current language preference from database
    // This ensures admin changes are picked up on refresh
    let contractorData = decoded.contractor
    if (contractorData?.id) {
      const currentLanguage = await getContractorLanguage(
        contractorData.id, 
        contractorData.language || 'en'
      )
      contractorData = {
        ...contractorData,
        language: currentLanguage
      }
    }

    // Return the user and contractor info from the token
    return NextResponse.json({
      valid: true,
      user: decoded.user,
      contractor: contractorData
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }
}