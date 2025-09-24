const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runScoringMigration() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_scoring_system.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📋 Running scoring system migration...');

    // Execute the migration
    await sequelize.query(migrationSQL);

    console.log('🎉 Scoring system migration completed successfully!');
    console.log('\n📊 Migration created the following tables:');
    console.log('- scoring_configurations: Stores scoring patterns for tests/sections');
    console.log('- test_results: Stores calculated test results');
    console.log('- flag_score_details: Stores detailed question score breakdowns');

    console.log('\n🔍 Verifying tables...');

    // Verify tables were created
    const [results] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('scoring_configurations', 'test_results', 'flag_score_details')
      ORDER BY table_name
    `);

    console.log('📋 Created tables:', results.map(r => r.table_name).join(', '));

    if (results.length === 3) {
      console.log('✅ All scoring system tables created successfully!');
    } else {
      console.log('⚠️ Some tables may not have been created. Please check manually.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  runScoringMigration();
}

module.exports = { runScoringMigration };