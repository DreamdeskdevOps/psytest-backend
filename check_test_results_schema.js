const db = require('./src/config/database');

async function checkSchema() {
  try {
    const columns = await db.getMany(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'test_results'
      ORDER BY ordinal_position
    `);

    console.log('\n=== test_results Table Schema ===\n');
    columns.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSchema();
