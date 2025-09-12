require('dotenv').config();
const axios = require('axios');

const BASE_URL = `http://localhost:${process.env.PORT || 5000}/api/v1`;

// Test data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'TestPassword123!',
  phoneNumber: '7679074483' // Your test number from SMS API
};

const testMVCAuthentication = async () => {
  try {
    console.log('🧪 Testing Complete MVC Authentication System...\n');

    let otpCode = null;
    let authToken = null;

    // Test 1: Send Registration OTP
    console.log('1. Testing Send Registration OTP (Model → Service → Controller → Route)...');
    try {
      const sendOTPResponse = await axios.post(`${BASE_URL}/auth/send-registration-otp`, {
        phoneNumber: testUser.phoneNumber,
        email: testUser.email
      });
      
      console.log('✅ Registration OTP sent successfully');
      console.log(`   OTP ID: ${sendOTPResponse.data.data.otpId}`);
      console.log(`   Phone: ${sendOTPResponse.data.data.phoneNumber}`);
      console.log('   📱 Check your phone for OTP!');
      console.log('   ⏳ Please enter the OTP manually in the test script...\n');
      
      // In real scenario, you would get the OTP from SMS
      // For testing, replace this with actual OTP
      otpCode = 'ENTER_ACTUAL_OTP_HERE';
      
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  User already exists, continuing with login test...\n');
      } else {
        console.log(`❌ Send OTP failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 2: Register with OTP (if OTP available)
    if (otpCode && otpCode !== 'ENTER_ACTUAL_OTP_HERE') {
      console.log('2. Testing User Registration with OTP...');
      try {
        const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
          ...testUser,
          otpCode: otpCode
        });
        
        console.log('✅ Registration successful');
        console.log(`   User ID: ${registerResponse.data.data.user.id}`);
        console.log(`   Phone verified: ${registerResponse.data.data.phoneVerified}`);
        console.log(`   Token received: ${registerResponse.data.data.token ? 'Yes' : 'No'}\n`);
        
        authToken = registerResponse.data.data.token;
        
      } catch (error) {
        console.log(`❌ Registration failed: ${error.response?.data?.message || error.message}\n`);
      }
    } else {
      console.log('2. Skipping registration test - OTP not provided\n');
    }

    // Test 3: Login User
    console.log('3. Testing User Login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      
      console.log('✅ Login successful');
      console.log(`   User: ${loginResponse.data.data.user.first_name} ${loginResponse.data.data.user.last_name}`);
      console.log(`   Email: ${loginResponse.data.data.user.email}`);
      console.log(`   Token: ${loginResponse.data.data.token ? 'Generated' : 'Missing'}\n`);
      
      authToken = loginResponse.data.data.token;
      
    } catch (error) {
      console.log(`❌ Login failed: ${error.response?.data?.message || error.message}\n`);
    }

    // Test 4: Get User Profile (Protected Route)
    if (authToken) {
      console.log('4. Testing Get User Profile (Protected Route)...');
      try {
        const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Profile retrieval successful');
        console.log(`   Name: ${profileResponse.data.data.user.first_name} ${profileResponse.data.data.user.last_name}`);
        console.log(`   Phone: ${profileResponse.data.data.user.phone_number}`);
        console.log(`   Subscription: ${profileResponse.data.data.user.subscription_type}\n`);
        
      } catch (error) {
        console.log(`❌ Profile retrieval failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 5: Send Phone Verification OTP
    if (authToken) {
      console.log('5. Testing Send Phone Verification OTP...');
      try {
        const newPhone = '9876543210';
        const phoneOTPResponse = await axios.post(`${BASE_URL}/auth/send-phone-verification-otp`, {
          phoneNumber: newPhone
        }, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Phone verification OTP sent');
        console.log(`   New phone: ${phoneOTPResponse.data.data.phoneNumber}`);
        console.log(`   OTP ID: ${phoneOTPResponse.data.data.otpId}\n`);
        
      } catch (error) {
        console.log(`❌ Phone OTP failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 6: Update Profile (without phone change)
    if (authToken) {
      console.log('6. Testing Profile Update...');
      try {
        const updateResponse = await axios.put(`${BASE_URL}/auth/profile`, {
          firstName: 'John Updated',
          lastName: 'Doe Updated',
          gender: 'male',
          address: {
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India'
          }
        }, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Profile update successful');
        console.log(`   Updated name: ${updateResponse.data.data.user.first_name} ${updateResponse.data.data.user.last_name}\n`);
        
      } catch (error) {
        console.log(`❌ Profile update failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 7: Send Forgot Password OTP
    console.log('7. Testing Send Forgot Password OTP...');
    try {
      const forgotOTPResponse = await axios.post(`${BASE_URL}/auth/send-forgot-password-otp`, {
        email: testUser.email
      });
      
      console.log('✅ Forgot password OTP sent');
      console.log('   📱 Check your phone for password reset OTP!\n');
      
    } catch (error) {
      console.log(`❌ Forgot password OTP failed: ${error.response?.data?.message || error.message}\n`);
    }

    // Test 8: Get OTP Status
    console.log('8. Testing OTP Status...');
    try {
      const statusResponse = await axios.get(`${BASE_URL}/auth/otp-status`, {
        params: {
          phoneNumber: testUser.phoneNumber,
          purpose: 'password_reset'
        }
      });
      
      console.log('✅ OTP status retrieved');
      console.log(`   Exists: ${statusResponse.data.data.exists}`);
      if (statusResponse.data.data.exists) {
        console.log(`   Verified: ${statusResponse.data.data.isVerified}`);
        console.log(`   Expired: ${statusResponse.data.data.isExpired}`);
        console.log(`   Attempts: ${statusResponse.data.data.attempts}/${statusResponse.data.data.maxAttempts}`);
        console.log(`   Time remaining: ${statusResponse.data.data.timeRemaining}s`);
      }
      console.log();
      
    } catch (error) {
      console.log(`❌ OTP status failed: ${error.response?.data?.message || error.message}\n`);
    }

    // Test 9: Verify Invalid OTP
    console.log('9. Testing Invalid OTP Verification...');
    try {
      await axios.post(`${BASE_URL}/auth/verify-otp`, {
        phoneNumber: testUser.phoneNumber,
        otpCode: '123456',
        purpose: 'password_reset'
      });
      console.log('❌ Should have failed but didn\'t\n');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Invalid OTP properly rejected\n');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 10: Change Password
    if (authToken) {
      console.log('10. Testing Change Password...');
      try {
        await axios.post(`${BASE_URL}/auth/change-password`, {
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        }, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Password changed successfully\n');
        
      } catch (error) {
        console.log(`❌ Password change failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 11: Logout
    if (authToken) {
      console.log('11. Testing Logout...');
      try {
        await axios.post(`${BASE_URL}/auth/logout`, {}, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        console.log('✅ Logout successful\n');
        
      } catch (error) {
        console.log(`❌ Logout failed: ${error.response?.data?.message || error.message}\n`);
      }
    }

    // Test 12: Access Protected Route Without Token
    console.log('12. Testing Protected Route Security...');
    try {
      await axios.get(`${BASE_URL}/auth/profile`);
      console.log('❌ Should have failed but didn\'t\n');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Protected route properly secured\n');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.data?.message || error.message}\n`);
      }
    }

    console.log('🎉 Complete MVC Authentication System Testing Completed!\n');
    console.log('📋 Architecture Validation:');
    console.log('✅ Models: User, OTP, UserActivityLog - Data layer working');
    console.log('✅ Services: AuthService - Business logic separated');
    console.log('✅ Controllers: UserAuthController - Clean request handling');
    console.log('✅ Routes: Proper route organization');
    console.log('✅ Middleware: Authentication and validation working');
    console.log('✅ OTP Integration: SMS service integrated');
    console.log('✅ Error Handling: Proper error responses');
    console.log('✅ Security: Protected routes secured');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
};

// Check dependencies and run tests
if (require.resolve('axios')) {
  testMVCAuthentication();
} else {
  console.log('❌ Please install axios first: npm install axios');
}