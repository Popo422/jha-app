import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { timesheets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

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

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Check for admin token first
    let decoded: any;
    let isAdmin = false;
    
    if (authHeader.startsWith('AdminBearer ')) {
      const adminToken = authHeader.substring(12);
      try {
        decoded = jwt.verify(adminToken, JWT_SECRET) as any;
        if (!decoded.isAdmin || !decoded.admin || decoded.admin.role !== 'admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        isAdmin = true;
      } catch (error) {
        return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 });
      }
    } else if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 });
    }

    const { id, date, employee, company, jobSite, jobDescription, timeSpent } = await request.json();

    if (!id || !date || !employee || !company || !jobSite || !jobDescription || !timeSpent) {
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

    // Get the existing timesheet to verify ownership
    const existingTimesheet = await db.select().from(timesheets).where(eq(timesheets.id, id));
    if (!existingTimesheet.length) {
      return NextResponse.json({ error: 'Timesheet not found' }, { status: 404 });
    }

    // Check permissions - admin can edit any timesheet, user can only edit their own
    const userId = isAdmin ? decoded.admin?.id : decoded.user?.id;
    if (!isAdmin && existingTimesheet[0].userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - can only edit your own timesheets' }, { status: 403 });
    }

    // Update the timesheet
    const result = await db.update(timesheets)
      .set({
        date,
        employee,
        company,
        jobSite,
        jobDescription,
        timeSpent: timeSpentNumber.toString(),
        updatedAt: new Date()
      })
      .where(eq(timesheets.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      timesheet: result[0],
      message: 'Timesheet updated successfully'
    });

  } catch (error) {
    console.error('Error updating timesheet:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}