const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Sends email directly over HTTPS (Port 443) using Resend or Brevo HTTP API.
 * This completely bypasses cloud firewall SMTP port blocking (e.g., Render free tier).
 */
function sendViaHttpApi({ to, subject, html, text }) {
  if (process.env.RESEND_API_KEY) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        from: process.env.EMAIL_FROM || 'Campus Marketplace <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
      });
      const req = https.request('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); } catch (e) { resolve({ id: 'resend-sent' }); }
          } else {
            reject(new Error(`Resend API Error: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Resend API request timed out')); });
      req.write(payload);
      req.end();
    });
  }

  if (process.env.BREVO_API_KEY) {
    return new Promise((resolve, reject) => {
      const senderEmail = process.env.EMAIL_USER || 'no-reply@campusmarketplace.edu';
      const payload = JSON.stringify({
        sender: { name: 'Campus Marketplace', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      });
      const req = https.request('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY.trim(),
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5000,
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(data)); } catch (e) { resolve({ messageId: 'brevo-sent' }); }
          } else {
            reject(new Error(`Brevo API Error: ${data}`));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Brevo API request timed out')); });
      req.write(payload);
      req.end();
    });
  }

  return null;
}

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
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
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
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
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

  // 1. If HTTP API key is configured (Resend or Brevo), use HTTPS (Port 443).
  // This completely bypasses cloud firewall SMTP port blocking (e.g. Render Free Tier).
  if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) {
    try {
      const httpResult = await sendViaHttpApi({
        to,
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      });
      if (httpResult) {
        console.log(`[EmailService] Real-time email dispatched via HTTPS API to ${to}`);
        return {
          success: true,
          messageId: httpResult.id || httpResult.messageId || 'https-api-delivery',
          previewUrl: null,
          isRealDelivery: true,
        };
      }
    } catch (httpErr) {
      console.warn('[EmailService] HTTPS API failed, falling back to SMTP:', httpErr.message);
    }
  }

  // 2. SMTP Delivery with strict 5-second safety timeout so requests never hang on cloud firewalls
  const sendMailPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SMTP connection timed out. Outbound SMTP ports are blocked by host firewall.')), 5000)
  );

  const info = await Promise.race([sendMailPromise, timeoutPromise]);

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
    const fromAddress = getFromAddress();
    const studentFirstName = name ? name.split(' ')[0] : 'Student';
    const subject = '✅ Your Campus Marketplace Password Has Been Changed';
    const text = `Hello ${studentFirstName},\n\nThis is a confirmation that your Campus Marketplace password was successfully changed.\n\nIf you did not make this change, please log in immediately and contact campus support.\n\n— Campus Marketplace Team`;
    const html = `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #15803d; margin-top: 0;">✅ Password Changed Successfully</h2>
          <p>Hello ${studentFirstName},</p>
          <p>This is a security confirmation that your Campus Marketplace password was just changed.</p>
          <p style="color: #64748b; font-size: 13px;">If you performed this action, you can safely disregard this message. If you did not change your password, please contact the campus marketplace team immediately.</p>
        </div>
      `;

    if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) {
      try {
        await sendViaHttpApi({ to, subject, html, text });
        return;
      } catch (httpErr) {
        console.warn('[EmailService] HTTPS API confirmation failed, falling back to SMTP:', httpErr.message);
      }
    }

    const transporter = await getTransporter();
    const sendMailPromise = transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout')), 5000)
    );
    await Promise.race([sendMailPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[EmailService] Could not send password reset success alert:', err.message);
  }
}

/**
 * Sends a welcome email to newly registered students
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.name - Student's full name
 * @param {string} [options.clientUrl] - Base URL of the application
 */
async function sendWelcomeEmail({ to, name, phone, clientUrl }) {
  try {
    const fromAddress = getFromAddress();
    const studentFirstName = name ? name.split(' ')[0] : 'Student';
    const baseUrl = clientUrl || process.env.CLIENT_URL || 'https://campuscart-xuqs.onrender.com';
    const marketplaceUrl = `${baseUrl.replace(/\/$/, '')}/marketplace`;

    const subject = `🎉 Account Created & Logged In - Welcome to Campus Marketplace, ${studentFirstName}!`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Campus Marketplace</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .email-container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
    .email-header { background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 36px 24px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .email-body { padding: 32px 24px; }
    .greeting { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    .intro-text { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .account-badge { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 14px; color: #3730a3; }
    .features-list { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .feature-item { display: flex; align-items: flex-start; margin-bottom: 14px; }
    .feature-item:last-child { margin-bottom: 0; }
    .feature-icon { font-size: 20px; margin-right: 12px; line-height: 1.3; }
    .feature-text { font-size: 14px; line-height: 1.5; color: #334155; }
    .feature-title { font-weight: 600; color: #0f172a; }
    .cta-wrapper { text-align: center; margin: 32px 0 16px 0; }
    .cta-btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); }
    .email-footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div style="font-size: 42px; margin-bottom: 8px;">🎓</div>
      <h1>Campus Marketplace</h1>
      <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">Account Created &amp; Logged In Successfully</div>
    </div>
    <div class="email-body">
      <div class="greeting">Welcome aboard, ${studentFirstName}! 👋</div>
      <p class="intro-text">
        Your student account has been registered successfully and you are now logged in.
      </p>

      <div class="account-badge">
        <strong>📋 Your Account Details:</strong><br>
        • Email: <strong>${to}</strong><br>
        • Registered Mobile: <strong>${phone || 'On file'}</strong><br>
        • Status: <strong>Active Student Account</strong>
      </div>

      <div class="features-list">
        <div class="feature-item">
          <div class="feature-icon">🛍️</div>
          <div class="feature-text">
            <div class="feature-title">Explore Campus Listings</div>
            Find textbooks, electronics, calculators, dorm essentials, and bicycle deals right on campus.
          </div>
        </div>
        <div class="feature-item" style="margin-top: 12px;">
          <div class="feature-icon">🏷️</div>
          <div class="feature-text">
            <div class="feature-title">Sell Your Unused Gear</div>
            Post items with pictures and AI-assisted descriptions in less than a minute.
          </div>
        </div>
        <div class="feature-item" style="margin-top: 12px;">
          <div class="feature-icon">💬</div>
          <div class="feature-text">
            <div class="feature-title">Chat Directly with Peers</div>
            Negotiate and arrange convenient, on-campus meetups safely.
          </div>
        </div>
      </div>

      <div class="cta-wrapper">
        <a href="${marketplaceUrl}" class="cta-btn" target="_blank">Start Exploring Marketplace &rarr;</a>
      </div>
    </div>
    <div class="email-footer">
      &copy; 2026 Campus Marketplace for University Students. All rights reserved.<br>
      You are receiving this email because you created an account on Campus Marketplace.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Hello ${studentFirstName}!

Welcome to Campus Marketplace!

Your student account with ${to} is now active. You can now buy, sell, and chat with fellow students safely on campus.

Start browsing items:
${marketplaceUrl}

— Campus Marketplace Team
    `.trim();

    // 1. Try HTTPS API first (Resend / Brevo)
    if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) {
      try {
        const httpResult = await sendViaHttpApi({
          to,
          subject,
          html: htmlContent,
          text: textContent,
        });
        if (httpResult) {
          console.log(`[EmailService] Welcome email dispatched via HTTPS API to ${to}`);
          return { success: true, messageId: httpResult.id || httpResult.messageId || 'https-welcome', isRealDelivery: true };
        }
      } catch (httpErr) {
        console.warn('[EmailService] HTTPS API welcome email failed, falling back to SMTP:', httpErr.message);
      }
    }

    // 2. SMTP Delivery with 5-second timeout
    const transporter = await getTransporter();
    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    };

    const sendMailPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout during welcome email')), 5000)
    );

    const info = await Promise.race([sendMailPromise, timeoutPromise]);
    console.log(`[EmailService] Welcome email delivered to ${to}, MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, isRealDelivery: true };
  } catch (err) {
    console.warn('[EmailService] Could not send welcome email:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a phone verification OTP notice to student email as real-time backup
 * @param {Object} options
 * @param {string} options.to - User email
 * @param {string} options.name - User name
 * @param {string} options.otp - 6-digit verification OTP
 * @param {string} options.phone - Registered phone number
 */
async function sendPhoneOtpEmail({ to, name, otp, phone }) {
  try {
    const fromAddress = getFromAddress();
    const studentFirstName = name ? name.split(' ')[0] : 'Student';
    const maskedPhone = phone ? `${phone.slice(0, 3)}****${phone.slice(-3)}` : 'your mobile';
    const subject = `📱 ${otp} is your Campus Marketplace verification code`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Your Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: #4f46e5; padding: 24px; text-align: center; color: #ffffff; }
    .body { padding: 28px 24px; text-align: center; }
    .otp-box { font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; border: 2px dashed #6366f1; border-radius: 10px; padding: 16px; margin: 24px 0; display: inline-block; width: 80%; }
    .notice { font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 16px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; font-size: 12px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0; font-size: 20px;">Campus Marketplace</h2>
      <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">Phone Recovery Verification</div>
    </div>
    <div class="body">
      <h3 style="margin-top: 0; color: #0f172a;">Verification Code</h3>
      <p style="color: #475569; font-size: 14px;">
        Use the following one-time code to verify your phone number (<strong>${maskedPhone}</strong>) and reset your password:
      </p>
      <div class="otp-box">${otp}</div>
      <div class="notice">
        ⏰ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Campus Marketplace. If you did not request this code, your account is secure.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `Hello ${studentFirstName},\n\nYour Campus Marketplace phone verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\n— Campus Marketplace Team`;

    if (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) {
      try {
        await sendViaHttpApi({ to, subject, html: htmlContent, text: textContent });
        return { success: true };
      } catch (httpErr) {
        console.warn('[EmailService] HTTPS API failed for OTP email, falling back to SMTP:', httpErr.message);
      }
    }

    const transporter = await getTransporter();
    const sendMailPromise = transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP timeout')), 5000));
    await Promise.race([sendMailPromise, timeoutPromise]);
    return { success: true };
  } catch (err) {
    console.warn('[EmailService] Could not send OTP email notice:', err.message);
    return { success: false };
  }
}

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
  sendWelcomeEmail,
  sendPhoneOtpEmail,
};
