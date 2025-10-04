const db = require('./src/config/database');

async function checkSMTConfig() {
  try {
    console.log('\n🔍 Checking SMT Test Configuration...\n');

    // Find SMT test
    const tests = await db.getMany(`
      SELECT * FROM tests WHERE title ILIKE '%SMT%' OR title ILIKE '%motivation%' LIMIT 1
    `);

    if (tests.length === 0) {
      console.log('❌ No SMT test found');
      process.exit(1);
    }

    const test = tests[0];
    console.log('✅ Found test:', test.title);
    console.log('   Test ID:', test.id);

    // Check scoring configuration
    console.log('\n📊 Checking scoring configurations...');
    const scoringConfigs = await db.getMany(`
      SELECT sc.*, ts.section_name
      FROM scoring_configurations sc
      LEFT JOIN test_sections ts ON sc.section_id = ts.id
      WHERE sc.test_id = $1 AND sc.is_active = true
    `, [test.id]);

    console.log(`Found ${scoringConfigs.length} scoring configurations:\n`);

    scoringConfigs.forEach((config, index) => {
      console.log(`${index + 1}. Section: ${config.section_name || 'N/A'}`);
      console.log(`   Scoring Type: ${config.scoring_type}`);
      console.log(`   Pattern: ${JSON.stringify(config.scoring_pattern)}`);
      console.log('');
    });

    // Check test results (range-based)
    console.log('📋 Checking admin-configured results (range-based)...');
    const results = await db.getMany(`
      SELECT result_code, title, result_type, score_range
      FROM test_results
      WHERE test_id = $1 AND is_active = true
      ORDER BY result_code
    `, [test.id]);

    console.log(`Found ${results.length} result configurations:`);
    results.forEach(r => {
      console.log(`  - ${r.result_code} (${r.score_range || 'N/A'}): ${r.title} [${r.result_type}]`);
    });

    // Check recent attempts
    console.log('\n📊 Checking recent SMT attempts...');
    const attempts = await db.getMany(`
      SELECT id, status, total_score, created_at, completed_at, section_scores
      FROM test_attempts
      WHERE test_id = $1
      ORDER BY created_at DESC
      LIMIT 3
    `, [test.id]);

    console.log(`Found ${attempts.length} recent attempts:`);
    attempts.forEach((attempt, idx) => {
      console.log(`\n${idx + 1}. Attempt ID: ${attempt.id}`);
      console.log(`   Status: ${attempt.status}`);
      console.log(`   Total Score: ${attempt.total_score}`);
      console.log(`   Created: ${attempt.created_at}`);
      console.log(`   Completed: ${attempt.completed_at || 'Not completed'}`);

      const sectionScores = attempt.section_scores || {};
      console.log(`   Scoring Type: ${sectionScores.scoringType || 'N/A'}`);
      console.log(`   Result Title: ${sectionScores.resultTitle || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSMTConfig();
