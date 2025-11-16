import { NextRequest, NextResponse } from 'next/server';
import { validateContractorSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { contractors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contractorToUpdateId } = await params;

    // Validate contractor session and ensure they are a foreman
    const validation = await validateContractorSession(request);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const currentContractorId = validation.contractor?.id;
    const companyId = validation.contractor?.companyId;
    
    if (!currentContractorId || !companyId) {
      return NextResponse.json({ error: 'Contractor or company ID not found' }, { status: 400 });
    }

    // Verify the user is a foreman and get their subcontractor name
    const currentContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, currentContractorId))
      .limit(1);

    if (currentContractor.length === 0 || currentContractor[0].type !== 'foreman') {
      return NextResponse.json({ error: 'Access denied. Foreman permissions required.' }, { status: 403 });
    }

    const foremanSubcontractor = currentContractor[0].companyName;
    if (!foremanSubcontractor) {
      return NextResponse.json({ error: 'Foreman subcontractor not found' }, { status: 400 });
    }

    // Verify the contractor to update belongs to the same subcontractor
    const contractorToUpdate = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorToUpdateId))
      .limit(1);

    if (contractorToUpdate.length === 0) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    if (contractorToUpdate[0].companyId !== companyId || contractorToUpdate[0].companyName !== foremanSubcontractor) {
      return NextResponse.json({ error: 'Access denied. Can only edit contractors in your subcontractor.' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { firstName, lastName, email, code, rate, language, type, address, city, state, phone, dateOfHire, workClassification, projectType, group } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !code) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if email already exists within the subcontractor (excluding current contractor)
    const existingByEmail = await db
      .select()
      .from(contractors)
      .where(and(
        eq(contractors.companyId, companyId),
        eq(contractors.companyName, foremanSubcontractor),
        eq(contractors.email, email)
      ))
      .limit(1);

    // Since we can't use NOT EQUAL, we need to check if the existing contractor is not the one we're updating
    if (existingByEmail.length > 0 && existingByEmail[0].id !== contractorToUpdateId) {
      return NextResponse.json({ error: 'Email already exists in this subcontractor' }, { status: 400 });
    }

    // Check if code already exists globally (excluding current contractor)
    const existingByCode = await db
      .select()
      .from(contractors)
      .where(eq(contractors.code, code))
      .limit(1);

    if (existingByCode.length > 0 && existingByCode[0].id !== contractorToUpdateId) {
      return NextResponse.json({ error: 'Login code already exists' }, { status: 400 });
    }

    // Update contractor
    const result = await db
      .update(contractors)
      .set({
        firstName,
        lastName,
        email,
        code,
        rate: rate || '0.00',
        companyName: foremanSubcontractor,
        language: language || 'en',
        type: type || 'contractor',
        address,
        city,
        state,
        phone,
        dateOfHire: dateOfHire || null,
        workClassification,
        projectType,
        group,
        updatedAt: new Date()
      })
      .where(eq(contractors.id, contractorToUpdateId))
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
        address: contractors.address,
        city: contractors.city,
        state: contractors.state,
        phone: contractors.phone,
        dateOfHire: contractors.dateOfHire,
        workClassification: contractors.workClassification,
        projectType: contractors.projectType,
        group: contractors.group,
        createdAt: contractors.createdAt,
        updatedAt: contractors.updatedAt
      });

    return NextResponse.json({
      success: true,
      contractor: result[0],
      message: 'Contractor updated successfully'
    });
  } catch (error) {
    console.error('Error updating contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: contractorToDeleteId } = await params;

    // Validate contractor session and ensure they are a foreman
    const validation = await validateContractorSession(request);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const currentContractorId = validation.contractor?.id;
    const companyId = validation.contractor?.companyId;
    
    if (!currentContractorId || !companyId) {
      return NextResponse.json({ error: 'Contractor or company ID not found' }, { status: 400 });
    }

    // Verify the user is a foreman and get their subcontractor name
    const currentContractor = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, currentContractorId))
      .limit(1);

    if (currentContractor.length === 0 || currentContractor[0].type !== 'foreman') {
      return NextResponse.json({ error: 'Access denied. Foreman permissions required.' }, { status: 403 });
    }

    const foremanSubcontractor = currentContractor[0].companyName;
    if (!foremanSubcontractor) {
      return NextResponse.json({ error: 'Foreman subcontractor not found' }, { status: 400 });
    }

    // Verify the contractor to delete belongs to the same subcontractor
    const contractorToDelete = await db
      .select()
      .from(contractors)
      .where(eq(contractors.id, contractorToDeleteId))
      .limit(1);

    if (contractorToDelete.length === 0) {
      return NextResponse.json({ error: 'Contractor not found' }, { status: 404 });
    }

    if (contractorToDelete[0].companyId !== companyId || contractorToDelete[0].companyName !== foremanSubcontractor) {
      return NextResponse.json({ error: 'Access denied. Can only delete contractors in your subcontractor.' }, { status: 403 });
    }

    // Prevent foreman from deleting themselves
    if (contractorToDeleteId === currentContractorId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Delete contractor
    await db
      .delete(contractors)
      .where(eq(contractors.id, contractorToDeleteId));

    return NextResponse.json({
      success: true,
      message: 'Contractor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contractor:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}