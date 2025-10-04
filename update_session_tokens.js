const db = require('./src/config/database');
const crypto = require('crypto');

async function updateSessionTokens() {
  try {
    const rows = await db.getMany('SELECT id FROM test_attempts WHERE session_token IS NULL');
    console.log('Found', rows.length, 'attempts without session_token');

    for (const row of rows) {
      const token = crypto.randomBytes(32).toString('hex');
      await db.updateOne('UPDATE test_attempts SET session_token = $1 WHERE id = $2', [token, row.id]);
    }

    console.log('Updated all records');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateSessionTokens();
