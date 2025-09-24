const { sequelize } = require('./src/config/database');

async function checkScoringTable() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Check if the table exists
        console.log('\n📋 Checking if scoring_configurations table exists...');
        const [tableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'scoring_configurations'
            );
        `);

        console.log('Table exists:', tableExists[0].exists);

        if (tableExists[0].exists) {
            // Check table structure
            console.log('\n🏗️ Table structure:');
            const [columns] = await sequelize.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'scoring_configurations'
                ORDER BY ordinal_position;
            `);

            columns.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });

            // Check if there are any records
            console.log('\n📊 Checking for existing records...');
            const [records] = await sequelize.query(`
                SELECT COUNT(*) as total FROM scoring_configurations;
            `);

            console.log(`Total records: ${records[0].total}`);

            if (records[0].total > 0) {
                console.log('\n📋 Sample records:');
                const [samples] = await sequelize.query(`
                    SELECT id, test_id, section_id, scoring_type, is_active, created_at
                    FROM scoring_configurations
                    ORDER BY created_at DESC
                    LIMIT 5;
                `);

                samples.forEach(record => {
                    console.log(`  - ID: ${record.id}, Test: ${record.test_id}, Section: ${record.section_id || 'NULL'}, Type: ${record.scoring_type}, Active: ${record.is_active}`);
                });
            }

            // Check for specific test ID
            const testId = 'dcf9590c-997d-42d2-a920-3d97daaabb9c';
            console.log(`\n🔍 Checking for specific test ID: ${testId}`);
            const [specificTest] = await sequelize.query(`
                SELECT * FROM scoring_configurations
                WHERE test_id = ?;
            `, { replacements: [testId] });

            console.log(`Records for test ${testId}:`, specificTest.length);
        }

    } catch (error) {
        console.error('❌ Database check failed:', error.message);
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
}

checkScoringTable().catch(console.error);