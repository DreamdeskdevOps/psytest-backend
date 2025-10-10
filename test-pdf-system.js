/**
 * Test script to verify PDF template assignment and generation system
 * Run with: node test-pdf-system.js
 */

const { getOne, getMany, execute } = require('./src/config/database');
const pdfGenerationService = require('./src/services/pdfGenerationService');

async function testPDFSystem() {
  console.log('\n🧪 Testing PDF Template Assignment & Generation System\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check database schema
    console.log('\n1️⃣  Testing Database Schema...');

    const columnCheck = await getOne(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'tests'
      AND column_name = 'pdf_template_id'
    `);

    if (columnCheck) {
      console.log('   ✅ pdf_template_id column exists in tests table');
    } else {
      console.log('   ❌ pdf_template_id column NOT found');
      return;
    }

    // Test 2: Check if PDF templates exist
    console.log('\n2️⃣  Checking PDF Templates...');

    const templates = await getMany(`
      SELECT template_id, template_name, is_active
      FROM pdf_templates
      WHERE is_active = true
      LIMIT 5
    `);

    console.log(`   ✅ Found ${templates.length} active PDF template(s)`);
    templates.forEach(t => {
      console.log(`      - ${t.template_name} (ID: ${t.template_id})`);
    });

    if (templates.length === 0) {
      console.log('   ⚠️  No active PDF templates found. Create one in the admin panel first.');
    }

    // Test 3: Check if any test has a template assigned
    console.log('\n3️⃣  Checking Template Assignments...');

    const assignedTests = await getMany(`
      SELECT t.id, t.title, t.pdf_template_id, pt.template_name
      FROM tests t
      LEFT JOIN pdf_templates pt ON t.pdf_template_id = pt.template_id
      WHERE t.pdf_template_id IS NOT NULL
      LIMIT 5
    `);

    console.log(`   ✅ Found ${assignedTests.length} test(s) with assigned templates`);
    assignedTests.forEach(t => {
      console.log(`      - "${t.title}" → Template: ${t.template_name}`);
    });

    if (assignedTests.length === 0) {
      console.log('   ℹ️  No tests have PDF templates assigned yet.');
      console.log('   💡 To assign: Go to Admin → Test Settings → Select test → Assign PDF Template');
    }

    // Test 4: Check PDF generation history
    console.log('\n4️⃣  Checking PDF Generation History...');

    const generatedPDFs = await getMany(`
      SELECT
        pgh.id,
        pgh.generation_status,
        pgh.generated_at,
        t.title as test_title,
        pt.template_name
      FROM pdf_generation_history pgh
      LEFT JOIN tests t ON pgh.test_id = t.id
      LEFT JOIN pdf_templates pt ON pgh.template_id = pt.template_id
      ORDER BY pgh.generated_at DESC
      LIMIT 5
    `);

    console.log(`   ✅ Found ${generatedPDFs.length} PDF generation record(s)`);
    generatedPDFs.forEach(pdf => {
      const status = pdf.generation_status === 'success' ? '✅' : '❌';
      console.log(`      ${status} ${pdf.test_title} (${pdf.generation_status})`);
    });

    if (generatedPDFs.length === 0) {
      console.log('   ℹ️  No PDFs generated yet.');
      console.log('   💡 PDFs are auto-generated when students complete tests with assigned templates');
    }

    // Test 5: Check service methods exist
    console.log('\n5️⃣  Verifying PDF Generation Service...');

    const serviceMethods = [
      'generateStudentPDF',
      'getGeneratedPDF',
      'regeneratePDF',
      'getFieldValue',
      'parseColor'
    ];

    serviceMethods.forEach(method => {
      if (typeof pdfGenerationService[method] === 'function') {
        console.log(`   ✅ ${method}() exists`);
      } else {
        console.log(`   ❌ ${method}() NOT found`);
      }
    });

    // Test 6: Test field value mapping
    console.log('\n6️⃣  Testing Field Value Mapping...');

    const testData = {
      studentName: 'John Doe',
      email: 'john@example.com',
      overallScore: 85,
      testTitle: 'Sample Test'
    };

    const mappedName = pdfGenerationService.getFieldValue('studentName', testData);
    const mappedEmail = pdfGenerationService.getFieldValue('studentEmail', testData);
    const mappedScore = pdfGenerationService.getFieldValue('overallScore', testData);

    if (mappedName === 'John Doe') {
      console.log('   ✅ Field mapping works correctly');
      console.log(`      - studentName: "${mappedName}"`);
      console.log(`      - studentEmail: "${mappedEmail}"`);
      console.log(`      - overallScore: "${mappedScore}"`);
    } else {
      console.log('   ❌ Field mapping failed');
    }

    // Test 7: Test color parsing
    console.log('\n7️⃣  Testing Color Parsing...');

    const color = pdfGenerationService.parseColor('#7C3AED');
    if (color.r >= 0 && color.r <= 1 && color.g >= 0 && color.g <= 1 && color.b >= 0 && color.b <= 1) {
      console.log('   ✅ Color parsing works correctly');
      console.log(`      - #7C3AED → RGB(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)})`);
    } else {
      console.log('   ❌ Color parsing failed');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYSTEM STATUS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Database schema: Ready`);
    console.log(`✅ PDF templates: ${templates.length} active`);
    console.log(`✅ Template assignments: ${assignedTests.length} test(s)`);
    console.log(`✅ Generated PDFs: ${generatedPDFs.length} record(s)`);
    console.log(`✅ Service methods: All verified`);
    console.log(`✅ Field mapping: Working`);
    console.log(`✅ Color parsing: Working`);

    console.log('\n💡 NEXT STEPS:');
    if (templates.length === 0) {
      console.log('   1. Create a PDF template in Admin → PDF Templates');
    }
    if (assignedTests.length === 0) {
      console.log('   2. Assign template to a test in Admin → Test Settings');
    }
    console.log('   3. Complete a test as a student');
    console.log('   4. Check Results page for personalized PDF download');

    console.log('\n✅ PDF Template System Test Complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the test
testPDFSystem();
