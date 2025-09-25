const { sequelize } = require('./src/config/database');

async function checkAdminsStructure() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Check admins table structure
        console.log('\n🏗️ Admins table structure:');
        const [columns] = await sequelize.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'admins'
            ORDER BY ordinal_position;
        `);

        columns.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });

        // Check if there are any admins
        console.log('\n👥 Checking for admin records...');
        const [admins] = await sequelize.query(`
            SELECT * FROM admins LIMIT 3;
        `);

        console.log(`Found ${admins.length} admin records:`);
        admins.forEach(admin => {
            console.log(`  - ID: ${admin.id}, Email: ${admin.email || admin.username || 'N/A'}`);
        });

        if (admins.length === 0) {
            console.log('\n🔧 No admins found, creating a test admin...');

            // Get column names first to build proper INSERT
            const columnNames = columns.map(col => col.column_name);
            console.log('Available columns:', columnNames);

            // Create basic insert with minimal required fields
            const [newAdmin] = await sequelize.query(`
                INSERT INTO admins (id, email, password, created_at, updated_at)
                VALUES (
                    '12345678-1234-1234-1234-123456789012',
                    'test@admin.com',
                    '$2a$10$test.hash.for.development',
                    NOW(),
                    NOW()
                )
                RETURNING *;
            `);

            console.log('✅ Test admin created:', newAdmin[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);

        // If admins table doesn't exist, that's also important to know
        if (error.message.includes('relation "admins" does not exist')) {
            console.log('\n⚠️ Admins table does not exist. This explains the foreign key constraint error.');
        }
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
}

checkAdminsStructure().catch(console.error);