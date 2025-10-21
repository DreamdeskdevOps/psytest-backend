// Script to add missing student fields to users table
require('dotenv').config();
const { executeQuery } = require('./src/config/database');

async function addStudentFields() {
  try {
    console.log('🔄 Adding student fields to users table...\n');

    // Add columns if they don't exist
    const alterQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name VARCHAR(255)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS class VARCHAR(100)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20)',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER'
    ];

    for (const query of alterQueries) {
      console.log(`Executing: ${query}`);
      await executeQuery(query);
      console.log('✅ Success\n');
    }

    // Add indexes
    console.log('📊 Creating indexes...');
    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_school_name ON users(school_name)');
    console.log('✅ Index on school_name created');

    await executeQuery('CREATE INDEX IF NOT EXISTS idx_users_class ON users(class)');
    console.log('✅ Index on class created\n');

    // Verify columns exist
    console.log('🔍 Verifying columns...');
    const result = await executeQuery(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('school_name', 'class', 'whatsapp_number', 'age')
      ORDER BY column_name
    `);

    console.log('\n✅ Columns in users table:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log('You can now restart your backend server.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addStudentFields();
