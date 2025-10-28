import sgMail from '@sendgrid/mail';

// Email configuration - NO DEFAULTS, MUST BE CONFIGURED
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

// Validate email configuration on startup
if (!SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY not configured in environment variables");
}
if (!FROM_EMAIL) {
  console.error("❌ SENDGRID_FROM_EMAIL not configured in environment variables");
}

// Initialize SendGrid only if API key is present
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log(`✅ SendGrid initialized with FROM_EMAIL: ${FROM_EMAIL}`);
} else {
  console.warn("⚠️  SendGrid not initialized - SENDGRID_API_KEY missing");
}

const isDevelopment = process.env.NODE_ENV === 'development';

async function handleEmailSend(emailType: string, emailConfig: any): Promise<boolean> {
  try {
    // Validate configuration before sending
    if (!SENDGRID_API_KEY) {
      const errorMsg = 'Email service not configured: SENDGRID_API_KEY missing';
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    if (!FROM_EMAIL) {
      const errorMsg = 'Email service not configured: SENDGRID_FROM_EMAIL missing';
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Send email via SendGrid
    console.log(`📧 Sending ${emailType} email to ${emailConfig.to}...`);
    const result = await sgMail.send(emailConfig);
    console.log(`✅ ${emailType} email sent successfully via SendGrid`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${emailType} email error:`, error.response?.body || error.message || error);
    throw error; // Propagate error to caller so frontend can show it
  }
}

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  businessName: string;
  businessEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  appointmentDuration: number;
  businessColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  businessLogo?: string;
  usePlatformBranding?: boolean;
  bookingUrl?: string; // Unique shareable booking confirmation link
}

export async function sendCustomerConfirmation(data: BookingEmailData): Promise<boolean> {
  console.log('sendCustomerConfirmation called with bookingUrl:', data.bookingUrl);
  
  const primaryColor = data.businessColors?.primary || '#ef4444';
  const secondaryColor = data.businessColors?.secondary || '#f97316';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  const bookingButton = data.bookingUrl ? `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${data.bookingUrl}" style="display: inline-block; background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Booking Details
      </a>
    </div>` : '';
  
  console.log('Generated bookingButton HTML (first 200 chars):', bookingButton?.substring(0, 200));
  console.log('Is bookingButton truthy?', !!bookingButton);
  console.log('Length of bookingButton:', bookingButton?.length);
  
  const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Confirmed!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            Great news! Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been confirmed.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Appointment Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Business:</strong> ${data.businessName}</p>
            ${data.bookingUrl ? `
            <p style="margin: 10px 0 5px 0; color: #4b5563;"><strong>Booking Link:</strong></p>
            <p style="margin: 5px 0; color: #3b82f6; word-break: break-all;"><a href="${data.bookingUrl}" style="color: #3b82f6; text-decoration: underline;">${data.bookingUrl}</a></p>
            ` : ''}
          </div>
          
          ${bookingButton}
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">What's Next?</h3>
            <p style="margin: 5px 0; color: #4b5563;">• You'll receive a reminder email 24 hours before your appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• Please arrive on time for your scheduled appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• Contact us directly if you need to reschedule or cancel</p>
          </div>
          
          ${data.bookingUrl ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 600;">📅 View Your Booking Details</p>
            <p style="margin: 5px 0; color: #92400e;">Click the link below to view or manage your appointment:</p>
            <p style="margin: 10px 0 0 0; color: #065f46; word-break: break-all; font-size: 14px;">
              <a href="${data.bookingUrl}" style="color: #065f46; text-decoration: underline;">${data.bookingUrl}</a>
            </p>
          </div>
          ` : ''}
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            If you need to reschedule or cancel, please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Thank you for choosing ${data.businessName}! We look forward to seeing you.
          </p>
          ${platformBadge}
        </div>
      </div>
    `;
  
  console.log('Full email HTML length:', emailHtml.length);
  console.log('Email HTML contains booking button?', emailHtml.includes('View Booking Details'));
  console.log('Email HTML contains event URL?', emailHtml.includes('localhost:5173/event'));
  console.log('Sending email FROM:', FROM_EMAIL);
  console.log('Sending email TO:', data.customerEmail);
  
  return await handleEmailSend('Customer Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Confirmed - ${data.businessName}`,
    html: emailHtml,
  });
}

export async function sendBusinessNotification(data: BookingEmailData): Promise<boolean> {
  const accentColor = data.businessColors?.accent || '#3b82f6';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `New ${data.appointmentType} Booked - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">New Appointment Booked!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${data.businessName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            You have a new <strong>${data.appointmentType}</strong> booking from <strong>${data.customerName}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${accentColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Booking Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Next Steps</h3>
            <p style="margin: 5px 0; color: #4b5563;">• The customer has received an automatic confirmation</p>
            <p style="margin: 5px 0; color: #4b5563;">• A reminder will be sent 24 hours before the appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• You can manage this booking in your booking page</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.REPLIT_DEV_DOMAIN || 'your-app.replit.app'}/booking" 
               style="background: ${accentColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Bookings
            </a>
          </div>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendAppointmentReminder(data: BookingEmailData): Promise<boolean> {
  const primaryColor = data.businessColors?.primary || '#ef4444';
  const secondaryColor = data.businessColors?.secondary || '#f97316';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Appointment Reminder', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Reminder: Your ${data.appointmentType} appointment tomorrow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">📅 Appointment Reminder</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            This is a friendly reminder that you have a <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> tomorrow.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Appointment Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Preparation Tips</h3>
            <p style="margin: 5px 0; color: #4b5563;">• Please arrive 5 minutes before your scheduled time</p>
            <p style="margin: 5px 0; color: #4b5563;">• Bring any relevant documents or materials</p>
            <p style="margin: 5px 0; color: #4b5563;">• If you need to reschedule, contact us as soon as possible</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            Need to reschedule or cancel? Please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            We look forward to seeing you tomorrow!
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendRescheduleConfirmation(data: BookingEmailData & { 
  oldAppointmentDate: string; 
  oldAppointmentTime: string; 
}): Promise<boolean> {
  const primaryColor = data.businessColors?.primary || '#ef4444';
  const secondaryColor = data.businessColors?.secondary || '#f97316';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Reschedule Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Rescheduled - ${data.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Rescheduled!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been rescheduled.
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">Previous Appointment</h4>
            <p style="margin: 0; color: #78350f; text-decoration: line-through;">${data.oldAppointmentDate} at ${data.oldAppointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">New Appointment Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>New Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">What's Next?</h3>
            <p style="margin: 5px 0; color: #4b5563;">• You'll receive a reminder email 24 hours before your new appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• Please arrive on time for your rescheduled appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• Contact us if you need to make any further changes</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            If you have any questions about the rescheduled appointment, please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Thank you for choosing ${data.businessName}! We look forward to seeing you.
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendRescheduleBusinessNotification(data: BookingEmailData & { 
  oldAppointmentDate: string; 
  oldAppointmentTime: string; 
}): Promise<boolean> {
  const accentColor = data.businessColors?.accent || '#3b82f6';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Reschedule Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `Booking Rescheduled - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${accentColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Rescheduled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hello ${data.businessName} Team,
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            <strong>${data.customerName}</strong> has rescheduled their appointment.
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">Previous Time</h4>
            <p style="margin: 0; color: #78350f; text-decoration: line-through;">${data.oldAppointmentDate} at ${data.oldAppointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${accentColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">New Booking Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>New Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            Please update your calendar and prepare for the rescheduled appointment.
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendCancellationConfirmation(data: BookingEmailData): Promise<boolean> {
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Cancellation Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Cancelled - ${data.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6b7280, #4b5563); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been cancelled as requested.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6b7280; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Cancelled Appointment</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">What's Next?</h3>
            <p style="margin: 5px 0; color: #4b5563;">• You won't receive any further reminders for this appointment</p>
            <p style="margin: 5px 0; color: #4b5563;">• Feel free to book a new appointment whenever convenient</p>
            <p style="margin: 5px 0; color: #4b5563;">• Contact us if you have any questions about the cancellation</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            We hope to see you again soon. Thank you for choosing ${data.businessName}!
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendCancellationBusinessNotification(data: BookingEmailData): Promise<boolean> {
  const accentColor = data.businessColors?.accent || '#3b82f6';
  const logoSection = data.businessLogo ? `
    <div style="text-align: center; margin-bottom: 20px;">
      <img src="${data.businessLogo}" alt="${data.businessName} Logo" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
    </div>` : '';
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by DayWise</span>
    </div>` : '';
  
  return await handleEmailSend('Cancellation Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `Booking Cancelled - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${accentColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hello ${data.businessName} Team,
          </p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
            <strong>${data.customerName}</strong> has cancelled their appointment.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #6b7280; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Cancelled Booking Details</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Was Scheduled For:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
            This time slot is now available for other bookings.
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

// Send verification emails
export async function sendVerificationEmail(email: string, name: string, verificationUrl: string): Promise<boolean> {
  return await handleEmailSend('Email Verification', {
    from: FROM_EMAIL!,
    to: email,
    subject: 'Verify your email address',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #f97316); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
            LOGO
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h1 style="color: #1f2937; margin-bottom: 24px; font-size: 24px; font-weight: 600;">
            Verify your email address
          </h1>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            Hi ${name},
          </p>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            Thank you for signing up! Please click the button below to verify your email address and complete your account setup.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="color: #3b82f6; word-break: break-all; margin-bottom: 24px; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <p style="color: #9ca3af; margin-bottom: 0; font-size: 14px;">
            This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Booking Platform. All rights reserved.</p>
        </div>
        
      </body>
      </html>
    `
  });
}

export async function sendPasswordResetEmail(email: string, name: string, resetUrl: string): Promise<boolean> {
  return await handleEmailSend('Password Reset', {
    from: FROM_EMAIL!,
    to: email,
    subject: 'Reset your password - DayWise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444, #f97316); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
            DW
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h1 style="color: #1f2937; margin-bottom: 24px; font-size: 24px; font-weight: 600;">
            Reset your password
          </h1>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            Hi ${name},
          </p>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            We received a request to reset your password. Click the button below to choose a new password:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #ef4444, #f97316); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="color: #ef4444; word-break: break-all; margin-bottom: 24px; font-size: 14px;">
            ${resetUrl}
          </p>
          
          <p style="color: #9ca3af; margin-bottom: 0; font-size: 14px;">
            This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} DayWise. All rights reserved.</p>
        </div>
        
      </body>
      </html>
    `
  });
}

export async function sendCustomerReminder(data: BookingEmailData): Promise<boolean> {
  return await handleEmailSend("Customer Reminder", {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Reminder: Your appointment is tomorrow with ${data.businessName}`,
    html: `<p>Hi ${data.customerName}, this is a reminder for your ${data.appointmentType} tomorrow at ${data.appointmentTime}.</p>`
  });
}

export async function sendBusinessReminder(data: BookingEmailData): Promise<boolean> {
  return await handleEmailSend("Business Reminder", {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `Reminder: You have an appointment tomorrow (${data.appointmentType})`,
    html: `<p>${data.businessName}, reminder: ${data.customerName} has an appointment tomorrow at ${data.appointmentTime}.</p>`
  });
}

interface FeedbackEmailData {
  name: string;
  email: string;
  message: string;
}

export async function sendFeedbackEmail(data: FeedbackEmailData): Promise<boolean> {
  return await handleEmailSend('Feedback Submission', {
    from: FROM_EMAIL!, // Must use verified sender email
    to: FROM_EMAIL!, // Send to SENDGRID_FROM_EMAIL
    replyTo: data.email, // Set reply-to as user's email so you can reply directly
    subject: `Feedback from ${data.name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Feedback</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6, #1d4ed8); border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
            💬
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h1 style="color: #1f2937; margin-bottom: 24px; font-size: 24px; font-weight: 600;">
            New Feedback Received
          </h1>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 24px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Contact Information</h3>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Name:</strong> ${data.name}</p>
            <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${data.email}</p>
          </div>
          
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
            <h3 style="margin: 0 0 15px 0; color: #1f2937;">Message</h3>
            <p style="margin: 0; color: #4b5563; white-space: pre-wrap;">${data.message}</p>
          </div>
          
          <p style="color: #9ca3af; margin: 0; font-size: 14px; text-align: center;">
            You can reply directly to this email to respond to ${data.name}
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} DayWise Feedback System</p>
        </div>
        
      </body>
      </html>
    `,
  });
}