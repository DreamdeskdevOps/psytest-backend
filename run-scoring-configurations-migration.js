const { sequelize } = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function runScoringConfigurationsMigration() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create_scoring_configurations_table.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📋 Running scoring configurations table migration...');

    // Execute the migration
    await sequelize.query(migrationSQL);

    console.log('🎉 Scoring configurations table migration completed successfully!');
    console.log('\n📊 Migration created:');
    console.log('- scoring_configurations table: Stores scoring pattern configurations for tests and sections');
    console.log('- Indexes for optimal query performance');
    console.log('- Foreign key constraints for data integrity');
    console.log('- Triggers for automatic timestamp updates');

    console.log('\n🔍 Verifying table...');

    // Verify table was created
    const [results] = await sequelize.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'scoring_configurations'
      ORDER BY ordinal_position
    `);

    console.log('📋 Table structure:');
    results.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    if (results.length > 0) {
      console.log('✅ Scoring configurations table created successfully!');
      console.log('\n🎯 Ready to handle scoring configurations for tests and sections!');
    } else {
      console.log('⚠️ Table may not have been created. Please check manually.');
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
  runScoringConfigurationsMigration();
}

module.exports = { runScoringConfigurationsMigration };