import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { ProcoreAuthService } from '@/lib/integrations/procore/auth';
import { db } from '@/lib/db';
import { timesheets, contractors, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface ProcoreTimecardEntry {
  project_id: number;
  timecard_entry: {
    hours: string;
    date: string;
    description?: string;
    billable?: boolean;
    party_id?: number; // Required: the person who worked
    approval_status?: 'pending' | 'reviewed' | 'approved' | 'completed';
  };
}

interface SyncTimesheetRequest {
  timesheetIds: string[];
  procoreProjectId?: string; // Optional: map to specific Procore project
}

// Map our timesheet status to Procore approval status
function mapTimesheetStatusToProcoreApprovalStatus(status: string): 'pending' | 'reviewed' | 'approved' | 'completed' {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'pending'; // Rejected timesheets go back to pending in Procore
    default:
      return 'pending';
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAdminSession(request);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: SyncTimesheetRequest = await request.json();
    const { timesheetIds, procoreProjectId } = body;

    if (!timesheetIds || timesheetIds.length === 0) {
      return NextResponse.json({ error: 'No timesheet IDs provided' }, { status: 400 });
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

    // Get timesheets with contractor info and projects
    const timesheetsToSync = await db
      .select({
        timesheet: timesheets,
        contractor: contractors,
      })
      .from(timesheets)
      .leftJoin(contractors, eq(timesheets.userId, contractors.id))
      .where(eq(timesheets.companyId, companyId));

    // Get all company projects for mapping
    const companyProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId));

    // Filter by requested IDs
    const filteredTimesheets = timesheetsToSync.filter(row => 
      timesheetIds.includes(row.timesheet.id)
    );

    if (filteredTimesheets.length === 0) {
      return NextResponse.json({ 
        error: 'No timesheets found for the provided IDs' 
      }, { status: 400 });
    }

    // Fetch all Procore people and projects for lookups
    const [procorePeopleResponse, procoreProjectsResponse] = await Promise.all([
      authService.makeAuthenticatedRequest(
        companyId,
        `/rest/v1.0/companies/${integration.procoreCompanyId}/people?filters[include_company_people]=true&per_page=1000`,
        {
          headers: {
            'Procore-Company-Id': integration.procoreCompanyId,
          },
        }
      ),
      authService.makeAuthenticatedRequest(
        companyId,
        `/rest/v1.0/companies/${integration.procoreCompanyId}/projects?per_page=1000`,
        {
          headers: {
            'Procore-Company-Id': integration.procoreCompanyId,
          },
        }
      )
    ]);

    if (!procorePeopleResponse.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch Procore people: ${procorePeopleResponse.status}` 
      }, { status: 400 });
    }

    if (!procoreProjectsResponse.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch Procore projects: ${procoreProjectsResponse.status}` 
      }, { status: 400 });
    }

    const procorePeople = await procorePeopleResponse.json();
    const procoreProjects = await procoreProjectsResponse.json();

    const syncResults = [];
    const errors = [];

    // Sync each timesheet to Procore
    for (const row of filteredTimesheets) {
      const { timesheet, contractor } = row;
      
      try {
        // Find contractor in Procore people
        if (!contractor) {
          errors.push({
            timesheetId: timesheet.id,
            employee: timesheet.employee,
            status: 'error',
            error: 'Contractor not found in local database',
          });
          continue;
        }

        const procorePerson = procorePeople.find((person: any) => 
          person.first_name?.toLowerCase() === contractor.firstName.toLowerCase() &&
          person.last_name?.toLowerCase() === contractor.lastName.toLowerCase()
        );

        if (!procorePerson) {
          errors.push({
            timesheetId: timesheet.id,
            employee: timesheet.employee,
            status: 'error',
            error: `Contractor "${contractor.firstName} ${contractor.lastName}" not found in Procore. Please sync contractors first.`,
          });
          continue;
        }

        // Find project in Procore
        let finalProcoreProjectId: number;
        
        if (procoreProjectId) {
          // Use provided project ID
          finalProcoreProjectId = parseInt(procoreProjectId);
        } else {
          // Find project by name
          const localProject = companyProjects.find(p => p.name === timesheet.projectName);
          if (!localProject) {
            errors.push({
              timesheetId: timesheet.id,
              employee: timesheet.employee,
              status: 'error',
              error: `Project "${timesheet.projectName}" not found in local database`,
            });
            continue;
          }

          const procoreProject = procoreProjects.find((pp: any) => 
            pp.name?.toLowerCase().trim() === localProject.name.toLowerCase().trim()
          );

          if (!procoreProject) {
            errors.push({
              timesheetId: timesheet.id,
              employee: timesheet.employee,
              status: 'error',
              error: `Project "${timesheet.projectName}" not found in Procore. Please sync projects first.`,
            });
            continue;
          }

          finalProcoreProjectId = procoreProject.id;
        }

        const timecardEntry: ProcoreTimecardEntry = {
          project_id: finalProcoreProjectId,
          timecard_entry: {
            hours: timesheet.timeSpent,
            date: timesheet.date,
            description: timesheet.jobDescription || undefined,
            billable: true,
            party_id: procorePerson.id,
            approval_status: mapTimesheetStatusToProcoreApprovalStatus(timesheet.status),
          }
        };

        console.log('Creating timecard entry:', {
          project_id: finalProcoreProjectId,
          party_id: procorePerson.id,
          employee: timesheet.employee,
          hours: timesheet.timeSpent,
          date: timesheet.date,
          approval_status: mapTimesheetStatusToProcoreApprovalStatus(timesheet.status),
          local_status: timesheet.status
        });

        // Use company-level endpoint as per API docs
        const procoreResponse = await authService.makeAuthenticatedRequest(
          companyId,
          `/rest/v1.0/companies/${integration.procoreCompanyId}/timecard_entries`,
          {
            method: 'POST',
            headers: {
              'Procore-Company-Id': integration.procoreCompanyId,
            },
            body: JSON.stringify(timecardEntry),
          }
        );

        if (procoreResponse.ok) {
          const procoreData = await procoreResponse.json();
          syncResults.push({
            timesheetId: timesheet.id,
            employee: timesheet.employee,
            status: 'success',
            procoreEntryId: procoreData.id,
          });
        } else {
          const errorData = await procoreResponse.text();
          console.error('Procore timecard creation failed:', {
            status: procoreResponse.status,
            error: errorData,
            timesheetId: timesheet.id
          });
          errors.push({
            timesheetId: timesheet.id,
            employee: timesheet.employee,
            status: 'error',
            error: `Procore API error: ${procoreResponse.status} - ${errorData}`,
          });
        }
      } catch (error) {
        console.error('Exception during timecard sync:', error);
        errors.push({
          timesheetId: timesheet.id,
          employee: timesheet.employee,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Note: Last sync timestamp will be updated automatically by the auth service

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.length} of ${filteredTimesheets.length} timesheets to Procore`,
      results: syncResults,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('Error syncing timesheets to Procore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}