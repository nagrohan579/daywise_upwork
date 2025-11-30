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
    await sgMail.send(emailConfig);
    console.log(`✅ ${emailType} email sent successfully via SendGrid`);
    return true;
  } catch (error: any) {
    const errorDetail = error.response?.body || error.message || error;
    console.error(`❌ ${emailType} email error:`, errorDetail);
    throw new Error(`Failed to send ${emailType} email: ${JSON.stringify(errorDetail)}`);
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

function renderLogoSection(logoUrl?: string, businessName?: string) {
  if (!logoUrl) {
    return '';
  }

  const safeBusinessName = businessName || 'Business';

  return `
    <div style="width: 100%; min-height: 80px; max-height: 120px; margin-bottom: 21px; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; overflow: hidden;">
      <img src="${logoUrl}" alt="${safeBusinessName} Logo" style="max-width: calc(100% - 40px); max-height: calc(100% - 40px); width: auto; height: auto; object-fit: contain; display: block;" />
    </div>`;
}

export async function sendCustomerConfirmation(data: BookingEmailData): Promise<boolean> {
  console.log('sendCustomerConfirmation called with bookingUrl:', data.bookingUrl);

  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';
  const bookingButton = data.bookingUrl ? `
    <div style="text-align: center; margin: 25px 0;">
      <a href="${data.bookingUrl}" style="display: inline-block; background: ${primaryColor}; color: #FFF; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Booking Details
      </a>
    </div>` : '';

  console.log('Generated bookingButton HTML (first 200 chars):', bookingButton?.substring(0, 200));
  console.log('Is bookingButton truthy?', !!bookingButton);
  console.log('Length of bookingButton:', bookingButton?.length);

  const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Appointment Confirmed!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            Great news! Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been confirmed.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Appointment Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor}"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor}"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: ${secondaryColor}"><strong>Business:</strong> ${data.businessName}</p>
            ${data.bookingUrl ? `
            <p style="margin: 10px 0 5px 0; color: ${secondaryColor}"><strong>Booking Link:</strong></p>
            <p style="margin: 5px 0; color: ${primaryColor}; word-break: break-all;"><a href="${data.bookingUrl}" style="color: ${primaryColor}; text-decoration: underline;">${data.bookingUrl}</a></p>
            ` : ''}
          </div>
          
          ${bookingButton}
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">What's Next?</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};">• You'll receive a reminder email 24 hours before your appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Please arrive on time for your scheduled appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Contact us directly if you need to reschedule or cancel</p>
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
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            If you need to reschedule or cancel, please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: ${secondaryColor};">
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
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `New ${data.appointmentType} Booked - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">New Appointment Booked!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.businessName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            You have a new <strong>${data.appointmentType}</strong> booking from <strong>${data.customerName}</strong>.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Booking Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Next Steps</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};">• The customer has received an automatic confirmation</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• A reminder will be sent 24 hours before the appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• You can manage this booking in your booking page</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.REPLIT_DEV_DOMAIN || 'your-app.replit.app'}/booking" 
               style="background: ${primaryColor}; color: #FFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Appointment Reminder', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Reminder: Your ${data.appointmentType} appointment tomorrow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Appointment Reminder</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            This is a friendly reminder that you have a <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> tomorrow.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Appointment Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            Need to reschedule or cancel? Please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: ${secondaryColor};">
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
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Reschedule Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Rescheduled - ${data.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Appointment Rescheduled!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been rescheduled.
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">Previous Appointment</h4>
            <p style="margin: 0; color: #78350f; text-decoration: line-through;">${data.oldAppointmentDate} at ${data.oldAppointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">New Appointment Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>New Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">What's Next?</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};">• You'll receive a reminder email 24 hours before your new appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Please arrive on time for your rescheduled appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Contact us if you need to make any further changes</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            If you have any questions about the rescheduled appointment, please contact ${data.businessName} directly.
          </p>
          
          <p style="font-size: 14px; color: ${secondaryColor};">
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
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Reschedule Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `Booking Rescheduled - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Booking Rescheduled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hello ${data.businessName} Team,
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            <strong>${data.customerName}</strong> has rescheduled their appointment.
          </p>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <h4 style="margin: 0 0 10px 0; color: #92400e;">Previous Time</h4>
            <p style="margin: 0; color: #78350f; text-decoration: line-through;">${data.oldAppointmentDate} at ${data.oldAppointmentTime}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">New Booking Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>New Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            Please update your calendar and prepare for the rescheduled appointment.
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendCancellationConfirmation(data: BookingEmailData): Promise<boolean> {
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Cancellation Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Cancelled - ${data.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${secondaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            Your <strong>${data.appointmentType}</strong> appointment with <strong>${data.businessName}</strong> has been cancelled as requested.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${secondaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Cancelled Appointment</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Business:</strong> ${data.businessName}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">What's Next?</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};">• You won't receive any further reminders for this appointment</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Feel free to book a new appointment whenever convenient</p>
            <p style="margin: 5px 0; color: ${secondaryColor};">• Contact us if you have any questions about the cancellation</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            We hope to see you again soon. Thank you for choosing ${data.businessName}!
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendCancellationBusinessNotification(data: BookingEmailData): Promise<boolean> {
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';
  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Cancellation Business Notification', {
    from: FROM_EMAIL!,
    to: data.businessEmail,
    subject: `Booking Cancelled - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: #FFF; margin: 0; font-size: 28px;">Booking Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hello ${data.businessName} Team,
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            <strong>${data.customerName}</strong> has cancelled their appointment.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${secondaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor};">Cancelled Booking Details</h3>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Customer:</strong> ${data.customerName}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Email:</strong> ${data.customerEmail}</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 5px 0; color: ${secondaryColor};"><strong>Was Scheduled For:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            This time slot is now available for other bookings.
          </p>
          ${platformBadge}
        </div>
      </div>
    `,
  });
}

export async function sendBusinessCancellationConfirmation(data: BookingEmailData): Promise<boolean> {
  const primaryColor = '#0053F1';
  const secondaryColor = '#64748B';
  const textColor = '#121212';

  const logoSection = renderLogoSection(data.businessLogo, data.businessName);
  const platformBadge = data.usePlatformBranding ? `
    <div style="text-align: center; margin-top: 20px;">
      <span style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 4px 8px; border-radius: 12px;">Powered by Daywise</span>
    </div>` : '';

  return await handleEmailSend('Business Cancellation Confirmation', {
    from: FROM_EMAIL!,
    to: data.customerEmail,
    subject: `Appointment Cancelled - ${data.businessName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${primaryColor}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          ${logoSection}
          <h1 style="color: white; margin: 0; font-size: 28px;">Appointment Cancelled</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 20px;">
            Hi ${data.customerName},
          </p>
          
          <p style="font-size: 16px; color: ${textColor}; margin-bottom: 25px;">
            Your appointment has been canceled. If you paid, the business will handle refunds directly.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: ${textColor}; font-size: 18px;">Cancelled Appointment Details</h3>
            <p style="margin: 8px 0; color: ${secondaryColor}; font-size: 14px;"><strong style="color: ${textColor};">Service:</strong> ${data.appointmentType} (${data.appointmentDuration} minutes)</p>
            <p style="margin: 8px 0; color: ${secondaryColor}; font-size: 14px;"><strong style="color: ${textColor};">Date & Time:</strong> ${data.appointmentDate} at ${data.appointmentTime}</p>
            <p style="margin: 8px 0; color: ${secondaryColor}; font-size: 14px;"><strong style="color: ${textColor};">Business:</strong> ${data.businessName}</p>
          </div>
          
          <p style="font-size: 14px; color: ${secondaryColor}; margin-bottom: 20px;">
            If you have any questions about this cancellation or need to reschedule, please contact ${data.businessName} directly.
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
          <div style="display: inline-block; width: 60px; height: 60px; background: #0053F1; border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
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
               style="display: inline-block; background: #0053F1; color: #FFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Verify Email Address
            </a>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="color: #0053F1; word-break: break-all; margin-bottom: 24px; font-size: 14px;">
            ${verificationUrl}
          </p>
          
          <p style="color: #9ca3af; margin-bottom: 0; font-size: 14px;">
            This verification link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} Daywise Booking. All rights reserved.</p>
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
          <div style="display: inline-block; width: 60px; height: 60px; background: #0053F1; border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
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
               style="display: inline-block; background: #0053F1; color: #FFF; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          
          <p style="color: #0053F1; word-break: break-all; margin-bottom: 24px; font-size: 14px;">
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
          <div style="display: inline-block; width: 60px; height: 60px; background: #0053F1; border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
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

export async function sendEmailChangeOtp(email: string, otp: string): Promise<boolean> {
  return await handleEmailSend('Email Change OTP', {
    from: FROM_EMAIL!,
    to: email,
    subject: 'Verify your new email address - DayWise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Change Verification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: #0053F1; border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
            ✉️
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h1 style="color: #1f2937; margin-bottom: 24px; font-size: 24px; font-weight: 600;">
            Verify Your New Email Address
          </h1>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            You requested to change your email address. Please use the verification code below to confirm your new email:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #0053F1; color: white; padding: 20px 40px; border-radius: 8px; font-weight: 600; font-size: 32px; letter-spacing: 8px;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            Enter this code in the email change verification form to complete the process.
          </p>
          
          <p style="color: #9ca3af; margin-bottom: 0; font-size: 14px;">
            This verification code will expire in 10 minutes. If you didn't request this change, please ignore this email.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} DayWise. All rights reserved.</p>
        </div>
        
      </body>
      </html>
    `,
  });
}

export async function sendPasswordChangeOtp(email: string, otp: string): Promise<boolean> {
  return await handleEmailSend('Password Change OTP', {
    from: FROM_EMAIL!,
    to: email,
    subject: 'Verify your identity to change password - DayWise',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Change Verification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="display: inline-block; width: 60px; height: 60px; background: #0053F1; border-radius: 12px; color: white; font-weight: bold; font-size: 24px; line-height: 60px;">
            🔒
          </div>
        </div>

        <div style="background: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <h1 style="color: #1f2937; margin-bottom: 24px; font-size: 24px; font-weight: 600;">
            Verify Your Identity
          </h1>
          
          <p style="color: #6b7280; margin-bottom: 24px; font-size: 16px;">
            You requested to change your password. Please use the verification code below to verify your identity:
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <div style="display: inline-block; background: #0053F1; color: white; padding: 20px 40px; border-radius: 8px; font-weight: 600; font-size: 32px; letter-spacing: 8px;">
              ${otp}
            </div>
          </div>
          
          <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
            Enter this code in the password change verification form to continue.
          </p>
          
          <p style="color: #9ca3af; margin-bottom: 0; font-size: 14px;">
            This verification code will expire in 10 minutes. If you didn't request a password change, please ignore this email and consider securing your account.
          </p>
          
        </div>
        
        <div style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} DayWise. All rights reserved.</p>
        </div>
        
      </body>
      </html>
    `,
  });
}