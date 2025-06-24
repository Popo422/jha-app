import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, employee, company, jobSite, jobDescription, timeSpent } = body;

    if (!date || !employee || !company || !jobSite || !jobDescription || !timeSpent) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const timeSpentNumber = parseFloat(timeSpent);
    if (isNaN(timeSpentNumber) || timeSpentNumber < 0) {
      return NextResponse.json(
        { error: 'Time spent must be a valid positive number' },
        { status: 400 }
      );
    }

    const userId = 'user-placeholder'; // TODO: Get from auth context

    const result = await db.insert(timesheets).values({
      userId,
      date,
      employee,
      company,
      jobSite,
      jobDescription,
      timeSpent: timeSpentNumber.toString(),
    }).returning();

    return NextResponse.json(
      { 
        message: 'Timesheet submitted successfully',
        id: result[0].id 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const results = await db.select().from(timesheets).limit(limit).offset(offset);

    return NextResponse.json({
      timesheets: results,
      meta: {
        limit,
        offset,
        userId: 'user-placeholder' // TODO: Get from auth context
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}