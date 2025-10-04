const db = require('./src/config/database');

async function runMigration() {
  try {
    console.log('Adding flag_score column to test_results table...');

    await db.getOne(`
      ALTER TABLE test_results
      ADD COLUMN IF NOT EXISTS flag_score INTEGER DEFAULT NULL
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
