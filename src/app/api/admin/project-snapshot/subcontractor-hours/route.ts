import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheets, subcontractors, subcontractorProjects } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'

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

function authenticateAdminRequest(request: NextRequest) {
  const adminToken = request.cookies.get('adminAuthToken')?.value || 
                    (request.headers.get('Authorization')?.startsWith('AdminBearer ') ? 
                     request.headers.get('Authorization')?.replace('AdminBearer ', '') : null)
  
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as AdminTokenPayload
      if (decoded.admin && decoded.isAdmin) {
        return decoded.admin
      }
    } catch (error) {
      throw new Error('Invalid admin token')
    }
  }
  throw new Error('No admin authentication token found')
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin request
    let admin: AdminTokenPayload['admin']
    try {
      admin = authenticateAdminRequest(request)
    } catch (error) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')
    const project = searchParams.get('project')
    const subcontractor = searchParams.get('subcontractor')

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 })
    }

    // If filtering by project, we need to include subcontractors assigned to that project
    // even if they haven't submitted timesheets yet
    if (project) {
      // First get the project ID from the project name
      const projectResult = await db
        .select({ id: sql<string>`id` })
        .from(sql`projects`)
        .where(and(
          sql`name = ${project}`,
          sql`company_id = ${companyId}`
        ))
        .limit(1);

      if (projectResult.length === 0) {
        return NextResponse.json({
          subcontractorHours: [],
          summary: {
            totalHours: 0,
            totalSubcontractors: 0,
            avgHoursPerSubcontractor: 0,
            topSubcontractor: null
          },
          filters: { project, subcontractor: subcontractor || null }
        });
      }

      const projectId = projectResult[0].id;

      // Query subcontractors assigned to this specific project
      const results = await db
        .select({
          subcontractor: subcontractors.name,
          foreman: subcontractors.foreman,
          totalHours: sql<number>`coalesce(sum(${timesheets.timeSpent}::numeric), 0)`,
          uniqueEmployees: sql<number>`count(distinct ${timesheets.employee})`,
          entriesCount: sql<number>`count(${timesheets.id})`,
          avgHoursPerEmployee: sql<number>`CASE WHEN count(distinct ${timesheets.employee}) > 0 THEN coalesce(sum(${timesheets.timeSpent}::numeric), 0) / count(distinct ${timesheets.employee}) ELSE 0 END`,
          projectsList: sql<string>`coalesce(string_agg(distinct ${timesheets.projectName}, ', '), ${project})`,
          latestDate: sql<string>`max(${timesheets.date})`
        })
        .from(subcontractors)
        .innerJoin(subcontractorProjects, eq(subcontractors.id, subcontractorProjects.subcontractorId))
        .leftJoin(timesheets, and(
          eq(subcontractors.name, timesheets.company),
          eq(timesheets.status, 'approved'),
          eq(timesheets.companyId, companyId),
          eq(timesheets.projectName, project)
        ))
        .where(and(
          eq(subcontractors.companyId, companyId),
          eq(subcontractorProjects.projectId, projectId),
          ...(subcontractor ? [eq(subcontractors.name, subcontractor)] : [])
        ))
        .groupBy(subcontractors.name, subcontractors.foreman)
        .orderBy(sql`coalesce(sum(${timesheets.timeSpent}::numeric), 0) desc`);

      // Format results for project-specific query
      const formattedResults = results.map(row => ({
        subcontractor: row.subcontractor,
        foreman: row.foreman || 'N/A',
        totalHours: parseFloat(row.totalHours.toString()),
        uniqueEmployees: parseInt(row.uniqueEmployees.toString()),
        entriesCount: parseInt(row.entriesCount.toString()),
        avgHoursPerEmployee: parseFloat(row.avgHoursPerEmployee.toString()),
        projectsList: row.projectsList || project,
        latestDate: row.latestDate
      }));

      // Calculate summary statistics
      const totalHours = formattedResults.reduce((sum, item) => sum + item.totalHours, 0);
      const totalSubcontractors = formattedResults.length;
      const avgHoursPerSubcontractor = totalSubcontractors > 0 ? totalHours / totalSubcontractors : 0;
      const topSubcontractor = formattedResults.find(s => s.totalHours > 0) || (formattedResults.length > 0 ? formattedResults[0] : null);

      return NextResponse.json({
        subcontractorHours: formattedResults,
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          totalSubcontractors,
          avgHoursPerSubcontractor: Math.round(avgHoursPerSubcontractor * 100) / 100,
          topSubcontractor: topSubcontractor ? {
            name: topSubcontractor.subcontractor,
            hours: topSubcontractor.totalHours,
            employees: topSubcontractor.uniqueEmployees
          } : null
        },
        filters: {
          project: project || null,
          subcontractor: subcontractor || null
        }
      });
    }

    // Original query for when no project filter is applied (admin/project-snapshot page)
    const results = await db
      .select({
        subcontractor: subcontractors.name,
        foreman: subcontractors.foreman,
        totalHours: sql<number>`coalesce(sum(${timesheets.timeSpent}::numeric), 0)`,
        uniqueEmployees: sql<number>`count(distinct ${timesheets.employee})`,
        entriesCount: sql<number>`count(${timesheets.id})`,
        avgHoursPerEmployee: sql<number>`CASE WHEN count(distinct ${timesheets.employee}) > 0 THEN coalesce(sum(${timesheets.timeSpent}::numeric), 0) / count(distinct ${timesheets.employee}) ELSE 0 END`,
        projectsList: sql<string>`string_agg(distinct ${timesheets.projectName}, ', ')`,
        latestDate: sql<string>`max(${timesheets.date})`
      })
      .from(subcontractors)
      .leftJoin(timesheets, and(
        eq(subcontractors.name, timesheets.company),
        eq(timesheets.status, 'approved'),
        eq(timesheets.companyId, companyId),
        ...(subcontractor ? [eq(subcontractors.name, subcontractor)] : [])
      ))
      .where(eq(subcontractors.companyId, companyId))
      .groupBy(subcontractors.name, subcontractors.foreman)
      .orderBy(sql`coalesce(sum(${timesheets.timeSpent}::numeric), 0) desc`)

    // Format results
    const formattedResults = results.map(row => ({
      subcontractor: row.subcontractor,
      foreman: row.foreman || 'N/A',
      totalHours: parseFloat(row.totalHours.toString()),
      uniqueEmployees: parseInt(row.uniqueEmployees.toString()),
      entriesCount: parseInt(row.entriesCount.toString()),
      avgHoursPerEmployee: parseFloat(row.avgHoursPerEmployee.toString()),
      projectsList: row.projectsList || 'N/A',
      latestDate: row.latestDate
    }))

    // Calculate summary statistics
    const totalHours = formattedResults.reduce((sum, item) => sum + item.totalHours, 0)
    const totalSubcontractors = formattedResults.length
    const avgHoursPerSubcontractor = totalSubcontractors > 0 ? totalHours / totalSubcontractors : 0
    const topSubcontractor = formattedResults.length > 0 ? formattedResults[0] : null

    return NextResponse.json({
      subcontractorHours: formattedResults,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalSubcontractors,
        avgHoursPerSubcontractor: Math.round(avgHoursPerSubcontractor * 100) / 100,
        topSubcontractor: topSubcontractor ? {
          name: topSubcontractor.subcontractor,
          hours: topSubcontractor.totalHours,
          employees: topSubcontractor.uniqueEmployees
        } : null
      },
      filters: {
        project: project || null,
        subcontractor: subcontractor || null
      }
    })
  } catch (error) {
    console.error('Error fetching subcontractor hours:', error)
    return NextResponse.json({ error: 'Failed to fetch subcontractor hours data' }, { status: 500 })
  }
}