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
    // Check test_results for MBTI test
    const results = await client.query(`
      SELECT tr.*, t.title
      FROM test_results tr
      JOIN tests t ON tr.test_id = t.id
      WHERE t.title LIKE '%MBTI%' OR t.title LIKE '%Briggs%'
      ORDER BY tr.created_at DESC
    `);

    console.log('📋 MBTI Test Results in database:');
    console.log('Total entries:', results.rows.length);
    results.rows.forEach(r => {
      console.log('---');
      console.log('Result Code:', r.result_code);
      console.log('Title:', r.title);
      console.log('Score Range:', r.score_range);
      console.log('Result Type:', r.result_type);
      console.log('Is Active:', r.is_active);
      console.log('Description length:', r.description?.length || 0);
      if (r.description) {
        console.log('Description preview:', r.description.substring(0, 200) + '...');
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
