import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { projects } from '@/lib/db/schema'

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
You are an expert at extracting project schedule data from construction project files. 

Please analyze the provided file and extract all project tasks in the following JSON format:

{
  "tasks": [
    {
      "taskNumber": 1,
      "name": "Task name exactly as shown",
      "durationDays": 126,
      "startDate": "2024-11-01",
      "endDate": "2025-03-28", 
      "predecessors": "1,2,3" or "3FS+5 days" or null
    }
  ]
}

IMPORTANT INSTRUCTIONS:
1. Extract ALL tasks, even if there are hundreds
2. Keep task names exactly as they appear in the source
3. Convert duration to days (weeks * 7, months * 30)
4. Use YYYY-MM-DD format for dates
5. Keep predecessors exactly as shown (could be "1,2,3" or "10FS+25 wks" etc.)
6. If a field is missing or unclear, use null
7. Ensure taskNumber matches the ID/sequence from the source
8. Only return valid JSON, no additional text

The file contains a project schedule similar to this format:
ID | Task Name | Duration | Start | Finish | Predecessors
1  | Project Phase 1 | 45 days | Fri 11/1/24 | Wed 12/25/24 | 
2  | Design Package | 35 days | Wed 12/25/24 | Fri 2/15/25 | 1
3  | Material Procurement | 10 wks | Wed 3/12/25 | Wed 5/21/25 | 2FS+11 wks

Extract every single task from the provided file.
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
    const { fileUrl, projectId } = body

    if (!fileUrl) {
      return NextResponse.json({ 
        error: 'File URL is required' 
      }, { status: 400 })
    }

    // Verify project belongs to admin's company (if projectId provided)
    if (projectId) {
      const project = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.companyId, auth.admin.companyId)
          )
        )
        .limit(1)

      if (project.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
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
      let extractedTasks
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim()
        extractedTasks = JSON.parse(cleanedText)
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', text)
        return NextResponse.json({ 
          error: 'Failed to parse AI response',
          rawResponse: text 
        }, { status: 500 })
      }

      if (!extractedTasks.tasks || !Array.isArray(extractedTasks.tasks)) {
        return NextResponse.json({ 
          error: 'Invalid response format from AI',
          response: extractedTasks 
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        extractedTasks: extractedTasks.tasks,
        message: `Successfully extracted ${extractedTasks.tasks.length} tasks`,
        nextStep: {
          endpoint: '/api/admin/project-tasks/bulk-import',
          method: 'POST',
          body: {
            projectId,
            tasks: extractedTasks.tasks,
            replaceExisting: false // or true to replace all existing tasks
          }
        }
      })

    } catch (aiError: any) {
      console.error('Gemini API error:', aiError)
      return NextResponse.json({ 
        error: 'Failed to process file with AI',
        details: aiError.message 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Extract tasks error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}