import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { ProcoreAuthService } from '@/lib/integrations/procore/auth';
import { db } from '@/lib/db';
import { contractors } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ProcorePerson {
  person: {
    first_name: string;
    last_name: string;
    is_employee: boolean;
    employee_id?: string;
    active: boolean;
    origin_id?: string;
  };
}

interface SyncContractorRequest {
  contractorIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAdminSession(request);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: SyncContractorRequest = await request.json();
    const { contractorIds } = body;

    if (!contractorIds || contractorIds.length === 0) {
      return NextResponse.json({ error: 'No contractor IDs provided' }, { status: 400 });
    }

    const companyId = authResult.admin.companyId;
    const authService = new ProcoreAuthService();

    // Check Procore integration
    const integrations = await authService.getActiveIntegration(companyId);
    
    if (!integrations || integrations.length === 0) {
      return NextResponse.json({ 
        error: 'Procore integration not found or inactive. Please set up Procore integration first.' 
      }, { status: 400 });
    }

    const integration = integrations[0];

    // Get contractors to sync
    const contractorsToSync = await db
      .select()
      .from(contractors)
      .where(eq(contractors.companyId, companyId));

    // Filter by requested IDs
    const filteredContractors = contractorsToSync.filter(contractor => 
      contractorIds.includes(contractor.id)
    );

    if (filteredContractors.length === 0) {
      return NextResponse.json({ 
        error: 'No contractors found for the provided IDs' 
      }, { status: 400 });
    }

    // First, get existing Procore people to check for duplicates
    const existingPeopleResponse = await authService.makeAuthenticatedRequest(
      companyId,
      `/rest/v1.0/companies/${integration.procoreCompanyId}/people?filters[include_company_people]=true&per_page=1000`,
      {
        method: 'GET',
        headers: {
          'Procore-Company-Id': integration.procoreCompanyId,
        },
      }
    );

    let existingPeople = [];
    if (existingPeopleResponse.ok) {
      existingPeople = await existingPeopleResponse.json();
    }

    const syncResults = [];
    const errors = [];

    // Sync each contractor to Procore
    for (const contractor of filteredContractors) {
      try {
        // Check if person already exists in Procore
        const existingPerson = existingPeople.find((person: any) => 
          person.first_name?.toLowerCase() === contractor.firstName.toLowerCase() &&
          person.last_name?.toLowerCase() === contractor.lastName.toLowerCase()
        );

        if (existingPerson) {
          syncResults.push({
            contractorId: contractor.id,
            name: `${contractor.firstName} ${contractor.lastName}`,
            status: 'exists',
            procorePartyId: existingPerson.id,
            message: 'Person already exists in Procore'
          });
          continue;
        }

        // Create new person in Procore
        const procorePerson: ProcorePerson = {
          person: {
            first_name: contractor.firstName,
            last_name: contractor.lastName,
            is_employee: true, // Mark as employee so they can submit timecards
            employee_id: contractor.code, // Use contractor code as employee ID
            active: true,
            origin_id: contractor.id, // Store our contractor ID for reference
          }
        };

        const procoreResponse = await authService.makeAuthenticatedRequest(
          companyId,
          `/rest/v1.0/companies/${integration.procoreCompanyId}/people`,
          {
            method: 'POST',
            headers: {
              'Procore-Company-Id': integration.procoreCompanyId,
            },
            body: JSON.stringify(procorePerson),
          }
        );

        if (procoreResponse.ok) {
          const procoreData = await procoreResponse.json();
          syncResults.push({
            contractorId: contractor.id,
            name: `${contractor.firstName} ${contractor.lastName}`,
            status: 'created',
            procorePartyId: procoreData.id,
            message: 'Successfully created in Procore'
          });
        } else {
          const errorData = await procoreResponse.text();
          errors.push({
            contractorId: contractor.id,
            name: `${contractor.firstName} ${contractor.lastName}`,
            status: 'error',
            error: `Procore API error: ${procoreResponse.status} - ${errorData}`,
          });
        }
      } catch (error) {
        errors.push({
          contractorId: contractor.id,
          name: `${contractor.firstName} ${contractor.lastName}`,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${filteredContractors.length} contractors`,
      results: syncResults,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error syncing contractors to Procore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}