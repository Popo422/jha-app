import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import { sendEndOfDayReminder } from '@/lib/services/email';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {

    // Get current time
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

    // Find start-of-day-v2 submissions from 4-5 hours ago that don't have corresponding end-of-day submissions
    const startOfDaySubmissions = await db
      .select({
        id: submissions.id,
        completedBy: submissions.completedBy,
        projectName: submissions.projectName,
        createdAt: submissions.createdAt,
        formData: submissions.formData
      })
      .from(submissions)
      .where(
        and(
          eq(submissions.submissionType, 'start-of-day-v2'),
          gte(submissions.createdAt, fiveHoursAgo),
          lte(submissions.createdAt, fourHoursAgo)
        )
      );

    console.log(`Found ${startOfDaySubmissions.length} start-of-day submissions from 4-5 hours ago`);

    const remindersToSend = [];
    
    // Check each start-of-day submission for corresponding end-of-day submission
    for (const submission of startOfDaySubmissions) {
      // Parse form data to get contractor email
      const formData = submission.formData as any;
      const contractorEmail = formData?.contractorEmail || formData?.email;
      
      if (!contractorEmail) {
        console.log(`No email found for submission ${submission.id}`);
        continue;
      }

      const endOfDaySubmission = await db
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.submissionType, 'end-of-day-v2'),
            eq(submissions.completedBy, submission.completedBy),
            eq(submissions.projectName, submission.projectName),
            gte(submissions.createdAt, submission.createdAt)
          )
        )
        .limit(1);

      // If no end-of-day submission found, add to reminders
      if (endOfDaySubmission.length === 0) {
        remindersToSend.push({
          to: contractorEmail,
          contractorName: submission.completedBy,
          projectName: submission.projectName,
          submissionDate: submission.createdAt.toLocaleDateString(),
          submissionTime: submission.createdAt.toISOString()
        });
      }
    }

    console.log(`Sending ${remindersToSend.length} end-of-day reminders`);

    // Send reminder emails
    const emailPromises = remindersToSend.map(async (reminder) => {
      try {
        const result = await sendEndOfDayReminder(reminder);
        return { email: reminder.to, success: true, messageId: result.messageId };
      } catch (error) {
        console.error(`Failed to send reminder to ${reminder.to}:`, error);
        return { email: reminder.to, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(emailPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: 'End-of-day reminders processed',
      total: remindersToSend.length,
      successful,
      failed,
      results
    });

  } catch (error) {
    console.error('Error in start-of-day reminders cron job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}