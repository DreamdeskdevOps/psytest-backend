const { sequelize } = require('./src/config/database');

async function checkAdmins() {
    try {
        console.log('🔌 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        // Check for admins
        console.log('\n👥 Checking for admin records...');
        const [admins] = await sequelize.query(`
            SELECT id, email, name, created_at FROM admins
            ORDER BY created_at DESC
            LIMIT 5;
        `);

        console.log(`Found ${admins.length} admin records:`);
        admins.forEach(admin => {
            console.log(`  - ID: ${admin.id}, Email: ${admin.email}, Name: ${admin.name}`);
        });

        if (admins.length === 0) {
            console.log('\n🔧 No admins found, creating a test admin...');
            const [newAdmin] = await sequelize.query(`
                INSERT INTO admins (id, name, email, password, created_at, updated_at)
                VALUES (
                    '12345678-1234-1234-1234-123456789012',
                    'Test Admin',
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
        console.error('❌ Database check failed:', error.message);
    } finally {
        await sequelize.close();
        console.log('🔌 Database connection closed');
    }
}

checkAdmins().catch(console.error);