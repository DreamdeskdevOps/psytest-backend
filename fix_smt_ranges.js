const db = require('./src/config/database');

async function fixSMTRanges() {
  try {
    console.log('\n🔧 Fixing SMT Test Ranges...\n');

    // Get SMT test
    const tests = await db.getMany(`
      SELECT * FROM tests WHERE title ILIKE '%SMT%' LIMIT 1
    `);

    const test = tests[0];
    console.log('✅ Test:', test.title);

    // Since options are 0 or 1, with 50 questions:
    // Low: 0-20 total (0-0.4 average)
    // Moderate: 21-35 total (0.42-0.7 average)
    // High: 36-50 total (0.72-1.0 average)

    // But ranges expect whole numbers, so let's use percentage (0-100)
    // We'll update the ranges to match actual scoring

    console.log('\n📊 Updating ranges to match 0-1 scoring...\n');

    // Update Low Motivated (score 0-0.33)
    await db.getOne(`
      UPDATE test_results
      SET score_range = '0.00-0.33'
      WHERE test_id = $1 AND result_code = 'Low Motivated'
    `, [test.id]);
    console.log('✅ Updated: Low Motivated → 0.00-0.33');

    // Update Moderate Motivated (score 0.34-0.66)
    await db.getOne(`
      UPDATE test_results
      SET score_range = '0.34-0.66'
      WHERE test_id = $1 AND result_code = 'Moderate Motivated'
    `, [test.id]);
    console.log('✅ Updated: Moderate Motivated → 0.34-0.66');

    // Update Highly Motivated (score 0.67-1.00)
    await db.getOne(`
      UPDATE test_results
      SET score_range = '0.67-1.00'
      WHERE test_id = $1 AND result_code = 'Highly Motivated'
    `, [test.id]);
    console.log('✅ Updated: Highly Motivated → 0.67-1.00');

    // Verify
    console.log('\n✅ Updated Ranges:');
    const ranges = await db.getMany(`
      SELECT result_code, score_range, title
      FROM test_results
      WHERE test_id = $1 AND result_type = 'range_based'
      ORDER BY score_range
    `, [test.id]);

    ranges.forEach(r => {
      console.log(`  - ${r.score_range}: ${r.result_code}`);
    });

    // Test with recent score
    const attempt = await db.getMany(`
      SELECT total_score, section_scores
      FROM test_attempts
      WHERE test_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [test.id]);

    if (attempt.length > 0) {
      const avg = attempt[0].total_score / (attempt[0].section_scores?.questionCount || 1);
      console.log(`\n📊 Testing with recent attempt:`);
      console.log(`   Average Score: ${avg.toFixed(2)}`);

      for (const range of ranges) {
        const [min, max] = range.score_range.split('-').map(n => parseFloat(n));
        if (avg >= min && avg <= max) {
          console.log(`   ✅ MATCHES: ${range.result_code} (${range.score_range})`);
        }
      }
    }

    console.log('\n🎉 SMT ranges fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixSMTRanges();
