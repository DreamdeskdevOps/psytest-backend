// Migration script to add phone_number to admins table
const { sequelize } = require('./src/config/database');

async function migrateAdminPhone() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'admins' AND column_name = 'phone_number';
    `);

    if (results.length === 0) {
      console.log('📝 Adding phone_number column to admins table...');
      
      // Add phone_number column
      await sequelize.query(`
        ALTER TABLE admins ADD COLUMN phone_number VARCHAR(20);
      `);
      
      console.log('✅ phone_number column added successfully');
    } else {
      console.log('ℹ️  phone_number column already exists');
    }

    // Now create/update test admin
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    await sequelize.query(`
      INSERT INTO admins (first_name, last_name, email, password, phone_number, role, is_active, created_at, updated_at)
      VALUES (
        'Test',
        'Admin',
        'admin@test.com',
        :password,
        '9876543210',
        'admin',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone_number = EXCLUDED.phone_number,
        password = EXCLUDED.password,
        updated_at = NOW()
      RETURNING *;
    `, {
      replacements: { password: hashedPassword },
      type: sequelize.QueryTypes.INSERT
    });

    console.log('✅ Test admin created/updated successfully:');
    console.log('   📧 Email: admin@test.com'); 
    console.log('   🔑 Password: admin123');
    console.log('   📱 Phone: 9876543210');
    console.log('\n🎯 Database is ready for testing admin password reset!');
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrateAdminPhone();