const db = require('./src/config/database');

async function checkSMTScoring() {
  try {
    // Get SMT completed attempts
    const attempts = await db.getMany(`
      SELECT ta.id, ta.total_score, ta.created_at
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE ta.status = 'completed' AND t.title LIKE '%SMT%'
      ORDER BY ta.created_at DESC
      LIMIT 5
    `);

    console.log('\n=== SMT Completed Attempts ===\n');
    attempts.forEach(a => {
      console.log(`Attempt: ${a.id}`);
      console.log(`  Total Score: ${a.total_score}`);
      console.log(`  Created: ${a.created_at}`);
      console.log('');
    });

    // Get SMT admin-defined results
    const results = await db.getMany(`
      SELECT tr.result_code, tr.title, tr.score_range, tr.result_type
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE t.title LIKE '%SMT%' AND tr.is_active = true
      ORDER BY tr.result_code
    `);

    console.log('=== SMT Admin-Defined Results ===\n');
    results.forEach(r => {
      console.log(`Code: ${r.result_code}`);
      console.log(`  Title: ${r.title}`);
      console.log(`  Range: ${r.score_range}`);
      console.log(`  Type: ${r.result_type}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSMTScoring();
