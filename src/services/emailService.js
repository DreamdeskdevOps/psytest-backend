const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter with environment configuration
   */
  initializeTransporter() {
    try {
      const emailConfig = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER || process.env.SMTP_USER,
          pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS
        }
      };

      // Create transporter
      this.transporter = nodemailer.createTransport(emailConfig);

      console.log('📧 Email service initialized:', {
        service: emailConfig.service,
        user: emailConfig.auth.user?.substring(0, 3) + '***'
      });

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.transporter = null;
    }
  }

  /**
   * Send result email with encrypted PDF attachment
   * @param {object} studentData - Student information
   * @param {string} pdfPath - Absolute path to the encrypted PDF file
   * @param {string} password - PDF password to include in email
   * @returns {Promise<boolean>} True if email sent successfully
   */
  async sendResultEmail(studentData, pdfPath, password) {
    try {
      console.log('📧 Preparing to send result email...');
      console.log('   To:', studentData.email);
      console.log('   PDF:', pdfPath);
      console.log('   Password:', password);

      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized, reinitializing...');
        this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error('Email transporter not available');
      }

      // Verify PDF file exists and check size
      let pdfSize = 0;
      try {
        await fs.access(pdfPath);
        const stats = await fs.stat(pdfPath);
        pdfSize = stats.size;
        console.log('   PDF file size:', (pdfSize / (1024 * 1024)).toFixed(2), 'MB');

        // Check if PDF is too large for email (Gmail limit is 25MB)
        const maxSizeMB = 20; // Set limit to 20MB to be safe
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        if (pdfSize > maxSizeBytes) {
          console.warn(`   ⚠️ PDF too large for email: ${(pdfSize / (1024 * 1024)).toFixed(2)}MB (max: ${maxSizeMB}MB)`);
          console.warn('   Skipping email - student can download from dashboard');
          return false;
        }
      } catch (error) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      // Prepare email content
      const studentName = studentData.full_name ||
                          `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim() ||
                          studentData.email;

      const testTitle = studentData.test_title || studentData.testTitle || 'Your Test';

      const emailSubject = `🎓 Your Test Results - ${testTitle}`;

      const emailHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .password-box { background: #fff; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .password { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin: 10px 0; }
            .instructions { background: #e8f4f8; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Congratulations, ${studentName}!</h1>
              <p>Your test results are ready</p>
            </div>

            <div class="content">
              <p>Dear ${studentName},</p>

              <p>Congratulations on completing <strong>${testTitle}</strong>!</p>

              <p>Your personalized results are attached to this email as a password-protected PDF document.</p>

              <div class="password-box">
                <p style="margin: 0; font-size: 14px; color: #666;">🔐 Your PDF Password:</p>
                <div class="password">${password}</div>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #888;">
                  💡 This is your date of birth in DDMMYYYY format
                </p>
              </div>

              <div class="instructions">
                <h3 style="margin-top: 0;">📋 How to view your results:</h3>
                <ol>
                  <li>Download the attached PDF file</li>
                  <li>Open it with any PDF viewer (Adobe Reader, browser, etc.)</li>
                  <li>When prompted, enter the password: <strong>${password}</strong></li>
                  <li>View your detailed results!</li>
                </ol>
              </div>

              <p style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                ⚠️ <strong>Important:</strong> Keep this email safe as it contains your password.
                You can also download your results anytime from your dashboard.
              </p>

              <p>If you have any questions or concerns about your results, please don't hesitate to contact us.</p>

              <p>Best regards,<br>
              <strong>PsyTest Team</strong></p>
            </div>

            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} PsyTest. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `
Dear ${studentName},

Congratulations on completing ${testTitle}!

Your personalized results are attached to this email as a password-protected PDF.

🔐 PDF Password: ${password}
💡 This is your date of birth in DDMMYYYY format

How to view your results:
1. Download the attached PDF file
2. Open it with any PDF viewer
3. Enter password: ${password}
4. View your results!

Keep this email safe as it contains your password.

Best regards,
PsyTest Team
      `;

      // Get filename from path
      const filename = path.basename(pdfPath);

      // Prepare mail options
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || process.env.EMAIL_USER,
        to: studentData.email,
        subject: emailSubject,
        text: emailText,
        html: emailHTML,
        attachments: [
          {
            filename: filename,
            path: pdfPath,
            contentType: 'application/pdf'
          }
        ]
      };

      console.log('📧 Sending email...');
      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ Email sent successfully:', info.messageId);
      console.log('   Response:', info.response);

      return true;

    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      console.error('   Error stack:', error.stack);

      // Don't throw error - email is optional, shouldn't break PDF generation
      return false;
    }
  }

  /**
   * Send a generic email
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} text - Plain text content
   * @param {string} html - HTML content
   * @returns {Promise<boolean>} True if sent successfully
   */
  async sendEmail(to, subject, text, html) {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized, reinitializing...');
        this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new Error('Email transporter not available');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.FROM_EMAIL || process.env.EMAIL_USER,
        to,
        subject,
        text,
        html
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);

      return true;

    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      return false;
    }
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} True if configuration is valid
   */
  async verifyConfiguration() {
    try {
      if (!this.transporter) {
        console.warn('⚠️ Email transporter not initialized');
        return false;
      }

      await this.transporter.verify();
      console.log('✅ Email configuration verified');
      return true;

    } catch (error) {
      console.error('❌ Email configuration invalid:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
