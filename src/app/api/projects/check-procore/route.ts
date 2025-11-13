import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { ProcoreAuthService } from '@/lib/integrations/procore/auth';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface CheckProjectsRequest {
  projectIds?: string[]; // Optional: check specific projects, or all if not provided
}

interface ProjectCheckResult {
  projectId: string;
  projectName: string;
  location: string;
  projectManager: string;
  procoreStatus: 'found' | 'not_found' | 'multiple_matches';
  procoreProject?: {
    id: string;
    name: string;
    address: string;
    project_number?: string;
  };
  procoreMatches?: Array<{
    id: string;
    name: string;
    address: string;
    project_number?: string;
    similarity: number; // 0-100 score
  }>;
  recommendation: 'use_existing' | 'create_new' | 'manual_review';
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await validateAdminSession(request);
    
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body: CheckProjectsRequest = await request.json();
    const { projectIds } = body;

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

    // Get projects to check
    let projectsToCheck;
    if (projectIds && projectIds.length > 0) {
      projectsToCheck = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.companyId, companyId)
          )
        );
      projectsToCheck = projectsToCheck.filter(p => projectIds.includes(p.id));
    } else {
      // Check all projects
      projectsToCheck = await db
        .select()
        .from(projects)
        .where(eq(projects.companyId, companyId));
    }

    if (projectsToCheck.length === 0) {
      return NextResponse.json({ 
        error: 'No projects found to check' 
      }, { status: 400 });
    }

    // Fetch all Procore projects with automatic token refresh
    const procoreResponse = await authService.makeAuthenticatedRequest(
      companyId,
      `/rest/v1.0/companies/${integration.procoreCompanyId}/projects`,
      {
        headers: {
          'Procore-Company-Id': integration.procoreCompanyId,
        },
      }
    );

    if (!procoreResponse.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch Procore projects: ${procoreResponse.status}` 
      }, { status: 400 });
    }

    const procoreProjects = await procoreResponse.json();

    console.log('Procore projects data:', JSON.stringify(procoreProjects.slice(0, 2), null, 2));

    // Check each project
    const results: ProjectCheckResult[] = [];

    console.log('Projects to check:', projectsToCheck.map(p => ({ id: p.id, name: p.name, location: p.location })));

    for (const project of projectsToCheck) {
      // Check if project name already exists in Procore
      const exactMatch = procoreProjects.find((pp: any) => 
        pp.name && project.name && pp.name.toLowerCase().trim() === project.name.toLowerCase().trim()
      );

      let status: 'found' | 'not_found' | 'multiple_matches' = 'not_found';
      let recommendation: 'use_existing' | 'create_new' | 'manual_review' = 'create_new';
      let procoreProject = undefined;
      let matches: any[] = [];

      if (exactMatch) {
        status = 'found';
        recommendation = 'use_existing';
        procoreProject = {
          id: exactMatch.id,
          name: exactMatch.name,
          address: exactMatch.address ? 
            `${exactMatch.address.street || ''} ${exactMatch.address.city || ''} ${exactMatch.address.state_code || ''} ${exactMatch.address.zip || ''}`.trim() : '',
          project_number: exactMatch.project_number
        };
        matches = [procoreProject];
      } else {
        status = 'not_found';
        recommendation = 'create_new';
      }

      results.push({
        projectId: project.id,
        projectName: project.name,
        location: project.location,
        projectManager: project.projectManager,
        procoreStatus: status,
        procoreProject,
        procoreMatches: matches,
        recommendation,
      });
    }

    // Summary stats
    const summary = {
      total: results.length,
      found: results.filter(r => r.procoreStatus === 'found').length,
      notFound: results.filter(r => r.procoreStatus === 'not_found').length,
      needsReview: results.filter(r => r.procoreStatus === 'multiple_matches').length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error('Error checking projects in Procore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}