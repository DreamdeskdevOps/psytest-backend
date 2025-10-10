const { getOne } = require('./src/config/database');

async function debugTestSubmission() {
  try {
    console.log('🔍 Debugging most recent test submission...\n');

    // Get the most recent test attempt
    const latestAttempt = await getOne(`
      SELECT
        ta.id as attempt_id,
        ta.user_id,
        ta.test_id,
        ta.session_token,
        t.title as test_title,
        u.first_name,
        u.last_name,
        u.email
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      JOIN users u ON ta.user_id = u.id
      WHERE ta.status = 'completed'
      ORDER BY ta.updated_at DESC
      LIMIT 1
    `);

    if (!latestAttempt) {
      console.log('❌ No completed attempts found');
      process.exit(1);
    }

    console.log('📝 Latest Attempt:');
    console.log('   Attempt ID:', latestAttempt.attempt_id);
    console.log('   Student:', latestAttempt.first_name, latestAttempt.last_name);
    console.log('   Test:', latestAttempt.test_title);
    console.log('');

    // Check if PDF was generated for this attempt
    const pdfRecord = await getOne(`
      SELECT * FROM pdf_generation_history
      WHERE attempt_id = $1
      ORDER BY generated_at DESC
      LIMIT 1
    `, [latestAttempt.attempt_id]);

    if (pdfRecord) {
      console.log('✅ PDF Generated:');
      console.log('   Status:', pdfRecord.generation_status);
      console.log('   PDF Path:', pdfRecord.pdf_file_path);
      console.log('   Generated At:', pdfRecord.generated_at);

      if (pdfRecord.error_message) {
        console.log('   ❌ Error:', pdfRecord.error_message);
      }

      console.log('\n📥 Download URLs that should work:');
      console.log('   Direct:', `http://localhost:3001/${pdfRecord.pdf_file_path}`);
      console.log('   API:', `http://localhost:3001/api/v1/pdf/download/${latestAttempt.attempt_id}`);
    } else {
      console.log('❌ No PDF generated for this attempt');
      console.log('');
      console.log('Checking if test has PDF template assigned...');

      const testInfo = await getOne(`
        SELECT t.id, t.title, t.pdf_template_id, pt.template_name
        FROM tests t
        LEFT JOIN pdf_templates pt ON t.pdf_template_id = pt.template_id
        WHERE t.id = $1
      `, [latestAttempt.test_id]);

      if (testInfo.pdf_template_id) {
        console.log(`✅ Template assigned: ${testInfo.template_name}`);
        console.log('⚠️ But PDF was not generated - check backend logs during test submission');
      } else {
        console.log('❌ No PDF template assigned to this test');
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugTestSubmission();
