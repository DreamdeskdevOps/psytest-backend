// Script to create test user for testing login
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');

async function createTestUser() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Hash password
    const hashedPassword = await bcrypt.hash('TestUser@123', 12);

    // Create test user using raw SQL
    const [results] = await sequelize.query(`
      INSERT INTO users (
        id, first_name, last_name, email, password, phone_number,
        is_email_verified, is_active, created_at, updated_at
      )
      VALUES (
        uuid_generate_v4(),
        'Test',
        'User',
        'testuser@example.com',
        :password,
        '9876543210',
        true,
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

    console.log('✅ Test user created/updated successfully:');
    console.log('   📧 Email: testuser@example.com');
    console.log('   🔑 Password: TestUser@123');
    console.log('   📱 Phone: 9876543210');
    console.log('\n🎯 Now you can test the user login flow!');

  } catch (error) {
    console.error('❌ Error creating test user:', error);

    // Try alternative method without uuid_generate_v4
    if (error.message.includes('uuid_generate_v4')) {
      console.log('⚠️  UUID extension not enabled. Trying alternative...');
      try {
        const { v4: uuidv4 } = require('uuid');
        const hashedPassword = await bcrypt.hash('TestUser@123', 12);

        const [results] = await sequelize.query(`
          INSERT INTO users (
            id, first_name, last_name, email, password, phone_number,
            email_verified, phone_verified, is_active, created_at, updated_at
          )
          VALUES (
            :id,
            'Test',
            'User',
            'testuser@example.com',
            :password,
            '+919876543210',
            true,
            true,
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
          replacements: {
            id: uuidv4(),
            password: hashedPassword
          },
          type: sequelize.QueryTypes.INSERT
        });

        console.log('✅ Test user created/updated successfully (with UUID fallback):');
        console.log('   📧 Email: testuser@example.com');
        console.log('   🔑 Password: TestUser@123');
        console.log('   📱 Phone: 9876543210');

      } catch (fallbackError) {
        console.error('❌ Fallback method also failed:', fallbackError);
      }
    }
  } finally {
    await sequelize.close();
  }
}

createTestUser();