// Script to create test admin for testing OTP password reset
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');

async function createTestAdmin() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Hash password
    const hashedPassword = await bcrypt.hash('Boom#123', 12);

    // Create test admin using raw SQL (since table might not be fully synced)
    const [results] = await sequelize.query(`
      INSERT INTO admins (id, first_name, last_name, email, password, phone_number, role, is_active, created_at, updated_at)
      VALUES (
        uuid_generate_v4(),
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
    console.log('   🔑 Password: Boom#123');
    console.log('   📱 Phone: 9876543210');
    console.log('\n🎯 Now you can test the password reset flow!');
    
  } catch (error) {
    if (error.message.includes('uuid_generate_v4')) {
      console.log('⚠️  UUID extension not enabled. Trying alternative...');
      
      // Try without UUID extension
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
          updated_at = NOW();
      `, {
        replacements: { password: hashedPassword },
        type: sequelize.QueryTypes.INSERT
      });
      
      console.log('✅ Test admin created successfully (alternative method)');
    } else {
      console.error('❌ Error creating test admin:', error.message);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createTestAdmin();