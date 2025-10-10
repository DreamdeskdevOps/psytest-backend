const fs = require('fs');
const path = require('path');
const { executeQuery } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Running PDF Template System Migration...\n');

    const sqlFile = path.join(__dirname, 'migrations', 'create_pdf_templates_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute the migration
    await executeQuery(sql);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('   - pdf_templates');
    console.log('   - pdf_template_fields');
    console.log('   - pdf_generation_history');
    console.log('\n💡 This is a NEW independent feature');
    console.log('   Existing tests and features are NOT affected');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
