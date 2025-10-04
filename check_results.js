const db = require('./src/config/database');

async function checkResults() {
  try {
    const results = await db.getMany(`
      SELECT t.title as test_name, tr.result_code, tr.title as result_title, tr.result_type
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE tr.is_active = true
      ORDER BY t.title, tr.result_code
      LIMIT 30
    `);

    console.log('\n=== Admin-Defined Test Results ===\n');
    results.forEach(row => {
      console.log(`Test: ${row.test_name}`);
      console.log(`  Code: ${row.result_code}`);
      console.log(`  Title: ${row.result_title}`);
      console.log(`  Type: ${row.result_type}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkResults();
