// Clear all cached modules to ensure we're testing fresh code
Object.keys(require.cache).forEach(key => {
  if (key.includes('pdfGenerationService')) {
    delete require.cache[key];
  }
});

const pdfGenService = require('./src/services/pdfGenerationService');
const { getOne } = require('./src/config/database');

(async () => {
  try {
    console.log('🔍 COMPREHENSIVE PDF GENERATION DIAGNOSIS\n');
    console.log('='.repeat(60));

    // Step 1: Check template exists and has fields
    console.log('\n1️⃣ Checking template configuration...');
    const template = await getOne(`
      SELECT template_id, template_name, pdf_file_path, template_config
      FROM pdf_templates
      WHERE template_id = '0e252ef6-e31e-4572-ad37-36e75d97c6c9'
    `);

    console.log('   Template Name:', template.template_name);
    console.log('   PDF File:', template.pdf_file_path);
    console.log('   Config Type:', typeof template.template_config);

    let config = template.template_config;
    if (typeof config === 'string') {
      config = JSON.parse(config);
    }

    console.log('   Fields Count:', config.fields?.length || 0);
    if (config.fields) {
      config.fields.forEach((f, i) => {
        console.log(`     ${i+1}. ${f.name} (${f.type}) - Page ${f.page}`);
      });
    }

    // Step 2: Check if PDF file exists
    console.log('\n2️⃣ Checking if template PDF file exists...');
    const fs = require('fs');
    const path = require('path');
    const pdfPath = path.join(__dirname, template.pdf_file_path);
    const exists = fs.existsSync(pdfPath);
    console.log('   File Path:', pdfPath);
    console.log('   Exists:', exists ? '✅ YES' : '❌ NO');

    if (!exists) {
      console.log('\n❌ PROBLEM FOUND: Template PDF file does not exist!');
      console.log('   This will cause PDF generation to fail.');
      process.exit(1);
    }

    // Step 3: Test actual PDF generation
    console.log('\n3️⃣ Testing PDF generation with sample data...');
    const studentData = {
      studentName: 'Test Student Name',
      studentEmail: 'test@example.com',
      resultCode: 'ISTP',
      resultTitle: 'Test Result Title',
      resultDescription: 'This is a test result description that should appear on page 11.',
      overallScore: 85,
      percentage: 85,
      certificateId: 'CERT-TEST'
    };

    console.log('   Student Name:', studentData.studentName);
    console.log('   Result Description:', studentData.resultDescription);

    const pdfPath2 = await pdfGenService.generateStudentPDF(
      '53f959d3-8d2d-4e82-a0aa-dab683be6abe',
      '306c6a7e-771b-4990-a9b3-01e4dd07f811',
      'diagnosis-' + Date.now(),
      studentData
    );

    console.log('\n✅ SUCCESS! PDF generated:', pdfPath2);
    console.log('🌐 Open: http://localhost:3001/' + pdfPath2);
    console.log('\n💡 Check if the PDF has:');
    console.log('   - Page 1: "Test Student Name"');
    console.log('   - Page 11: "This is a test result description..."');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR OCCURRED:', error.message);
    console.error('\nFull Stack Trace:');
    console.error(error.stack);
    process.exit(1);
  }
})();
