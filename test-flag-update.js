const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Test function to update question flag
const testQuestionFlagUpdate = async () => {
  try {
    console.log('🧪 Testing Question Flag Update Functionality');
    console.log('='.repeat(50));

    // First, let's get all questions to find one to test with
    console.log('1️⃣ Getting a test question...');

    // Get sections first
    const sectionsResponse = await axios.get(`${BASE_URL}/api/v1/admin/sections`, {
      headers: {
        'Authorization': 'Bearer your-token-here' // You may need to adjust this
      }
    });

    if (!sectionsResponse.data.success || !sectionsResponse.data.data.length) {
      console.log('❌ No sections found');
      return;
    }

    const sectionId = sectionsResponse.data.data[0].id;
    console.log(`   Using section: ${sectionId}`);

    // Get questions in this section
    const questionsResponse = await axios.get(`${BASE_URL}/api/v1/admin/sections/${sectionId}/questions`, {
      headers: {
        'Authorization': 'Bearer your-token-here'
      }
    });

    if (!questionsResponse.data.success || !questionsResponse.data.data.questions.length) {
      console.log('❌ No questions found in section');
      return;
    }

    const testQuestion = questionsResponse.data.data.questions[0];
    console.log(`   Using question: ${testQuestion.id}`);
    console.log(`   Current flag: "${testQuestion.question_flag || 'null'}"`);

    // Update the question flag
    console.log('\n2️⃣ Updating question flag...');
    const newFlag = 'TEST_FLAG_' + Date.now();

    const updateResponse = await axios.put(`${BASE_URL}/api/v1/admin/questions/${testQuestion.id}`, {
      questionFlag: newFlag
    }, {
      headers: {
        'Authorization': 'Bearer your-token-here',
        'Content-Type': 'application/json'
      }
    });

    if (updateResponse.data.success) {
      console.log(`   ✅ Question flag updated successfully!`);
      console.log(`   New flag: "${newFlag}"`);

      // Verify the update by fetching the question again
      console.log('\n3️⃣ Verifying update...');
      const verifyResponse = await axios.get(`${BASE_URL}/api/v1/admin/questions/${testQuestion.id}`, {
        headers: {
          'Authorization': 'Bearer your-token-here'
        }
      });

      if (verifyResponse.data.success) {
        const updatedQuestion = verifyResponse.data.data;
        if (updatedQuestion.question_flag === newFlag) {
          console.log('   ✅ Flag update verified successfully!');
          console.log(`   Verified flag: "${updatedQuestion.question_flag}"`);
        } else {
          console.log('   ❌ Flag update verification failed');
          console.log(`   Expected: "${newFlag}"`);
          console.log(`   Got: "${updatedQuestion.question_flag}"`);
        }
      } else {
        console.log('   ❌ Failed to verify flag update');
      }
    } else {
      console.log('   ❌ Failed to update question flag');
      console.log('   Error:', updateResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.log('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);

      // If it's a connection error, the server might not be running
      if (error.code === 'ECONNREFUSED') {
        console.log('💡 Make sure the backend server is running on port 3001');
        console.log('   Run: cd psytest-backend && npm start');
      }
    }
  }
};

// Run the test
testQuestionFlagUpdate();