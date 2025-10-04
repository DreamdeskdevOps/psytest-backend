const db = require('./src/config/database');

async function checkMBTIAttempt() {
  try {
    console.log('\n🔍 Checking recent MBTI test attempt...\n');

    // Get the most recent MBTI test attempt
    const attempts = await db.getMany(`
      SELECT ta.*, t.title
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE t.title LIKE '%MBTI%'
      ORDER BY ta.created_at DESC
      LIMIT 1
    `);

    if (attempts.length === 0) {
      console.log('❌ No MBTI test attempts found');
      process.exit(1);
    }

    const attempt = attempts[0];
    console.log('📋 Test Attempt Details:');
    console.log('  ID:', attempt.id);
    console.log('  Test:', attempt.title);
    console.log('  Status:', attempt.status);
    console.log('  Total Score:', attempt.total_score);
    console.log('  Created:', attempt.created_at);
    console.log('  Completed:', attempt.completed_at);

    console.log('\n📊 Section Scores (stored in database):');
    const sectionScores = attempt.section_scores || {};
    console.log('  Scoring Type:', sectionScores.scoringType);
    console.log('  Result Code:', sectionScores.resultCode);
    console.log('  Result Title:', sectionScores.resultTitle);
    console.log('  Result Description:', sectionScores.resultDescription ? 'Present' : 'Missing');

    if (sectionScores.sectionResults) {
      console.log('\n📝 Section Results:');
      sectionScores.sectionResults.forEach(section => {
        console.log(`  - ${section.sectionName}: ${JSON.stringify(section.resultFlags || section.highestFlag)}`);
      });
    }

    // Check if test_results has matching entry
    console.log('\n🔍 Checking admin-configured results...');
    const testResults = await db.getMany(`
      SELECT result_code, title, result_type
      FROM test_results
      WHERE test_id = $1 AND result_code = $2 AND is_active = true
    `, [attempt.test_id, sectionScores.resultCode]);

    if (testResults.length > 0) {
      console.log('✅ Found matching admin result:');
      console.log('  Code:', testResults[0].result_code);
      console.log('  Title:', testResults[0].title);
      console.log('  Type:', testResults[0].result_type);
    } else {
      console.log('❌ No matching admin result found for code:', sectionScores.resultCode);

      // Show available results
      const availableResults = await db.getMany(`
        SELECT result_code, title
        FROM test_results
        WHERE test_id = $1 AND is_active = true
      `, [attempt.test_id]);

      console.log('\n📋 Available result codes for this test:');
      availableResults.forEach(r => console.log(`  - ${r.result_code}: ${r.title}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkMBTIAttempt();
