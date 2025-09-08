import { NextRequest, NextResponse } from 'next/server';
import { validateContractorSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { contractors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Validate contractor session and ensure they are a foreman
    const validation = await validateContractorSession(request);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const contractorId = validation.contractor?.id;
    const companyId = validation.contractor?.companyId;
    
    if (!contractorId || !companyId) {
      return NextResponse.json({ error: 'Contractor or company ID not found' }, { status: 400 });
    }

    // Verify the user is a foreman and get their subcontractor name
    const currentContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1);

    if (currentContractor.length === 0 || currentContractor[0].type !== 'foreman') {
      return NextResponse.json({ error: 'Access denied. Foreman permissions required.' }, { status: 403 });
    }

    const foremanSubcontractor = currentContractor[0].companyName;
    if (!foremanSubcontractor) {
      return NextResponse.json({ error: 'Foreman subcontractor not found' }, { status: 400 });
    }

    // Get all contractors in the same subcontractor (by companyName) and admin company
    const companyContractors = await db
      .select()
      .from(contractors)
      .where(and(
        eq(contractors.companyId, companyId),
        eq(contractors.companyName, foremanSubcontractor)
      ))
      .orderBy(contractors.firstName, contractors.lastName);

    return NextResponse.json({
      success: true,
      contractors: companyContractors.map(contractor => ({
        id: contractor.id,
        firstName: contractor.firstName,
        lastName: contractor.lastName,
        email: contractor.email,
        code: contractor.code,
        rate: contractor.rate || '0.00',
        companyName: contractor.companyName,
        language: contractor.language || 'en',
        type: contractor.type || 'contractor',
        createdAt: contractor.createdAt,
        updatedAt: contractor.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching company contractors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate contractor session and ensure they are a foreman
    const validation = await validateContractorSession(request);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const contractorId = validation.contractor?.id;
    const companyId = validation.contractor?.companyId;
    
    if (!contractorId || !companyId) {
      return NextResponse.json({ error: 'Contractor or company ID not found' }, { status: 400 });
    }

    // Verify the user is a foreman and get their subcontractor name
    const currentContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1);

    if (currentContractor.length === 0 || currentContractor[0].type !== 'foreman') {
      return NextResponse.json({ error: 'Access denied. Foreman permissions required.' }, { status: 403 });
    }

    const foremanSubcontractor = currentContractor[0].companyName;
    if (!foremanSubcontractor) {
      return NextResponse.json({ error: 'Foreman subcontractor not found' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, email, code, rate, language, type } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists within the subcontractor
    const existingByEmail = await db
      .select()
      .from(contractors)
      .where(and(
        eq(contractors.companyId, companyId),
        eq(contractors.companyName, foremanSubcontractor),
        eq(contractors.email, email)
      ))
      .limit(1);

    if (existingByEmail.length > 0) {
      return NextResponse.json({ error: 'Email already exists in this subcontractor' }, { status: 400 });
    }

    // Check if code already exists globally
    const existingByCode = await db
      .select()
      .from(contractors)
      .where(eq(contractors.code, code))
      .limit(1);

    if (existingByCode.length > 0) {
      return NextResponse.json({ error: 'Login code already exists' }, { status: 400 });
    }

    // Insert new contractor
    const result = await db
      .insert(contractors)
      .values({
        firstName,
        lastName,
        email,
        code,
        rate: rate || '0.00',
        companyName: foremanSubcontractor,
        language: language || 'en',
        type: type || 'contractor',
        companyId
      })
      .returning({
        id: contractors.id,
        firstName: contractors.firstName,
        lastName: contractors.lastName,
        email: contractors.email,
        code: contractors.code,
        rate: contractors.rate,
        companyName: contractors.companyName,
        language: contractors.language,
        type: contractors.type,
        createdAt: contractors.createdAt,
        updatedAt: contractors.updatedAt
      });

    return NextResponse.json({
      success: true,
      contractor: result[0],
      message: 'Contractor created successfully'
    });
  } catch (error) {
    console.error('Error creating contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}