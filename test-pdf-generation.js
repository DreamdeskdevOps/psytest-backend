const pdfGenerationService = require('./src/services/pdfGenerationService');

async function testPDFGeneration() {
  try {
    console.log('🧪 Testing PDF generation with sample data...\n');

    // Sample student data - matching what the actual system sends
    const studentData = {
      studentName: 'John Doe',
      studentEmail: 'john.doe@example.com',
      studentId: '306c6a7e-771b-4990-a9b3-01e4dd07f811',
      testTitle: 'Myer Briggs Type Indicator (MBTI)',
      completionDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      attemptNumber: '1',
      overallScore: 85,
      percentage: 85,
      totalQuestions: 20,
      resultCode: 'INTJ',
      resultTitle: 'The Architect',
      resultDescription: 'INTJs are imaginative and strategic thinkers, with a plan for everything. They are analytical problem-solvers, eager to improve systems and processes with their innovative ideas.',
      certificateId: 'CERT-TEST1234'
    };

    console.log('📋 Student Data:');
    console.log('   Name:', studentData.studentName);
    console.log('   Email:', studentData.studentEmail);
    console.log('   Result Code:', studentData.resultCode);
    console.log('   Result Title:', studentData.resultTitle);
    console.log('   Result Description:', studentData.resultDescription);
    console.log('');

    const pdfPath = await pdfGenerationService.generateStudentPDF(
      '53f959d3-8d2d-4e82-a0aa-dab683be6abe', // MBTI test ID
      studentData.studentId,
      'test-attempt-' + Date.now(),
      studentData
    );

    console.log('\n✅ PDF Generated successfully!');
    console.log('📄 PDF Path:', pdfPath);
    console.log('\n💡 Open this file to verify the fields are filled correctly.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPDFGeneration();
