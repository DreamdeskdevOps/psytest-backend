const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testing Email Service\n');
  console.log('='.repeat(60));

  console.log('\n📧 Email Configuration:');
  console.log('   SERVICE:', process.env.EMAIL_SERVICE);
  console.log('   USER:', process.env.EMAIL_USER);
  console.log('   PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-3) : 'NOT SET');
  console.log('   FROM:', process.env.EMAIL_FROM);

  console.log('\n🔧 Creating transporter...');

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  console.log('   ✓ Transporter created');

  console.log('\n🔍 Verifying connection...');

  try {
    await transporter.verify();
    console.log('   ✅ Connection verified!');

    console.log('\n📬 Sending test email...');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER,
      subject: '✅ PsyTest Email Test - Success!',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4CAF50;">✅ Email Service Working!</h2>
            <p>Your email configuration is correct and emails are being sent successfully.</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is a test email from PsyTest platform.</p>
          </div>
        </div>
      `
    });

    console.log('   ✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('\n✅ SUCCESS! Check inbox:', process.env.EMAIL_USER);

  } catch (error) {
    console.error('\n❌ Email test failed!');
    console.error('   Error:', error.message);

    if (error.message.includes('Invalid login') || error.message.includes('Username and Password not accepted')) {
      console.error('\n💡 SOLUTION:');
      console.error('   Your password is incorrect or you need a Gmail App Password.');
      console.error('\n   Steps to fix:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Sign in with your Gmail account');
      console.error('   3. Create App Password for "Mail"');
      console.error('   4. Copy the 16-character password');
      console.error('   5. Update .env: EMAIL_PASSWORD=your-app-password');
      console.error('   6. Run this test again');
    }
  }

  console.log('\n' + '='.repeat(60));
}

testEmail().catch(console.error);
