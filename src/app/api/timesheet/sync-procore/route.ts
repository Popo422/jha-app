import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { ProcoreAuthService } from '@/lib/integrations/procore/auth';
import { db } from '@/lib/db';
import { timesheets, contractors } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface ProcoreTimecardEntry {
  timecard_entry: {
    hours: string;
    date: string;
    description?: string;
    billable?: boolean;
  };
}

interface SyncTimesheetRequest {
  timesheetIds: string[];
  procoreProjectId?: string; // Optional: map to specific Procore project
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

    // Get timesheets with contractor info
    const timesheetsToSync = await db
      .select({
        timesheet: timesheets,
        contractor: contractors,
      })
      .from(timesheets)
      .leftJoin(contractors, eq(timesheets.userId, contractors.id))
      .where(
        and(
          eq(timesheets.companyId, companyId),
          // Only sync approved timesheets
          eq(timesheets.status, 'approved')
        )
      );

    // Filter by requested IDs
    const filteredTimesheets = timesheetsToSync.filter(row => 
      timesheetIds.includes(row.timesheet.id)
    );

    if (filteredTimesheets.length === 0) {
      return NextResponse.json({ 
        error: 'No approved timesheets found for the provided IDs' 
      }, { status: 400 });
    }

    const syncResults = [];
    const errors = [];

    // Use default project ID if not provided
    const projectId = procoreProjectId || (integration.syncSettings as any)?.defaultProjectId || "YOUR_DEFAULT_PROJECT_ID_HERE";

    if (!projectId || projectId === "YOUR_DEFAULT_PROJECT_ID_HERE") {
      return NextResponse.json({ 
        error: 'Procore project ID required. Please provide procoreProjectId in the sync dialog, or contact your admin to set up a default project ID in Procore integration settings.' 
      }, { status: 400 });
    }

    // Sync each timesheet to Procore
    for (const row of filteredTimesheets) {
      const { timesheet, contractor } = row;
      
      try {
        const timecardEntry: ProcoreTimecardEntry = {
          timecard_entry: {
            hours: timesheet.timeSpent,
            date: timesheet.date,
            description: timesheet.jobDescription || undefined,
            billable: true,
          }
        };

        // Make API call to Procore with automatic token refresh
        const procoreResponse = await authService.makeAuthenticatedRequest(
          companyId,
          `/rest/v1.0/projects/${projectId}/timecard_entries`,
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
          errors.push({
            timesheetId: timesheet.id,
            employee: timesheet.employee,
            status: 'error',
            error: `Procore API error: ${procoreResponse.status} - ${errorData}`,
          });
        }
      } catch (error) {
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