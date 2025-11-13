import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { eq, desc, and, or, ilike, sql, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { subcontractors, projects, contractors, subcontractorProjects, contractorProjects } from '@/lib/db/schema'
import { authenticateRequest } from '@/lib/auth-utils'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here'

// PostgreSQL error codes
const PG_UNIQUE_VIOLATION = '23505'

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
  
  // Fallback if all attempts failed
  throw new Error('Unable to generate unique contractor code');
}

// Helper function to create foreman contractor
async function createForemanContractor(foremanName: string, foremanEmail: string | null, subcontractorName: string, companyId: string, projectId?: string, adminName?: string, adminId?: string) {
  if (!foremanName || !foremanName.trim()) return null;
  
  // Split foreman name into first and last name
  const nameParts = foremanName.trim().split(' ');
  const firstName = nameParts[0] || 'Foreman';
  const lastName = nameParts.slice(1).join(' ') || 'User';
  
  // Generate a unique code for the foreman
  const code = await generateUniqueCode();
  
  let email: string;
  
  // Use provided email if available, otherwise generate one
  if (foremanEmail && foremanEmail.trim()) {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(foremanEmail)) {
      console.warn('Invalid foreman email format, falling back to auto-generated:', foremanEmail);
      // Fall back to auto-generated email
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${subcontractorName.toLowerCase().replace(/[^a-z0-9]/g, '')}.foreman`;
    } else {
      email = foremanEmail.trim().toLowerCase();
    }
  } else {
    // Auto-generate email if none provided
    email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${subcontractorName.toLowerCase().replace(/[^a-z0-9]/g, '')}.foreman`;
  }
  
  try {
    const [foremanContractor] = await db.insert(contractors).values({
      firstName,
      lastName,
      email,
      companyId,
      code,
      rate: '25.00', // Default foreman rate
      companyName: subcontractorName,
      language: 'en',
      type: 'foreman'
    }).returning();
    
    // If projectId is provided, automatically assign the foreman to the project
    if (projectId && adminName && adminId) {
      try {
        await db.insert(contractorProjects).values({
          contractorId: foremanContractor.id,
          projectId,
          role: 'foreman',
          assignedBy: adminName,
          assignedByUserId: adminId,
          isActive: true
        });
        console.log(`✅ Foreman ${foremanName} automatically assigned to project ${projectId}`);
      } catch (assignmentError: any) {
        // Don't fail foreman creation if project assignment fails
        console.warn('Failed to assign foreman to project:', assignmentError);
      }
    }
    
    return foremanContractor;
  } catch (error: any) {
    // If contractor creation fails, continue without blocking subcontractor creation
    console.warn('Failed to create foreman contractor:', error);
    return null;
  }
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

export async function GET(request: NextRequest) {
  try {
    // Get authType from query parameters or default to 'any'
    const { searchParams } = new URL(request.url)
    const authType = (searchParams.get('authType') as 'contractor' | 'admin') || 'contractor'
    
    // Authenticate request
    let auth: { isAdmin: boolean; userId?: string; userName?: string; contractor?: any; admin?: any }
    try {
      auth = authenticateRequest(request, authType)
    } catch (error) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const companyId = auth.isAdmin ? auth.admin.companyId : auth.contractor?.companyId
    
    if (!companyId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get remaining query parameters for pagination
    const search = searchParams.get('search')
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const limit = pageSize
    const offset = (page - 1) * pageSize

    // Build query conditions - filter by user's company
    const conditions = [eq(subcontractors.companyId, companyId)]
    
    // Add search filter if specified
    if (search) {
      const searchCondition = ilike(subcontractors.name, `%${search}%`)
      conditions.push(searchCondition)
    }

    // Get total count for pagination - adjust for project filtering
    let countResult;
    if (projectId) {
      countResult = await db.select({ count: sql`count(DISTINCT ${subcontractors.id})` })
        .from(subcontractors)
        .innerJoin(subcontractorProjects, eq(subcontractorProjects.subcontractorId, subcontractors.id))
        .where(and(
          ...conditions,
          eq(subcontractorProjects.projectId, projectId)
        ))
    } else {
      countResult = await db.select({ count: sql`count(*)` })
        .from(subcontractors)
        .where(and(...conditions))
    }
    const totalCount = Number(countResult[0].count)

    // Get subcontractor data - adjust for project filtering
    let basicResult;
    if (projectId) {
      basicResult = await db.select({
        id: subcontractors.id,
        name: subcontractors.name,
        contractAmount: subcontractors.contractAmount,
        companyId: subcontractors.companyId,
        foreman: subcontractors.foreman,
        address: subcontractors.address,
        contact: subcontractors.contact,
        email: subcontractors.email,
        phone: subcontractors.phone,
        trade: subcontractors.trade,
        contractorLicenseNo: subcontractors.contractorLicenseNo,
        specialtyLicenseNo: subcontractors.specialtyLicenseNo,
        federalTaxId: subcontractors.federalTaxId,
        motorCarrierPermitNo: subcontractors.motorCarrierPermitNo,
        isUnion: subcontractors.isUnion,
        isSelfInsured: subcontractors.isSelfInsured,
        workersCompPolicy: subcontractors.workersCompPolicy,
        createdAt: subcontractors.createdAt,
        updatedAt: subcontractors.updatedAt,
      }).from(subcontractors)
        .innerJoin(subcontractorProjects, eq(subcontractorProjects.subcontractorId, subcontractors.id))
        .where(and(
          ...conditions,
          eq(subcontractorProjects.projectId, projectId)
        ))
        .orderBy(desc(subcontractors.createdAt))
        .limit(limit)
        .offset(offset)
    } else {
      basicResult = await db.select({
        id: subcontractors.id,
        name: subcontractors.name,
        contractAmount: subcontractors.contractAmount,
        companyId: subcontractors.companyId,
        foreman: subcontractors.foreman,
        address: subcontractors.address,
        contact: subcontractors.contact,
        email: subcontractors.email,
        phone: subcontractors.phone,
        trade: subcontractors.trade,
        contractorLicenseNo: subcontractors.contractorLicenseNo,
        specialtyLicenseNo: subcontractors.specialtyLicenseNo,
        federalTaxId: subcontractors.federalTaxId,
        motorCarrierPermitNo: subcontractors.motorCarrierPermitNo,
        isUnion: subcontractors.isUnion,
        isSelfInsured: subcontractors.isSelfInsured,
        workersCompPolicy: subcontractors.workersCompPolicy,
        createdAt: subcontractors.createdAt,
        updatedAt: subcontractors.updatedAt,
      }).from(subcontractors)
        .where(and(...conditions))
        .orderBy(desc(subcontractors.createdAt))
        .limit(limit)
        .offset(offset)
    }

    // Then get the many-to-many project relationships for these subcontractors
    const subcontractorIds = basicResult.map(sub => sub.id)
    const projectRelations = subcontractorIds.length > 0 ? await db.select({
      subcontractorId: subcontractorProjects.subcontractorId,
      projectId: subcontractorProjects.projectId,
      projectName: projects.name,
    }).from(subcontractorProjects)
      .innerJoin(projects, eq(subcontractorProjects.projectId, projects.id))
      .where(inArray(subcontractorProjects.subcontractorId, subcontractorIds)) : []

    // Combine the data
    const result = basicResult.map(subcontractor => {
      const relatedProjects = projectRelations.filter(rel => rel.subcontractorId === subcontractor.id)
      return {
        ...subcontractor,
        projectIds: relatedProjects.map(rel => rel.projectId),
        projectNames: relatedProjects.map(rel => rel.projectName),
      }
    })

    const totalPages = Math.ceil(totalCount / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      subcontractors: result,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    })

  } catch (error) {
    console.error('Get subcontractors error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
    
    // Check if this is a bulk operation
    if (Array.isArray(body.subcontractors)) {
      // Bulk create subcontractors
      const { subcontractors: subcontractorsData } = body
      
      if (!subcontractorsData || subcontractorsData.length === 0) {
        return NextResponse.json(
          { error: 'No subcontractors provided' },
          { status: 400 }
        )
      }

      // Validate each subcontractor
      for (const subcontractor of subcontractorsData) {
        if (!subcontractor.name) {
          return NextResponse.json(
            { error: 'Missing required field in subcontractor data: name' },
            { status: 400 }
          )
        }
      }

      // Get existing subcontractor names to avoid duplicates
      const existingSubcontractors = await db
        .select({ name: subcontractors.name })
        .from(subcontractors)
        .where(eq(subcontractors.companyId, auth.admin.companyId))

      const existingNames = new Set(existingSubcontractors.map(s => s.name.toLowerCase()))

      // Filter out duplicates and prepare data
      const uniqueSubcontractors = subcontractorsData.filter((subcontractor: any) => 
        !existingNames.has(subcontractor.name.trim().toLowerCase())
      )

      if (uniqueSubcontractors.length === 0) {
        return NextResponse.json(
          { error: 'All subcontractors already exist in your company' },
          { status: 409 }
        )
      }

      // Helper function to resolve project ID from name if needed
      const resolveProjectId = async (projectIdOrName: string | null): Promise<string | null> => {
        if (!projectIdOrName) return null;
        
        // If it looks like a UUID, assume it's already a project ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(projectIdOrName)) {
          return projectIdOrName;
        }
        
        // Otherwise, treat it as a project name and look up the ID
        const project = await db.select({ id: projects.id })
          .from(projects)
          .where(and(
            eq(projects.name, projectIdOrName),
            eq(projects.companyId, auth.admin.companyId)
          ))
          .limit(1);
          
        return project.length > 0 ? project[0].id : null;
      };

      // Prepare subcontractor data with resolved project IDs
      const preparedSubcontractors = [];
      for (const subcontractor of uniqueSubcontractors) {
        const resolvedProjectId = await resolveProjectId(subcontractor.projectId);
        preparedSubcontractors.push({
          name: subcontractor.name.trim(),
          contractAmount: subcontractor.contractAmount ? subcontractor.contractAmount.toString() : null,
          companyId: auth.admin.companyId,
          projectId: resolvedProjectId,
          foreman: subcontractor.foreman ? subcontractor.foreman.trim() : null,
        });
      }

      // Create subcontractors with enhanced error handling
      const createdSubcontractors = []
      const errors = []
      
      for (let i = 0; i < preparedSubcontractors.length; i++) {
        const subcontractorData = preparedSubcontractors[i];
        const originalSubcontractor = uniqueSubcontractors[i];
        
        try {
          const [createdSubcontractor] = await db.insert(subcontractors).values(subcontractorData).returning()
          createdSubcontractors.push(createdSubcontractor)
          
          // Create foreman contractor if foreman is provided
          if (subcontractorData.foreman) {
            // For project-specific bulk creation, assign foreman to project if projectIds are provided
            const projectIdForForeman = originalSubcontractor.projectIds && originalSubcontractor.projectIds.length > 0 ? originalSubcontractor.projectIds[0] : undefined;
            await createForemanContractor(
              subcontractorData.foreman, 
              originalSubcontractor.foremanEmail || null, 
              subcontractorData.name, 
              auth.admin.companyId,
              projectIdForForeman,
              auth.admin.name,
              auth.admin.id
            );
          }
        } catch (insertError: any) {
          if (insertError.code === '23505') {
            if (insertError.constraint?.includes('company_subcontractor_unique')) {
              errors.push(`Subcontractor '${subcontractorData.name}' already exists in your company`)
            } else {
              errors.push(`Duplicate entry detected for subcontractor '${subcontractorData.name}'`)
            }
          } else {
            errors.push(`Failed to create subcontractor '${subcontractorData.name}': ${insertError.message}`)
          }
        }
      }

      // Handle many-to-many project relationships for bulk creation
      for (let i = 0; i < subcontractorsData.length; i++) {
        const originalSubcontractor = subcontractorsData[i];
        const createdSubcontractor = createdSubcontractors[i];
        
        if (originalSubcontractor.projectIds && Array.isArray(originalSubcontractor.projectIds) && originalSubcontractor.projectIds.length > 0 && createdSubcontractor) {
          const validProjectIds = []
          for (const projectIdOrName of originalSubcontractor.projectIds) {
            const resolvedId = await resolveProjectId(projectIdOrName)
            if (resolvedId) {
              validProjectIds.push(resolvedId)
            }
          }

          if (validProjectIds.length > 0) {
            const junctionData = validProjectIds.map(projectId => ({
              subcontractorId: createdSubcontractor.id,
              projectId,
              assignedBy: auth.admin.name,
              assignedByUserId: auth.admin.id,
            }))
            
            await db.insert(subcontractorProjects).values(junctionData)
          }
        }
      }

      const totalSkipped = (subcontractorsData.length - uniqueSubcontractors.length) + errors.length

      if (errors.length > 0 && createdSubcontractors.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Failed to create any subcontractors',
            errors: errors 
          },
          { status: 409 }
        )
      }

      return NextResponse.json({
        success: true,
        subcontractors: createdSubcontractors,
        created: createdSubcontractors.length,
        skipped: totalSkipped,
        ...(errors.length > 0 && { warnings: errors })
      })
    }

    // Single subcontractor creation (existing logic)
    const { name, contractAmount, projectIds, foreman, foremanEmail, address, contact, email, phone, trade, contractorLicenseNo, specialtyLicenseNo, federalTaxId, motorCarrierPermitNo, isUnion, isSelfInsured, workersCompPolicy } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Check if subcontractor name already exists within the same company
    const existingSubcontractor = await db
      .select()
      .from(subcontractors)
      .where(
        and(
          eq(subcontractors.name, name.trim()),
          eq(subcontractors.companyId, auth.admin.companyId)
        )
      )
      .limit(1)

    if (existingSubcontractor.length > 0) {
      return NextResponse.json(
        { error: 'Subcontractor name already exists in your company' },
        { status: 409 }
      )
    }

    // Helper function to resolve project ID from name if needed
    const resolveProjectId = async (projectIdOrName: string | null): Promise<string | null> => {
      if (!projectIdOrName) return null;
      
      // If it looks like a UUID, assume it's already a project ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(projectIdOrName)) {
        return projectIdOrName;
      }
      
      // Otherwise, treat it as a project name and look up the ID
      const project = await db.select({ id: projects.id })
        .from(projects)
        .where(and(
          eq(projects.name, projectIdOrName),
          eq(projects.companyId, auth.admin.companyId)
        ))
        .limit(1);
        
      return project.length > 0 ? project[0].id : null;
    };

    // Prepare subcontractor data
    const subcontractorData = {
      name: name.trim(),
      contractAmount: contractAmount ? contractAmount.toString() : null,
      companyId: auth.admin.companyId,
      foreman: foreman ? foreman.trim() : null,
      address: address ? address.trim() : null,
      contact: contact ? contact.trim() : null,
      email: email ? email.trim() : null,
      phone: phone ? phone.trim() : null,
      // New fields
      trade: trade ? trade.trim() : null,
      contractorLicenseNo: contractorLicenseNo ? contractorLicenseNo.trim() : null,
      specialtyLicenseNo: specialtyLicenseNo ? specialtyLicenseNo.trim() : null,
      federalTaxId: federalTaxId ? federalTaxId.trim() : null,
      motorCarrierPermitNo: motorCarrierPermitNo ? motorCarrierPermitNo.trim() : null,
      isUnion: isUnion || false,
      isSelfInsured: isSelfInsured || false,
      workersCompPolicy: workersCompPolicy ? workersCompPolicy.trim() : null,
    }

    // Create subcontractor record
    const subcontractor = await db.insert(subcontractors).values(subcontractorData).returning()

    // Handle many-to-many project relationships if projectIds is provided
    if (projectIds && Array.isArray(projectIds) && projectIds.length > 0) {
      const validProjectIds = []
      for (const projectIdOrName of projectIds) {
        const resolvedId = await resolveProjectId(projectIdOrName)
        if (resolvedId) {
          validProjectIds.push(resolvedId)
        }
      }

      // Create junction table entries
      if (validProjectIds.length > 0) {
        const junctionData = validProjectIds.map(projectId => ({
          subcontractorId: subcontractor[0].id,
          projectId,
          assignedBy: auth.admin.name,
          assignedByUserId: auth.admin.id,
        }))
        
        await db.insert(subcontractorProjects).values(junctionData)
      }
    }

    // Create foreman contractor if foreman is provided
    if (foreman && foreman.trim()) {
      // If projectIds are provided (from project dashboard), assign foreman to the first project
      const projectIdForForeman = projectIds && projectIds.length > 0 ? projectIds[0] : undefined;
      await createForemanContractor(
        foreman.trim(), 
        foremanEmail || null, 
        name.trim(), 
        auth.admin.companyId,
        projectIdForForeman,
        auth.admin.name,
        auth.admin.id
      );
    }

    return NextResponse.json({
      success: true,
      subcontractor: subcontractor[0]
    })

  } catch (error: any) {
    console.error('Create subcontractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_subcontractor_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Subcontractor name already exists in your company',
            message: 'A subcontractor with this name already exists in your company. Subcontractor names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to create subcontractor due to an unexpected error' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, name, contractAmount, projectIds, foreman, foremanEmail, address, contact, email, phone, trade, contractorLicenseNo, specialtyLicenseNo, federalTaxId, motorCarrierPermitNo, isUnion, isSelfInsured, workersCompPolicy } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Subcontractor ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      )
    }

    // Check if subcontractor exists and belongs to admin's company
    const existingSubcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.id, id),
        eq(subcontractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingSubcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found or access denied' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      name: name.trim(),
      updatedAt: new Date()
    }
    
    if (contractAmount !== undefined) {
      updateData.contractAmount = contractAmount ? contractAmount.toString() : null
    }
    
    
    if (foreman !== undefined) {
      updateData.foreman = foreman ? foreman.trim() : null
    }

    if (address !== undefined) {
      updateData.address = address ? address.trim() : null
    }

    if (contact !== undefined) {
      updateData.contact = contact ? contact.trim() : null
    }

    if (email !== undefined) {
      updateData.email = email ? email.trim() : null
    }

    if (phone !== undefined) {
      updateData.phone = phone ? phone.trim() : null
    }

    // Add new fields
    if (trade !== undefined) {
      updateData.trade = trade ? trade.trim() : null
    }

    if (contractorLicenseNo !== undefined) {
      updateData.contractorLicenseNo = contractorLicenseNo ? contractorLicenseNo.trim() : null
    }

    if (specialtyLicenseNo !== undefined) {
      updateData.specialtyLicenseNo = specialtyLicenseNo ? specialtyLicenseNo.trim() : null
    }

    if (federalTaxId !== undefined) {
      updateData.federalTaxId = federalTaxId ? federalTaxId.trim() : null
    }

    if (motorCarrierPermitNo !== undefined) {
      updateData.motorCarrierPermitNo = motorCarrierPermitNo ? motorCarrierPermitNo.trim() : null
    }

    if (isUnion !== undefined) {
      updateData.isUnion = Boolean(isUnion)
    }

    if (isSelfInsured !== undefined) {
      updateData.isSelfInsured = Boolean(isSelfInsured)
    }

    if (workersCompPolicy !== undefined) {
      updateData.workersCompPolicy = workersCompPolicy ? workersCompPolicy.trim() : null
    }

    // Update subcontractor
    const updatedSubcontractor = await db.update(subcontractors)
      .set(updateData)
      .where(eq(subcontractors.id, id))
      .returning()

    // Handle many-to-many project relationships if projectIds is provided
    if (projectIds !== undefined && Array.isArray(projectIds)) {
      // First, remove all existing relationships for this subcontractor
      await db.delete(subcontractorProjects)
        .where(eq(subcontractorProjects.subcontractorId, id))

      // Then create new relationships if any projectIds are provided
      if (projectIds.length > 0) {
        // Helper function to resolve project ID from name if needed (reuse from above)
        const resolveProjectId = async (projectIdOrName: string | null): Promise<string | null> => {
          if (!projectIdOrName) return null;
          
          // If it looks like a UUID, assume it's already a project ID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(projectIdOrName)) {
            return projectIdOrName;
          }
          
          // Otherwise, treat it as a project name and look up the ID
          const project = await db.select({ id: projects.id })
            .from(projects)
            .where(and(
              eq(projects.name, projectIdOrName),
              eq(projects.companyId, auth.admin.companyId)
            ))
            .limit(1);
            
          return project.length > 0 ? project[0].id : null;
        };

        const validProjectIds = []
        for (const projectIdOrName of projectIds) {
          const resolvedId = await resolveProjectId(projectIdOrName)
          if (resolvedId) {
            validProjectIds.push(resolvedId)
          }
        }

        // Create new junction table entries
        if (validProjectIds.length > 0) {
          const junctionData = validProjectIds.map(projectId => ({
            subcontractorId: id,
            projectId,
            assignedBy: auth.admin.name,
            assignedByUserId: auth.admin.id,
          }))
          
          await db.insert(subcontractorProjects).values(junctionData)
        }
      }
    }

    // Create foreman contractor if foreman was added/updated
    if (foreman && foreman.trim() && updateData.foreman) {
      // If projectIds are provided (from project dashboard), assign foreman to the first project
      const projectIdForForeman = projectIds && projectIds.length > 0 ? projectIds[0] : undefined;
      await createForemanContractor(
        foreman.trim(), 
        foremanEmail || null, 
        name.trim(), 
        auth.admin.companyId,
        projectIdForForeman,
        auth.admin.name,
        auth.admin.id
      );
    }

    return NextResponse.json({
      success: true,
      subcontractor: updatedSubcontractor[0]
    })

  } catch (error: any) {
    console.error('Update subcontractor error:', error)
    
    // Handle unique constraint violations
    if (error.code === PG_UNIQUE_VIOLATION) {
      if (error.constraint?.includes('company_subcontractor_unique')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Subcontractor name already exists in your company',
            message: 'Another subcontractor with this name already exists in your company. Subcontractor names must be unique within your organization.' 
          },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: 'Failed to update subcontractor due to an unexpected error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const subcontractorId = searchParams.get('id')

    if (!subcontractorId) {
      return NextResponse.json(
        { error: 'Subcontractor ID is required' },
        { status: 400 }
      )
    }

    // Check if subcontractor exists and belongs to admin's company
    const existingSubcontractor = await db.select().from(subcontractors)
      .where(and(
        eq(subcontractors.id, subcontractorId),
        eq(subcontractors.companyId, auth.admin.companyId)
      ))
      .limit(1)

    if (existingSubcontractor.length === 0) {
      return NextResponse.json(
        { error: 'Subcontractor not found or access denied' },
        { status: 404 }
      )
    }

    // Delete subcontractor
    await db.delete(subcontractors)
      .where(eq(subcontractors.id, subcontractorId))

    return NextResponse.json({
      success: true,
      message: 'Subcontractor deleted successfully'
    })

  } catch (error) {
    console.error('Delete subcontractor error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}