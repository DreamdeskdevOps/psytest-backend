const db = require('./src/config/database');

async function checkSMTConfig() {
  try {
    const sections = await db.getMany(`
      SELECT ts.section_name, ts.scoring_pattern
      FROM test_sections ts
      JOIN tests t ON ts.test_id = t.id
      WHERE t.title LIKE '%SMT%'
    `);

    console.log('\n=== SMT Section Configuration ===\n');
    sections.forEach(s => {
      console.log('Section:', s.section_name);
      console.log('  Scoring Pattern:', s.scoring_pattern);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSMTConfig();
