const db = require('./src/config/database');

async function checkMBTIConfig() {
  try {
    console.log('\n🔍 Checking MBTI Test Configuration...\n');

    // Find MBTI test
    const tests = await db.getMany(`
      SELECT * FROM tests WHERE title ILIKE '%mbti%' LIMIT 1
    `);

    if (tests.length === 0) {
      console.log('❌ No MBTI test found');
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

      try {
        const pattern = typeof config.scoring_pattern === 'string'
          ? JSON.parse(config.scoring_pattern)
          : config.scoring_pattern;

        console.log(`   Scoring Pattern:`, pattern);
        console.log(`   Flag Count: ${pattern?.flagCount || 1}`);

        if (pattern?.flagCount > 1) {
          console.log(`   ⚠️  WARNING: This will trigger Top N scoring!`);
        }
      } catch (e) {
        console.log(`   Pattern: ${config.scoring_pattern}`);
      }
      console.log('');
    });

    // Check test results
    console.log('📋 Checking admin-configured results...');
    const results = await db.getMany(`
      SELECT result_code, title, result_type
      FROM test_results
      WHERE test_id = $1 AND is_active = true
      LIMIT 10
    `, [test.id]);

    console.log(`Found ${results.length} result configurations:`);
    results.forEach(r => {
      console.log(`  - ${r.result_code}: ${r.title} (${r.result_type})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkMBTIConfig();
