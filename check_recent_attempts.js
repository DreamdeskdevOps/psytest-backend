const db = require('./src/config/database');

async function checkRecentAttempts() {
  try {
    console.log('\n🔍 Checking all recent test attempts...\n');

    const attempts = await db.getMany(`
      SELECT ta.id, ta.status, ta.total_score, ta.created_at, ta.completed_at, t.title,
             ta.section_scores
      FROM test_attempts ta
      LEFT JOIN tests t ON ta.test_id = t.id
      ORDER BY ta.created_at DESC
      LIMIT 5
    `);

    console.log(`Found ${attempts.length} recent attempts:\n`);

    attempts.forEach((attempt, index) => {
      console.log(`${index + 1}. ${attempt.title || 'Unknown Test'}`);
      console.log(`   Status: ${attempt.status}`);
      console.log(`   Score: ${attempt.total_score}`);
      console.log(`   Created: ${attempt.created_at}`);
      console.log(`   Completed: ${attempt.completed_at || 'Not completed'}`);

      const sectionScores = attempt.section_scores || {};
      console.log(`   Scoring Type: ${sectionScores.scoringType || 'N/A'}`);
      console.log(`   Result Code: ${sectionScores.resultCode || 'N/A'}`);
      console.log(`   Result Title: ${sectionScores.resultTitle || 'N/A'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkRecentAttempts();
