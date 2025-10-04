const db = require('./src/config/database');

async function checkTables() {
  try {
    const tables = await db.getMany(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE '%flag%' OR table_name LIKE '%code%' OR table_name LIKE '%result%'
      ORDER BY table_name
    `);

    console.log('\n=== Tables Related to Flags/Codes/Results ===\n');
    tables.forEach(t => console.log(`- ${t.table_name}`));

    console.log('\n=== Checking test_results table ===\n');
    const sampleResults = await db.getMany(`
      SELECT id, test_id, result_code, flag_score, score_range, title, result_type
      FROM test_results
      LIMIT 5
    `);

    console.log('Sample test_results entries:');
    console.table(sampleResults);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
