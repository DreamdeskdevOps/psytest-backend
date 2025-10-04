const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'psytest_db',
  password: process.env.DB_PASSWORD || 'admin',
  port: process.env.DB_PORT || 5432,
});

async function clearResults() {
  try {
    const result = await pool.query("DELETE FROM test_attempts WHERE status='completed'");
    console.log('✅ Deleted all completed test attempts:', result.rowCount, 'rows deleted');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearResults();
