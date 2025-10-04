const db = require('./src/config/database');

async function checkSMTOptions() {
  try {
    console.log('\n🔍 Checking SMT Test Options Configuration...\n');

    // Get SMT test
    const tests = await db.getMany(`
      SELECT * FROM tests WHERE title ILIKE '%SMT%' LIMIT 1
    `);

    if (tests.length === 0) {
      console.log('❌ No SMT test found');
      process.exit(1);
    }

    const test = tests[0];
    console.log('✅ Test:', test.title);

    // Get sections
    const sections = await db.getMany(`
      SELECT * FROM test_sections WHERE test_id = $1
    `, [test.id]);

    console.log(`\nFound ${sections.length} section(s):\n`);

    sections.forEach((section, idx) => {
      console.log(`${idx + 1}. Section: ${section.section_name}`);
      console.log(`   ID: ${section.id}`);

      try {
        const config = typeof section.custom_scoring_config === 'string'
          ? JSON.parse(section.custom_scoring_config)
          : section.custom_scoring_config;

        if (config && config.section_options) {
          console.log(`   Options configured: ${config.section_options.length}`);
          console.log('\n   Option Values:');
          config.section_options.forEach((opt, i) => {
            console.log(`     ${i + 1}. "${opt.text}" = ${opt.value}`);
          });
        } else {
          console.log('   ⚠️ No section_options found in config');
        }
      } catch (e) {
        console.log('   ⚠️ Error parsing config:', e.message);
      }
      console.log('');
    });

    // Get configured ranges
    console.log('📋 Admin-Configured Ranges:');
    const ranges = await db.getMany(`
      SELECT result_code, score_range, title
      FROM test_results
      WHERE test_id = $1 AND result_type = 'range_based' AND is_active = true
      ORDER BY score_range
    `, [test.id]);

    ranges.forEach(r => {
      console.log(`  - ${r.score_range}: ${r.result_code} (${r.title})`);
    });

    // Calculate what the ranges should be based on current data
    const attempt = await db.getMany(`
      SELECT total_score, section_scores
      FROM test_attempts
      WHERE test_id = $1 AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [test.id]);

    if (attempt.length > 0) {
      console.log('\n📊 Most Recent Completed Attempt:');
      console.log(`   Total Score: ${attempt[0].total_score}`);
      console.log(`   Question Count: ${attempt[0].section_scores?.questionCount || 'N/A'}`);

      const avg = attempt[0].total_score / (attempt[0].section_scores?.questionCount || 1);
      console.log(`   Average: ${avg.toFixed(2)}`);

      console.log('\n💡 Suggestion:');
      console.log('   Option values should range from 1-6 (or similar)');
      console.log('   Current average is:', avg.toFixed(2));
      console.log('   Expected average range: 1-6');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSMTOptions();
