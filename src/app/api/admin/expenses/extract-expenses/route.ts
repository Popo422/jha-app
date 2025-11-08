import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { GoogleGenerativeAI } from '@google/generative-ai'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

interface AdminTokenPayload {
  admin: {
    id: string
    employeeId: string
    name: string
    role: string
    companyId: string
  }
  isAdmin: boolean
  iat: number
  exp: number
}

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

// Function to fetch file from URL and convert to base64
async function fetchFileAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }
  
  const arrayBuffer = await response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  const mimeType = response.headers.get('content-type') || 'application/octet-stream'
  
  return { data: base64, mimeType }
}

const EXTRACTION_PROMPT = `
You are an expert at extracting expense data from receipts and invoices for construction projects.

Please analyze the provided receipt/invoice image and extract all line items as separate expenses in the following JSON format:

{
  "expenses": [
    {
      "name": "Item name exactly as shown on receipt",
      "description": "Additional details about the item if available",
      "price": 25.99,
      "quantity": 2,
      "date": "2024-11-07",
      "category": "Materials"
    }
  ]
}

IMPORTANT INSTRUCTIONS:
1. Extract EACH line item as a separate expense (don't combine items)
2. Use the exact item names as they appear on the receipt
3. Extract unit price (price per item, not total)
4. Extract quantity for each item (default to 1 if not shown)
5. Use the receipt date if available, otherwise use today's date
6. Include tax, shipping, fees as separate line items if shown separately
7. For descriptions, include size, brand, or other details if visible
8. Use numbers only for price (remove currency symbols)
9. If an item has no clear quantity, assume quantity = 1
10. AUTOMATICALLY CATEGORIZE each expense using one of these categories:
    - "Labor" - Wages, salaries, contractor fees, labor costs
    - "Materials" - Construction materials, supplies, hardware, concrete, steel, wood, etc.
    - "Equipment" - Tools, machinery, equipment rental, vehicle costs
    - "Subcontractors" - Subcontractor payments, specialized trade services
    - "Sitework / Site Preparation" - Excavation, grading, site clearing, utilities
    - "Permits & Fees" - Building permits, inspection fees, regulatory costs
    - "Design & Professional Services" - Architect, engineer, consultant fees
    - "General Conditions / Jobsite Overhead" - Project management, temporary facilities
    - "Insurance & Bonds" - Project insurance, bonding, liability coverage
    - "Safety" - Safety equipment, training, compliance costs
    - "Testing & Inspection" - Material testing, quality control, inspections
    - "Temporary Facilities & Utilities" - Temporary power, water, office trailers
    - "Project Administration / General Overhead" - Administrative costs, office expenses
    - "Contingency" - Contingency funds, unexpected costs
    - "Financing Costs" - Interest, loan fees, financing charges
    - "Closeout & Turnover" - Final inspections, warranties, closeout documentation
    - "Other" - Items that don't fit other categories
11. Only return valid JSON, no additional text

CATEGORIZATION EXAMPLES:
- "2x4 Lumber" → "Materials"
- "Concrete Mix" → "Materials"
- "Electrician Services" → "Subcontractors"
- "Hard Hat" → "Safety"
- "Tool Rental" → "Equipment"
- "Building Permit" → "Permits & Fees"
- "Fuel" → "Equipment"
- "Office Supplies" → "Project Administration / General Overhead"
- "Inspection Fee" → "Testing & Inspection"

Example receipt format:
- 2x Safety Vests - $25.00 each
- 1x Concrete Delivery - $450.00
- Building Permit Fee - $125.00

Should extract as:
{
  "expenses": [
    {
      "name": "Safety Vests",
      "description": "High-visibility safety vests",
      "price": 25.00,
      "quantity": 2,
      "date": "2024-11-07",
      "category": "Safety"
    },
    {
      "name": "Concrete Delivery",
      "description": "Ready-mix concrete delivery",
      "price": 450.00,
      "quantity": 1,
      "date": "2024-11-07",
      "category": "Materials"
    },
    {
      "name": "Building Permit Fee",
      "description": "Municipal building permit",
      "price": 125.00,
      "quantity": 1,
      "date": "2024-11-07",
      "category": "Permits & Fees"
    }
  ]
}

Extract every expense line item and automatically categorize each one based on the item type and construction context.
`

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

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'Gemini API key not configured' 
      }, { status: 500 })
    }

    const body = await request.json()
    const { fileUrl } = body

    if (!fileUrl) {
      return NextResponse.json({ 
        error: 'File URL is required for expense extraction' 
      }, { status: 400 })
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    let result: any

    try {
      // Fetch file and convert to base64
      const { data: base64Data, mimeType } = await fetchFileAsBase64(fileUrl)

      // Prepare the request for Gemini
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }

      // Generate content with Gemini
      result = await model.generateContent([EXTRACTION_PROMPT, imagePart])
      const response = await result.response
      const text = response.text()

      // Try to parse the JSON response
      let extractedExpenses
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
        extractedExpenses = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text)
        return NextResponse.json({ 
          error: 'Failed to parse AI response',
          rawResponse: text 
        }, { status: 500 })
      }

      if (!extractedExpenses.expenses || !Array.isArray(extractedExpenses.expenses)) {
        return NextResponse.json({ 
          error: 'Invalid response format from AI',
          response: extractedExpenses 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        extractedExpenses: extractedExpenses.expenses,
        message: `Successfully extracted ${extractedExpenses.expenses.length} expense items`
      })

    } catch (aiError: any) {
      console.error('Gemini AI error:', aiError)
      return NextResponse.json({ 
        error: 'AI processing failed',
        details: aiError.message 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error extracting expenses:', error)
    return NextResponse.json({ 
      error: 'Internal server error during expense extraction' 
    }, { status: 500 })
  }
}