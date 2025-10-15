const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing INFP result_type from range_based to flag_based...');

    const result = await client.query(`
      UPDATE test_results
      SET result_type = 'flag_based'
      WHERE result_code = 'INFP'
      AND result_type = 'range_based'
      RETURNING *
    `);

    if (result.rows.length > 0) {
      console.log('✅ Fixed INFP result_type!');
      console.log('   Result Code:', result.rows[0].result_code);
      console.log('   New Result Type:', result.rows[0].result_type);
      console.log('   Title:', result.rows[0].title);
    } else {
      console.log('⚠️ No rows updated - INFP might already be fixed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
