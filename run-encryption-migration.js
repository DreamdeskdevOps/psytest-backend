const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('🔄 Running encryption tracking migration...');

    // Add is_encrypted column
    await pool.query(`
      ALTER TABLE pdf_generation_history
      ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false
    `);
    console.log('✅ Added is_encrypted column');

    // Add email_sent column
    await pool.query(`
      ALTER TABLE pdf_generation_history
      ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false
    `);
    console.log('✅ Added email_sent column');

    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'pdf_generation_history'
      AND column_name IN ('is_encrypted', 'email_sent')
      ORDER BY column_name
    `);

    console.log('\n📊 Verification:');
    console.table(result.rows);

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
