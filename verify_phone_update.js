// Script to verify the phone number update
const { sequelize } = require('./src/config/database');

async function verifyPhoneUpdate() {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Check for the old phone number (should not exist)
    const [oldPhoneCheck] = await sequelize.query(`
      SELECT id, email, phone_number, first_name, last_name
      FROM admins 
      WHERE phone_number = '9876543210';
    `);

    console.log('🔍 Checking for old phone number (9876543210):');
    if (oldPhoneCheck.length === 0) {
      console.log('✅ Old phone number (9876543210) not found - successfully removed');
    } else {
      console.log('❌ Old phone number still exists:', oldPhoneCheck);
    }

    // Check for the new phone number (should exist)
    const [newPhoneCheck] = await sequelize.query(`
      SELECT id, email, phone_number, first_name, last_name, updated_at
      FROM admins 
      WHERE phone_number = '7679074483';
    `);

    console.log('\n🔍 Checking for new phone number (7679074483):');
    if (newPhoneCheck.length > 0) {
      console.log('✅ New phone number (7679074483) found successfully!');
      console.log('   🆔 ID:', newPhoneCheck[0].id);
      console.log('   👤 Name:', newPhoneCheck[0].first_name, newPhoneCheck[0].last_name);
      console.log('   📧 Email:', newPhoneCheck[0].email);
      console.log('   📱 Phone:', newPhoneCheck[0].phone_number);
      console.log('   🕐 Last Updated:', newPhoneCheck[0].updated_at);
    } else {
      console.log('❌ New phone number not found');
    }

    // Also check users table
    const [userOldPhone] = await sequelize.query(`
      SELECT id, email, phone_number FROM users WHERE phone_number = '9876543210';
    `);
    
    const [userNewPhone] = await sequelize.query(`
      SELECT id, email, phone_number FROM users WHERE phone_number = '7679074483';
    `);

    console.log('\n🔍 Checking users table:');
    console.log('   Old phone (9876543210):', userOldPhone.length === 0 ? 'Not found ✅' : 'Still exists ❌');
    console.log('   New phone (7679074483):', userNewPhone.length > 0 ? 'Found ✅' : 'Not found ✅');

    if (oldPhoneCheck.length === 0 && newPhoneCheck.length > 0) {
      console.log('\n🎉 Phone number update verification SUCCESSFUL!');
      console.log('   📱 Old number (9876543210) has been completely removed');
      console.log('   📱 New number (7679074483) is now active');
    } else {
      console.log('\n❌ Phone number update verification FAILED!');
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🎯 Database connection closed');
    process.exit(0);
  }
}

verifyPhoneUpdate();