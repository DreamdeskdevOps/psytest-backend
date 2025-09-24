const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting scoring patterns table migration...');

        // Read the SQL migration file
        const migrationPath = path.join(__dirname, 'migrations', 'create_scoring_patterns_table.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute the migration
        await client.query(migrationSQL);

        console.log('✅ Scoring patterns table created successfully!');
        console.log('✅ Default patterns inserted!');
        console.log('✅ Indexes created!');
        console.log('✅ Migration completed successfully!');

        // Verify the table was created
        const result = await client.query('SELECT COUNT(*) as count FROM scoring_patterns');
        console.log(`📊 Total patterns in table: ${result.rows[0].count}`);

        // List the default patterns
        const patterns = await client.query('SELECT id, name, category, type FROM scoring_patterns ORDER BY id');
        console.log('\n📋 Default patterns created:');
        patterns.rows.forEach(pattern => {
            console.log(`  ${pattern.id}. ${pattern.name} (${pattern.category}/${pattern.type})`);
        });

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
});