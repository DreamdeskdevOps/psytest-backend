const db = require('./src/config/database');

async function deleteCompleted() {
  try {
    const attempts = await db.getMany('SELECT id FROM test_attempts WHERE status = $1', ['completed']);
    console.log('Found', attempts.length, 'completed attempts');

    for (const a of attempts) {
      await db.deleteOne('DELETE FROM user_responses WHERE attempt_id = $1', [a.id]);
      await db.deleteOne('DELETE FROM test_attempts WHERE id = $1', [a.id]);
    }

    console.log('Deleted all completed attempts');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

deleteCompleted();
