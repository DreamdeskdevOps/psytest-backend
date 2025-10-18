// Load environment variables FIRST before requiring any services
require('dotenv').config();

const emailService = require('./src/services/emailService');
const path = require('path');

async function testEmailWithPDF() {
  console.log('🧪 Testing Email Service with PDF Attachment\n');
  console.log('='.repeat(60));

  // Create sample student data
  const studentData = {
    first_name: 'Test',
    last_name: 'Student',
    full_name: 'Test Student',
    email: 'bijoyjogi9564482@gmail.com',
    test_title: 'Sample Test',
    testTitle: 'Sample Test'
  };

  // Use the test-encryption.pdf we created earlier
  const pdfPath = path.join(__dirname, 'uploads', 'test-encryption.pdf');
  const password = '01012000';

  console.log('\n📧 Email Details:');
  console.log('   To:', studentData.email);
  console.log('   PDF:', pdfPath);
  console.log('   Password:', password);

  console.log('\n📬 Sending email...');

  try {
    const result = await emailService.sendResultEmail(studentData, pdfPath, password);

    if (result) {
      console.log('   ✅ Email sent successfully!');
      console.log('\n✅ SUCCESS! Check inbox:', studentData.email);
    } else {
      console.log('   ❌ Email sending failed (returned false)');
    }

  } catch (error) {
    console.error('\n❌ Email sending error:', error.message);
    console.error('   Stack:', error.stack);
  }

  console.log('\n' + '='.repeat(60));
}

testEmailWithPDF().catch(console.error);
