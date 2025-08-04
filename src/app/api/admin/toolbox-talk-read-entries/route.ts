import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toolboxTalkReadEntries, toolboxTalks } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

// GET - Fetch toolbox talk read entries with enhanced admin data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const toolboxTalkId = searchParams.get('toolboxTalkId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // Build query conditions
    const conditions = [eq(toolboxTalkReadEntries.companyId, companyId)];
    if (toolboxTalkId) {
      conditions.push(eq(toolboxTalkReadEntries.toolboxTalkId, toolboxTalkId));
    }
    if (search) {
      conditions.push(sql`lower(${toolboxTalkReadEntries.readBy}) like lower(${`%${search}%`})`);
    }

    // Build base query with join to get toolbox talk title
    const readEntries = await db
      .select({
        id: toolboxTalkReadEntries.id,
        toolboxTalkId: toolboxTalkReadEntries.toolboxTalkId,
        toolboxTalkTitle: toolboxTalks.title,
        companyId: toolboxTalkReadEntries.companyId,
        readBy: toolboxTalkReadEntries.readBy,
        dateRead: toolboxTalkReadEntries.dateRead,
        signature: toolboxTalkReadEntries.signature,
        createdAt: toolboxTalkReadEntries.createdAt,
        updatedAt: toolboxTalkReadEntries.updatedAt,
      })
      .from(toolboxTalkReadEntries)
      .leftJoin(toolboxTalks, eq(toolboxTalkReadEntries.toolboxTalkId, toolboxTalks.id))
      .where(and(...conditions))
      .orderBy(desc(toolboxTalkReadEntries.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(toolboxTalkReadEntries)
      .where(and(...conditions));
    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Get read statistics
    const statsQuery = await db
      .select({
        toolboxTalkId: toolboxTalkReadEntries.toolboxTalkId,
        toolboxTalkTitle: toolboxTalks.title,
        readCount: sql`count(*)`.as('readCount'),
        latestRead: sql`max(${toolboxTalkReadEntries.createdAt})`.as('latestRead'),
      })
      .from(toolboxTalkReadEntries)
      .leftJoin(toolboxTalks, eq(toolboxTalkReadEntries.toolboxTalkId, toolboxTalks.id))
      .where(eq(toolboxTalkReadEntries.companyId, companyId))
      .groupBy(toolboxTalkReadEntries.toolboxTalkId, toolboxTalks.title)
      .orderBy(desc(sql`count(*)`));

    return NextResponse.json({
      readEntries,
      stats: statsQuery,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('Error fetching admin toolbox talk read entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch read entries' },
      { status: 500 }
    );
  }
}