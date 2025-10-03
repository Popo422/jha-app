import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { ProcoreAuthService } from '@/lib/integrations/procore/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface ProcoreProject {
  name: string;
  address: string;
  project_number?: string;
  description?: string;
}

interface SyncProjectsRequest {
  projectIds: string[];
  createInProcore?: boolean; // Create new projects vs just get mapping
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAdminSession(request);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: SyncProjectsRequest = await request.json();
    const { projectIds, createInProcore = false } = body;

    console.log('Sync request received:', { projectIds, createInProcore, companyId: authResult.admin.companyId });

    if (!projectIds || projectIds.length === 0) {
      return NextResponse.json({ error: 'No project IDs provided' }, { status: 400 });
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

    // Get projects to sync
    const projectsToSync = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId));

    const filteredProjects = projectsToSync.filter(p => 
      projectIds.includes(p.id)
    );

    console.log('Projects found to sync:', filteredProjects.map(p => ({ id: p.id, name: p.name, location: p.location })));

    if (filteredProjects.length === 0) {
      return NextResponse.json({ 
        error: 'No projects found for the provided IDs' 
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    if (createInProcore) {
      console.log('Creating projects in Procore...');
      // Create new projects in Procore
      for (const project of filteredProjects) {
        try {
          const procoreProjectData = {
            company_id: parseInt(integration.procoreCompanyId),
            project: {
              name: project.name,
              address: project.location,
              project_number: `JHA-${project.id.slice(0, 8)}`,
              description: `Project managed by ${project.projectManager}`,
              active: true,
              country_code: 'US', // Default to US
            }
          };

          console.log('Creating project in Procore:', procoreProjectData);
          console.log('API endpoint:', `/rest/v1.0/projects`);

          const response = await authService.makeAuthenticatedRequest(
            companyId,
            `/rest/v1.0/projects`,
            {
              method: 'POST',
              headers: {
                'Procore-Company-Id': integration.procoreCompanyId,
              },
              body: JSON.stringify(procoreProjectData),
            }
          );

          console.log('Procore response status:', response.status);
          console.log('Procore response headers:', Object.fromEntries(response.headers.entries()));

          if (response.ok) {
            const procoreData = await response.json();
            console.log('Successfully created project in Procore:', procoreData);
            results.push({
              projectId: project.id,
              projectName: project.name,
              procoreProjectId: procoreData.id,
              status: 'created',
            });
          } else {
            const errorData = await response.text();
            console.log('Failed to create project in Procore:', { status: response.status, error: errorData });
            errors.push({
              projectId: project.id,
              projectName: project.name,
              error: `Procore API error: ${response.status} - ${errorData}`,
            });
          }
        } catch (error) {
          console.log('Exception during project creation:', error);
          errors.push({
            projectId: project.id,
            projectName: project.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    } else {
      // Just fetch existing Procore projects for mapping
      try {
        const response = await authService.makeAuthenticatedRequest(
          companyId,
          `/rest/v1.0/companies/${integration.procoreCompanyId}/projects`,
          {
            headers: {
              'Procore-Company-Id': integration.procoreCompanyId,
            },
          }
        );

        if (response.ok) {
          const procoreProjects = await response.json();
          
          // Try to match by name
          for (const project of filteredProjects) {
            const matchingProcoreProject = procoreProjects.find((pp: any) => 
              pp.name.toLowerCase().includes(project.name.toLowerCase()) ||
              project.name.toLowerCase().includes(pp.name.toLowerCase())
            );

            if (matchingProcoreProject) {
              results.push({
                projectId: project.id,
                projectName: project.name,
                procoreProjectId: matchingProcoreProject.id,
                procoreProjectName: matchingProcoreProject.name,
                status: 'matched',
              });
            } else {
              results.push({
                projectId: project.id,
                projectName: project.name,
                status: 'no_match',
                suggestion: 'Consider creating this project in Procore or manual mapping',
              });
            }
          }
        } else {
          return NextResponse.json({ 
            error: 'Failed to fetch Procore projects' 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ 
          error: 'Error fetching Procore projects' 
        }, { status: 500 });
      }
    }

    // If all projects failed, return error status
    if (results.length === 0 && errors.length > 0) {
      console.log('All projects failed to sync');
      return NextResponse.json({
        success: false,
        message: 'Failed to sync any projects',
        errors,
      }, { status: 400 });
    }

    const responseData = {
      success: true,
      message: `Processed ${filteredProjects.length} projects`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Final sync response:', responseData);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error syncing projects to Procore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}