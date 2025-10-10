const pdfGenService = require('./src/services/pdfGenerationService');

(async () => {
  try {
    console.log('🧪 Testing COMPLETE PDF generation flow...\n');

    const studentData = {
      studentName: 'Bijoy Jogii',
      studentEmail: 'bijoy@example.com',
      overallScore: 85,
      percentage: 85,
      resultCode: 'ISTP',
      resultTitle: 'ISTP – VIRTUOSO',
      resultDescription: 'You are adventurous, pragmatic, and highly skilled with tools and machinery.',
      certificateId: 'CERT-TEST123'
    };

    console.log('📋 Student Data being sent:');
    console.log('   studentName:', studentData.studentName);
    console.log('   studentEmail:', studentData.studentEmail);
    console.log('   resultCode:', studentData.resultCode);
    console.log('   resultTitle:', studentData.resultTitle);
    console.log('   resultDescription:', studentData.resultDescription);
    console.log('');

    const pdfPath = await pdfGenService.generateStudentPDF(
      '53f959d3-8d2d-4e82-a0aa-dab683be6abe',
      '306c6a7e-771b-4990-a9b3-01e4dd07f811',
      'final-test-' + Date.now(),
      studentData
    );

    console.log('\n✅ PDF Generated:', pdfPath);
    console.log('🌐 URL: http://localhost:3001/' + pdfPath);
    console.log('\n💡 Open this PDF and check:');
    console.log('   - Page 1: Should have "Bijoy Jogii" at the name field');
    console.log('   - Page 11: Should have the result description');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
