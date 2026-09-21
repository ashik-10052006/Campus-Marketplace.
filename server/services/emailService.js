const nodemailer = require('nodemailer');

let cachedTransporter = null;

/**
 * Creates or retrieves the nodemailer transporter based on environment variables.
 * Falls back to an ethereal.email test account in real-time if no SMTP credentials are configured.
 */
async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // 1. Custom / Universal SMTP (Brevo, SendGrid, Mailgun, Amazon SES, or custom university SMTP)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return cachedTransporter;
  }

  // 2. Direct Service (e.g. Gmail App Password)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    cachedTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
      },
    });
    return cachedTransporter;
  }

  // 3. Fallback: Ethereal real-time test account for live demonstration without setup
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EmailService] Initialized Ethereal real-time test mailbox for: ${testAccount.user}`);
    return cachedTransporter;
  } catch (err) {
    console.error('[EmailService] Failed to create Ethereal test account:', err.message);
    throw new Error('Email service is currently unavailable.');
  }
}

function getFromAddress() {
  if (process.env.SMTP_FROM) {
    return process.env.SMTP_FROM;
  }
  if (process.env.EMAIL_USER) {
    return `"Campus Marketplace" <${process.env.EMAIL_USER.trim()}>`;
  }
  return '"Campus Marketplace" <no-reply@campusmarketplace.edu>';
}

/**
 * Sends a password reset email in real-time
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Student's name
 * @param {string} options.resetUrl - Password reset URL
 * @param {string} options.resetToken - Raw reset token
 */
async function sendPasswordResetEmail({ to, name, resetUrl, resetToken }) {
  const transporter = await getTransporter();

  const fromAddress = getFromAddress();
  const studentFirstName = name ? name.split(' ')[0] : 'Student';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .email-container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .email-header { background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 32px 24px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
    .email-body { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 12px; color: #0f172a; }
    .intro-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .cta-wrapper { text-align: center; margin: 28px 0; }
    .cta-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); }
    .security-notice { background-color: #f1f5f9; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 24px 0; border-radius: 0 6px 6px 0; font-size: 13px; color: #64748b; line-height: 1.5; }
    .fallback-link { font-size: 12px; color: #94a3b8; word-break: break-all; line-height: 1.5; margin-top: 20px; }
    .fallback-link a { color: #4f46e5; }
    .email-footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div style="font-size: 36px; margin-bottom: 8px;">🎓</div>
      <h1>Campus Marketplace</h1>
      <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">Student Account Security</div>
    </div>
    <div class="email-body">
      <div class="greeting">Hello, ${studentFirstName}!</div>
      <p class="intro-text">
        We received a request to reset the password for your Campus Marketplace account (<strong>${to}</strong>).
        Click the button below to choose a new password:
      </p>

      <div class="cta-wrapper">
        <a href="${resetUrl}" class="cta-btn" target="_blank">Reset My Password &rarr;</a>
      </div>

      <div class="security-notice">
        <strong>⏰ Security Notice:</strong> This reset link is active for <strong>15 minutes</strong> only and can be used once. If you did not request a password reset, no action is needed — your account remains completely safe.
      </div>

      <div class="fallback-link">
        If the button above does not open, copy and paste this link into your browser:<br>
        <a href="${resetUrl}">${resetUrl}</a>
      </div>
    </div>
    <div class="email-footer">
      &copy; 2026 Campus Marketplace for University Students. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hello, ${studentFirstName}!

We received a request to reset the password for your Campus Marketplace account (${to}).

To set a new password, open this link in your browser:
${resetUrl}

This link is active for 15 minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email.

— Campus Marketplace Team
  `.trim();

  const mailOptions = {
    from: fromAddress,
    to,
    subject: '🔑 Reset Your Campus Marketplace Password',
    text: textContent,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[EmailService] Real-time email sent! Preview live at: ${previewUrl}`);
  } else {
    console.log(`[EmailService] Real-time email delivered to ${to}, MessageId: ${info.messageId}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
    isRealDelivery: !previewUrl,
  };
}

/**
 * Sends a password reset confirmation email
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - User's name
 */
async function sendPasswordResetSuccessEmail({ to, name }) {
  try {
    const transporter = await getTransporter();
    const fromAddress = getFromAddress();
    const studentFirstName = name ? name.split(' ')[0] : 'Student';

    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: '✅ Your Campus Marketplace Password Has Been Changed',
      text: `Hello ${studentFirstName},\n\nThis is a confirmation that your Campus Marketplace password was successfully changed.\n\nIf you did not make this change, please log in immediately and contact campus support.\n\n— Campus Marketplace Team`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #15803d; margin-top: 0;">✅ Password Changed Successfully</h2>
          <p>Hello ${studentFirstName},</p>
          <p>This is a security confirmation that your Campus Marketplace password was just changed.</p>
          <p style="color: #64748b; font-size: 13px;">If you performed this action, you can safely disregard this message. If you did not change your password, please contact the campus marketplace team immediately.</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[EmailService] Could not send password reset success alert:', err.message);
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
};
