import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, and, or, ilike, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contractors, companies } from '@/lib/db/schema'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

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

interface ContractorBulkData {
  firstName: string;
  lastName: string;
  email: string;
  rate?: string;
  companyName?: string;
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

// Generate unique contractor code
function generateContractorCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Check if code exists and generate a unique one
async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateContractorCode();
    
    // Check if code already exists
    const existingContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.code, code))
      .limit(1);
    
    if (existingContractor.length === 0) {
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Unable to generate unique contractor code');
}

async function checkContractorLimit(companyId: string, additionalCount: number): Promise<{ canAdd: boolean; currentCount: number; limit: number; membershipLevel: string | null }> {
  const company = await db.select({
    membershipInfo: companies.membershipInfo
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  if (company.length === 0) {
    throw new Error('Company not found')
  }

  const membershipInfo = company[0].membershipInfo as any
  const membershipLevel = membershipInfo?.membershipLevel || '1'

  // Get current contractor count
  const contractorCountResult = await db.select({ count: count() })
    .from(contractors)
    .where(eq(contractors.companyId, companyId))

  const currentCount = contractorCountResult[0]?.count || 0
  let limit = 100 // Default limit for non-level 3 members
  
  if (membershipLevel === '3') {
    limit = 400
  } else if (membershipLevel === '2') {
    limit = 200
  } else if (membershipLevel === '1') {
    limit = 100
  }

  return {
    canAdd: (currentCount + additionalCount) <= limit,
    currentCount,
    limit,
    membershipLevel
  }
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
    const { contractors: contractorData } = body

    if (!Array.isArray(contractorData) || contractorData.length === 0) {
      return NextResponse.json(
        { error: 'Contractors array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Check contractor limit
    const limitCheck = await checkContractorLimit(auth.admin.companyId, contractorData.length)
    if (!limitCheck.canAdd) {
      return NextResponse.json(
        { 
          error: 'Contractor limit exceeded',
          message: `Adding ${contractorData.length} contractors would exceed your limit of ${limitCheck.limit}. Current count: ${limitCheck.currentCount}`,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          membershipLevel: limitCheck.membershipLevel
        },
        { status: 403 }
      )
    }

    // Validate each contractor
    const validationErrors: string[] = [];
    const emails = new Set<string>();
    
    contractorData.forEach((contractor: ContractorBulkData, index: number) => {
      const rowNum = index + 1;

      // Check required fields
      if (!contractor.firstName?.trim()) {
        validationErrors.push(`Row ${rowNum}: First Name is required`);
      }
      if (!contractor.lastName?.trim()) {
        validationErrors.push(`Row ${rowNum}: Last Name is required`);
      }
      if (!contractor.email?.trim()) {
        validationErrors.push(`Row ${rowNum}: Email is required`);
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contractor.email)) {
          validationErrors.push(`Row ${rowNum}: Invalid email format`);
        }
        
        // Check for duplicate emails in the request
        const email = contractor.email.toLowerCase();
        if (emails.has(email)) {
          validationErrors.push(`Row ${rowNum}: Duplicate email address in request`);
        } else {
          emails.add(email);
        }
      }

      // Validate rate if provided
      if (contractor.rate && contractor.rate.trim()) {
        const rateValue = parseFloat(contractor.rate);
        if (isNaN(rateValue) || rateValue < 0 || rateValue > 9999.99) {
          validationErrors.push(`Row ${rowNum}: Rate must be a valid number between 0 and 9999.99`);
        }
      }
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Check for existing emails in the database
    const emailArray = Array.from(emails);
    const existingEmails = await db
      .select({ email: contractors.email })
      .from(contractors)
      .where(
        and(
          eq(contractors.companyId, auth.admin.companyId),
          or(...emailArray.map(email => eq(contractors.email, email)))
        )
      );

    if (existingEmails.length > 0) {
      const existingEmailsList = existingEmails.map(e => e.email).join(', ');
      return NextResponse.json(
        { error: `The following email addresses already exist in your company: ${existingEmailsList}` },
        { status: 409 }
      )
    }

    // Prepare contractor records with auto-generated codes
    const contractorRecords = [];
    const createdContractors = [];

    for (const contractor of contractorData) {
      try {
        // Generate unique code for each contractor
        const uniqueCode = await generateUniqueCode();

        const contractorRecord: any = {
          firstName: contractor.firstName.trim(),
          lastName: contractor.lastName.trim(),
          email: contractor.email.trim().toLowerCase(),
          code: uniqueCode,
          companyId: auth.admin.companyId,
          language: 'en', // Default to English as requested
        };

        // Add rate if provided and valid
        if (contractor.rate && contractor.rate.trim()) {
          const rateValue = parseFloat(contractor.rate);
          if (!isNaN(rateValue) && rateValue >= 0 && rateValue <= 9999.99) {
            contractorRecord.rate = rateValue.toFixed(2);
          }
        }

        // Add company name if provided
        if (contractor.companyName && contractor.companyName.trim()) {
          contractorRecord.companyName = contractor.companyName.trim();
        }

        contractorRecords.push(contractorRecord);
      } catch (error) {
        console.error('Error generating unique code:', error);
        return NextResponse.json(
          { error: 'Failed to generate unique contractor codes' },
          { status: 500 }
        )
      }
    }

    // Insert all contractors
    try {
      const insertedContractors = await db.insert(contractors).values(contractorRecords).returning();
      
      return NextResponse.json({
        success: true,
        message: `Successfully created ${insertedContractors.length} contractors`,
        contractors: insertedContractors
      });
    } catch (error: any) {
      console.error('Bulk insert error:', error);
      
      // Handle potential constraint violations
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'One or more contractors could not be created due to duplicate data' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create contractors' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Bulk create contractors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}