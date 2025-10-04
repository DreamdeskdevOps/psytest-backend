const db = require('./src/config/database');

async function checkSMTResult() {
  try {
    // Get the completed SMT attempt
    const attempts = await db.getMany(`
      SELECT ta.*, t.title
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE t.title ILIKE '%SMT%' AND ta.status = 'completed'
      ORDER BY ta.completed_at DESC
      LIMIT 1
    `);

    if (attempts.length === 0) {
      console.log('❌ No completed SMT attempts found');
      process.exit(1);
    }

    const attempt = attempts[0];
    console.log('\n📊 SMT Attempt Details:');
    console.log('ID:', attempt.id);
    console.log('Total Score:', attempt.total_score);
    console.log('Percentage:', attempt.percentage);
    console.log('Status:', attempt.status);
    console.log('Completed:', attempt.completed_at);

    console.log('\n📋 Section Scores Data:');
    console.log(JSON.stringify(attempt.section_scores, null, 2));

    // Try to match with admin results manually
    const totalScore = parseFloat(attempt.total_score);
    console.log('\n🔍 Trying to match score:', totalScore);

    const ranges = await db.getMany(`
      SELECT *, CAST(SPLIT_PART(score_range, '-', 1) AS INTEGER) as min_score
      FROM test_results
      WHERE test_id = $1 AND result_type = 'range_based' AND is_active = true
      ORDER BY min_score ASC
    `, [attempt.test_id]);

    console.log('\nAvailable ranges:');
    ranges.forEach(r => {
      console.log(`  - ${r.score_range}: ${r.result_code} (${r.title})`);
    });

    let matched = null;
    for (const range of ranges) {
      if (range.score_range) {
        const [min, max] = range.score_range.split('-').map(n => parseInt(n));
        console.log(`\nChecking range ${min}-${max}... Score: ${totalScore}`);
        if (totalScore >= min && totalScore <= max) {
          matched = range;
          console.log(`✅ MATCHED: ${range.result_code}`);
          break;
        } else {
          console.log(`❌ NOT matched (score ${totalScore} not in range ${min}-${max})`);
        }
      }
    }

    if (!matched) {
      console.log('\n⚠️ No matching range found for score:', totalScore);
    } else {
      console.log('\n✅ Should show result:', matched.title);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSMTResult();
