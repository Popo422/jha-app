import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EndOfDayReminderParams {
  to: string;
  contractorName: string;
  projectName: string;
  submissionDate: string;
  submissionTime: string;
}

export async function sendEndOfDayReminder(params: EndOfDayReminderParams) {
  const { to, contractorName, projectName, submissionDate, submissionTime } = params;
  
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }

  if (!process.env.SENDGRID_FROM_EMAIL) {
    throw new Error('SENDGRID_FROM_EMAIL environment variable is not set');
  }

  const submissionDateTime = new Date(submissionTime);
  const formattedTime = submissionDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `Reminder: Complete End of Day Report for ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; margin-bottom: 20px;">End of Day Report Reminder</h1>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 15px;">
            Hi ${contractorName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            This is a friendly reminder that you submitted a Start of Day report for <strong>${projectName}</strong> 
            on ${submissionDate} at ${formattedTime}, and it's now time to complete your End of Day report.
          </p>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-weight: 500;">
              ⏰ Please complete your End of Day V2 form to document your work completion and any important notes.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/contractor-forms/end-of-day-v2" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; 
                      border-radius: 6px; font-weight: 500; display: inline-block;">
              Complete End of Day Report
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
            If you have any questions or need assistance, please contact your supervisor or administrator.
          </p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            This is an automated reminder sent 4 hours after your Start of Day submission.
          </p>
        </div>
      </div>
    `,
    text: `
      Hi ${contractorName},
      
      This is a reminder that you submitted a Start of Day report for ${projectName} on ${submissionDate} at ${formattedTime}, and it's now time to complete your End of Day report.
      
      Please complete your End of Day V2 form to document your work completion and any important notes.
      
      Visit: ${process.env.NEXT_PUBLIC_APP_URL}/contractor-forms/end-of-day-v2
      
      If you have any questions, please contact your supervisor or administrator.
      
      This is an automated reminder sent 4 hours after your Start of Day submission.
    `
  };

  try {
    const response = await sgMail.send(msg);
    console.log('End of day reminder sent successfully:', response[0].statusCode);
    return {
      success: true,
      messageId: response[0].headers['x-message-id']
    };
  } catch (error) {
    console.error('Error sending end of day reminder:', error);
    throw error;
  }
}