// Script to update admin phone number from 9876543210 to 7679074483
const { sequelize } = require('./src/config/database');

async function updateAdminPhone() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // First, check if the admin with phone number 9876543210 exists
    const [adminCheck] = await sequelize.query(`
      SELECT id, first_name, last_name, email, phone_number 
      FROM admins 
      WHERE phone_number = '9876543210';
    `);

    if (adminCheck.length === 0) {
      console.log('❌ No admin found with phone number 9876543210');
      return;
    }

    console.log('📱 Found admin with phone number 9876543210:');
    console.log('   🆔 ID:', adminCheck[0].id);
    console.log('   👤 Name:', adminCheck[0].first_name, adminCheck[0].last_name);
    console.log('   📧 Email:', adminCheck[0].email);
    console.log('   📱 Current Phone:', adminCheck[0].phone_number);

    // Check if the new phone number already exists
    const [phoneExists] = await sequelize.query(`
      SELECT id, email, phone_number 
      FROM admins 
      WHERE phone_number = '7679074483';
    `);

    if (phoneExists.length > 0) {
      console.log('⚠️  Phone number 7679074483 already exists for another admin:');
      console.log('   🆔 ID:', phoneExists[0].id);
      console.log('   📧 Email:', phoneExists[0].email);
      console.log('   📱 Phone:', phoneExists[0].phone_number);
      console.log('❌ Cannot update - phone number already in use');
      return;
    }

    // Update the phone number
    console.log('🔄 Updating phone number from 9876543210 to 7679074483...');
    
    const [updateResult] = await sequelize.query(`
      UPDATE admins 
      SET phone_number = '7679074483', updated_at = NOW()
      WHERE phone_number = '9876543210'
      RETURNING id, first_name, last_name, email, phone_number, updated_at;
    `);

    if (updateResult.length > 0) {
      console.log('✅ Phone number updated successfully!');
      console.log('   🆔 ID:', updateResult[0].id);
      console.log('   👤 Name:', updateResult[0].first_name, updateResult[0].last_name);
      console.log('   📧 Email:', updateResult[0].email);
      console.log('   📱 New Phone:', updateResult[0].phone_number);
      console.log('   🕐 Updated at:', updateResult[0].updated_at);
    } else {
      console.log('❌ Update failed - no rows were affected');
    }

    // Also check users table in case the phone number is there
    console.log('\n🔍 Checking users table for phone number 9876543210...');
    const [userCheck] = await sequelize.query(`
      SELECT id, first_name, last_name, email, phone_number 
      FROM users 
      WHERE phone_number = '9876543210';
    `);

    if (userCheck.length > 0) {
      console.log('📱 Found user with phone number 9876543210:');
      console.log('   🆔 ID:', userCheck[0].id);
      console.log('   👤 Name:', userCheck[0].first_name, userCheck[0].last_name);
      console.log('   📧 Email:', userCheck[0].email);
      
      // Check if new phone exists in users
      const [userPhoneExists] = await sequelize.query(`
        SELECT id, email, phone_number 
        FROM users 
        WHERE phone_number = '7679074483';
      `);

      if (userPhoneExists.length > 0) {
        console.log('⚠️  Phone number 7679074483 already exists for another user');
      } else {
        console.log('🔄 Updating user phone number from 9876543210 to 7679074483...');
        
        const [userUpdateResult] = await sequelize.query(`
          UPDATE users 
          SET phone_number = '7679074483', updated_at = CURRENT_TIMESTAMP
          WHERE phone_number = '9876543210'
          RETURNING id, first_name, last_name, email, phone_number, updated_at;
        `);

        if (userUpdateResult.length > 0) {
          console.log('✅ User phone number updated successfully!');
          console.log('   🆔 ID:', userUpdateResult[0].id);
          console.log('   👤 Name:', userUpdateResult[0].first_name, userUpdateResult[0].last_name);
          console.log('   📧 Email:', userUpdateResult[0].email);
          console.log('   📱 New Phone:', userUpdateResult[0].phone_number);
        }
      }
    } else {
      console.log('ℹ️  No user found with phone number 9876543210');
    }
    
  } catch (error) {
    console.error('❌ Update error:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    console.log('\n🎯 Database connection closed');
    process.exit(0);
  }
}

updateAdminPhone();