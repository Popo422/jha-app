import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { submissions, timesheets, projects } from '@/lib/db/schema';
import { eq, and, or, gte, lte, sql, count } from 'drizzle-orm';

interface IncidentFormData {
  injuredEmployee?: string;
  injuredParty?: string;
  description?: string;
  severity?: 'minor' | 'moderate' | 'major' | 'critical';
  status?: 'reported' | 'investigating' | 'closed';
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  const validation = await validateAdminSession(request);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const companyId = validation.company?.id;
  if (!companyId) {
    return NextResponse.json({ error: 'Company not found' }, { status: 400 });
  }

  // Get optional project filtering
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  try {
    // Get date ranges for calculations
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentYear = now.getFullYear();

    // Base condition for incidents
    const incidentConditions = [
      eq(submissions.companyId, companyId),
      or(
        eq(submissions.submissionType, 'incident-report'),
        eq(submissions.submissionType, 'quick-incident-report')
      )
    ];

    // Base condition for near misses
    const nearMissConditions = [
      eq(submissions.companyId, companyId),
      eq(submissions.submissionType, 'near-miss-report')
    ];

    // Add project filtering if projectId is provided
    if (projectId) {
      // Get project name from projectId
      const project = await db
        .select({ name: projects.name })
        .from(projects)
        .where(and(
          eq(projects.id, projectId),
          eq(projects.companyId, companyId)
        ))
        .limit(1);
      
      const projectName = project[0]?.name;
      if (projectName) {
        incidentConditions.push(eq(submissions.projectName, projectName));
        nearMissConditions.push(eq(submissions.projectName, projectName));
      }
    }

    // 1. Recent Incidents (last 30 days)
    const recentIncidentsResult = await db
      .select({ count: count() })
      .from(submissions)
      .where(and(
        ...incidentConditions,
        gte(submissions.createdAt, thirtyDaysAgo)
      ));
    
    const recentIncidents = recentIncidentsResult[0]?.count || 0;

    // 2. Needs Attention (incidents with status 'reported' or 'investigating')
    const needsAttentionResult = await db
      .select({ count: count() })
      .from(submissions)  
      .where(and(
        ...incidentConditions,
        or(
          sql`${submissions.formData}->>'status' = 'reported'`,
          sql`${submissions.formData}->>'status' = 'investigating'`,
          sql`${submissions.formData}->>'status' IS NULL` // Default to reported if no status
        )
      ));
    
    const needsAttention = needsAttentionResult[0]?.count || 0;

    // 3. Near Misses (all time)
    const nearMissesResult = await db
      .select({ count: count() })
      .from(submissions)
      .where(and(...nearMissConditions));
    
    const nearMisses = nearMissesResult[0]?.count || 0;

    // 4. TRIR calculation using real timesheet data (same as admin stats)
    const currentYearStart = new Date(currentYear, 0, 1);
    
    // Get recordable incidents for the year
    const [yearlyIncidentsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(and(
        eq(submissions.companyId, companyId),
        gte(submissions.createdAt, currentYearStart),
        sql`${submissions.submissionType} IN ('incident-report', 'quick-incident-report')`
      ));
    
    // Get total approved man hours for the year from timesheets
    const [totalManHoursThisYear] = await db
      .select({ totalHours: sql<number>`COALESCE(SUM(${timesheets.timeSpent}), 0)` })
      .from(timesheets)
      .where(and(
        eq(timesheets.companyId, companyId),
        eq(timesheets.status, 'approved'),
        gte(timesheets.createdAt, currentYearStart)
      ));
    
    // Calculate TRIR: (Number of Incidents × 200,000) / total number of hours worked in a year
    const trir = totalManHoursThisYear.totalHours > 0 
      ? (yearlyIncidentsResult.count * 200000) / totalManHoursThisYear.totalHours
      : 0;

    // Generate action items based on actual data
    const actionItems = [];
    let actionId = 1;

    // Check for unresolved incidents (high priority)
    if (needsAttention > 0) {
      actionItems.push({
        id: actionId++,
        type: 'review' as const,
        title: 'Review Incidents',
        description: `There are ${needsAttention} incidents that need attention.`,
        priority: 'high' as const,
        createdAt: new Date().toISOString()
      });
    }

    // Check for recent high-severity incidents
    const highSeverityResult = await db
      .select({ count: count() })
      .from(submissions)
      .where(and(
        ...incidentConditions,
        gte(submissions.createdAt, sevenDaysAgo),
        or(
          sql`${submissions.formData}->>'severity' = 'major'`,
          sql`${submissions.formData}->>'severity' = 'critical'`
        )
      ));
    
    const highSeverityCount = highSeverityResult[0]?.count || 0;
    
    if (highSeverityCount > 0) {
      actionItems.push({
        id: actionId++,
        type: 'insurance' as const,
        title: 'File Insurance Claim',
        description: `${highSeverityCount} high-severity incident(s) may require insurance claims.`,
        priority: 'high' as const,
        createdAt: new Date().toISOString()
      });
    }

    // Check for incidents requiring follow-up (older than 7 days and still reported)
    const followUpResult = await db
      .select({ count: count() })
      .from(submissions)
      .where(and(
        ...incidentConditions,
        lte(submissions.createdAt, sevenDaysAgo),
        sql`${submissions.formData}->>'status' = 'reported'`
      ));
    
    const followUpCount = followUpResult[0]?.count || 0;
    
    if (followUpCount > 0) {
      actionItems.push({
        id: actionId++,
        type: 'compliance' as const,
        title: 'Follow-up Required',
        description: `${followUpCount} incident(s) reported over a week ago need investigation updates.`,
        priority: 'medium' as const,
        createdAt: new Date().toISOString()
      });
    }

    // Only suggest training if we have meaningful data (at least 3 months of the year + some hours)
    // and TRIR is above industry average (3.0)
    const monthsIntoYear = now.getMonth() + 1; // January = 1, February = 2, etc.
    const hasSignificantData = monthsIntoYear >= 3 && totalManHoursThisYear.totalHours >= 1000;
    
    if (hasSignificantData && trir > 3.0) {
      actionItems.push({
        id: actionId++,
        type: 'training' as const,
        title: 'Safety Training Recommended',
        description: `TRIR of ${trir.toFixed(1)} is above industry average. Consider additional safety training.`,
        priority: 'medium' as const,
        createdAt: new Date().toISOString()
      });
    }

    const metrics = {
      recentIncidents: Number(recentIncidents),
      needsAttention: Number(needsAttention), 
      nearMisses: Number(nearMisses),
      trir: Number(trir.toFixed(1))
    };

    return NextResponse.json({
      metrics,
      actionItems,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching Safety comp data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Safety compensation data' },
      { status: 500 }
    );
  }
}