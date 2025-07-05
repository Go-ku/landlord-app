// lib/email.js
import nodemailer from 'nodemailer';


// Create transporter (configure based on your email service)
const transporter = nodemailer.createTransport({
  // Configure your email service here
  // Example for Gmail:
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
  // Or for custom SMTP:
  // host: process.env.SMTP_HOST,
  // port: process.env.SMTP_PORT,
  // secure: false,
  // auth: {
  //   user: process.env.SMTP_USER,
  //   pass: process.env.SMTP_PASSWORD
  // }
});

export default async function sendApprovalNotificationEmail({
  tenantEmail,
  tenantName,
  landlordName,
  propertyAddress,
  responseMessage,
  nextSteps,
  propertyRequestId
}) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Property Request Approved</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .property-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10B981; }
        .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Property Request Approved!</h1>
        </div>
        <div class="content">
          <p>Dear ${tenantName},</p>
          
          <p>Great news! Your property request has been <strong>approved</strong> by ${landlordName}.</p>
          
          <div class="property-info">
            <h3>Property Details:</h3>
            <p><strong>Address:</strong> ${propertyAddress}</p>
            <p><strong>Landlord:</strong> ${landlordName}</p>
          </div>
          
          <h3>Landlord's Message:</h3>
          <p style="background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #3B82F6;">
            "${responseMessage}"
          </p>
          
          ${nextSteps ? `
          <h3>Next Steps:</h3>
          <p style="background: #EBF8FF; padding: 15px; border-radius: 6px;">
            ${nextSteps}
          </p>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard/property-requests/${propertyRequestId}" class="button">
              View Request Details
            </a>
          </div>
          
          <p>You can now proceed with the next steps as outlined by your landlord. If you have any questions, please contact them directly.</p>
          
          <p>Best regards,<br>PropertyHub ZM Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message from PropertyHub ZM. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'PropertyHub ZM <noreply@propertyhub.zm>',
    to: tenantEmail,
    subject: `Property Request Approved - ${propertyAddress}`,
    html: emailHtml,
    text: `Dear ${tenantName},

Your property request has been approved by ${landlordName}.

Property: ${propertyAddress}
Landlord's message: "${responseMessage}"

${nextSteps ? `Next steps: ${nextSteps}` : ''}

View full details: ${process.env.NEXTAUTH_URL}/dashboard/property-requests/${propertyRequestId}

Best regards,
PropertyHub ZM Team`
  };

  return transporter.sendMail(mailOptions);
}
