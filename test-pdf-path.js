const {getMany} = require('./src/config/database');

(async () => {
  const userId = '306c6a7e-771b-4990-a9b3-01e4dd07f811';

  const attempts = await getMany(`
    SELECT
      ta.id,
      ta.test_id,
      ta.status,
      t.title as test_title,
      pgh.pdf_file_path as generated_pdf_path,
      pgh.generation_status
    FROM test_attempts ta
    LEFT JOIN tests t ON ta.test_id = t.id
    LEFT JOIN pdf_generation_history pgh ON pgh.attempt_id = ta.id AND pgh.generation_status = $1
    WHERE ta.user_id = $2 AND ta.status = $3
    ORDER BY ta.created_at DESC
    LIMIT 3
  `, ['success', userId, 'completed']);

  console.log('✅ Attempts found:', attempts.length);
  console.log('');

  attempts.forEach((a, i) => {
    console.log(`${i + 1}. ${a.test_title}`);
    console.log(`   Attempt ID: ${a.id}`);
    console.log(`   Generated PDF: ${a.generated_pdf_path || 'NULL'}`);
    console.log(`   Generation Status: ${a.generation_status || 'NULL'}`);
    console.log('');
  });

  // Also check pdf_generation_history table
  console.log('📊 Checking pdf_generation_history table...');
  const history = await getMany(`
    SELECT attempt_id, pdf_file_path, generation_status, generated_at
    FROM pdf_generation_history
    WHERE student_id = $1
    ORDER BY generated_at DESC
    LIMIT 5
  `, [userId]);

  console.log(`Found ${history.length} PDF generation records:`);
  history.forEach((h, i) => {
    console.log(`${i + 1}. Attempt: ${h.attempt_id}`);
    console.log(`   PDF Path: ${h.pdf_file_path || 'NULL'}`);
    console.log(`   Status: ${h.generation_status}`);
    console.log('');
  });

  process.exit(0);
})();
