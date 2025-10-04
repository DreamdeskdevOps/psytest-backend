const db = require('./src/config/database');

async function checkAttempts() {
  try {
    const attempts = await db.getMany(`
      SELECT id, test_id, status, total_score, completed_at, created_at
      FROM test_attempts
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n=== Recent Test Attempts ===\n');

    if (attempts.length === 0) {
      console.log('No test attempts found!');
    } else {
      attempts.forEach(a => {
        console.log('Attempt ID:', a.id);
        console.log('  Status:', a.status);
        console.log('  Score:', a.total_score || 'N/A');
        console.log('  Completed:', a.completed_at || 'N/A');
        console.log('  Created:', a.created_at);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAttempts();
