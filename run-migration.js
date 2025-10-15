const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'psytest_database',
  user: 'postgres',
  password: 'Boom#123'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_description_fields_minimal.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('✅ Added description_fields column to tests table');
    console.log('✅ Added description_structure column to test_results table');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
