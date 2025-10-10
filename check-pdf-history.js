const { getMany } = require('./src/config/database');

async function checkPDFHistory() {
  try {
    const history = await getMany('SELECT * FROM pdf_generation_history ORDER BY generated_at DESC LIMIT 10');

    console.log('\n📄 Recent PDF generation attempts:\n');
    if (history.length === 0) {
      console.log('❌ No PDF generation history found!');
      console.log('💡 This means PDF generation was never triggered.');
      console.log('');
      console.log('Possible reasons:');
      console.log('  1. Test does not have a PDF template assigned');
      console.log('  2. PDF generation code is not being called');
      console.log('  3. Error occurred before PDF generation started');
    } else {
      history.forEach((p, i) => {
        console.log(`${i + 1}. Status: ${p.generation_status}`);
        console.log(`   Time: ${p.generated_at}`);
        console.log(`   Test ID: ${p.test_id}`);
        console.log(`   Student ID: ${p.student_id}`);
        console.log(`   Attempt ID: ${p.attempt_id}`);
        if (p.pdf_file_path) {
          console.log(`   ✅ PDF Path: ${p.pdf_file_path}`);
        }
        if (p.error_message) {
          console.log(`   ❌ Error: ${p.error_message}`);
        }
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkPDFHistory();
