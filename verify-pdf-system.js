const { getOne } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('📋 STEP 1: Checking PDF Template Configuration\n');
  console.log('='.repeat(60));

  const template = await getOne(`
    SELECT template_id, template_name, pdf_file_path, template_config, is_active
    FROM pdf_templates
    WHERE template_id = '0e252ef6-e31e-4572-ad37-36e75d97c6c9'
  `);

  console.log('\nTemplate Name:', template.template_name);
  console.log('Is Active:', template.is_active);
  console.log('PDF File:', template.pdf_file_path);

  let config = template.template_config;
  if (typeof config === 'string') {
    config = JSON.parse(config);
  }

  console.log('\nFields configured:', config.fields?.length || 0);
  if (config.fields) {
    console.log('\nField Details:');
    config.fields.forEach((f, i) => {
      console.log(`  ${i+1}. Field Name: ${f.name}`);
      console.log(`     Type: ${f.type}`);
      console.log(`     Page: ${f.page}`);
      console.log(`     Position: x=${f.x}, y=${f.y}`);
      console.log(`     Font Size: ${f.fontSize}px`);
      console.log('');
    });
  }

  // Check if PDF file exists
  const pdfPath = path.join(__dirname, template.pdf_file_path);
  const pdfExists = fs.existsSync(pdfPath);
  console.log('PDF File Exists:', pdfExists ? '✅ YES' : '❌ NO');

  // Check if test is assigned
  const test = await getOne(`
    SELECT id, title, pdf_template_id
    FROM tests
    WHERE pdf_template_id = $1
  `, [template.template_id]);

  if (test) {
    console.log('✅ Test assigned:', test.title);
    console.log('   Test ID:', test.id);
  } else {
    console.log('❌ No test assigned to this template');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 STEP 2: Testing PDF Generation with Sample Data\n');

  // Now test PDF generation
  delete require.cache[require.resolve('./src/services/pdfGenerationService')];
  const pdfGenService = require('./src/services/pdfGenerationService');

  const studentData = {
    studentName: 'John Doe (TEST)',
    studentEmail: 'john.doe@test.com',
    resultCode: 'ENTP',
    resultTitle: 'ENTP - The Debater',
    resultDescription: 'This is a test description to verify if the PDF generation actually fills in the field values correctly.',
    overallScore: 95,
    percentage: 95,
    certificateId: 'CERT-VERIFY-TEST'
  };

  console.log('Student Data:');
  console.log('  Name:', studentData.studentName);
  console.log('  Result Description:', studentData.resultDescription);
  console.log('');

  try {
    const pdfPath = await pdfGenService.generateStudentPDF(
      test.id,
      '306c6a7e-771b-4990-a9b3-01e4dd07f811',
      'verify-' + Date.now(),
      studentData
    );

    console.log('\n✅ PDF GENERATION SUCCESSFUL!');
    console.log('PDF Path:', pdfPath);
    console.log('\n🌐 Open this URL to check the PDF:');
    console.log('   http://localhost:3001/' + pdfPath);
    console.log('\n💡 VERIFY:');
    console.log('   ✓ Page 1 should show: "John Doe (TEST)"');
    console.log('   ✓ Page 11 should show: "This is a test description..."');

  } catch (error) {
    console.error('\n❌ PDF GENERATION FAILED!');
    console.error('Error:', error.message);
    console.error('\nFull Stack:');
    console.error(error.stack);
  }

  process.exit(0);
})();
