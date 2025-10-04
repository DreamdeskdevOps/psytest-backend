const axios = require('axios');

async function testResultsAPI() {
  try {
    console.log('Testing Results API endpoint...\n');

    const response = await axios.get('http://localhost:3001/api/v1/test-attempts/user/attempts-no-auth');

    console.log('Status:', response.status);
    console.log('Success:', response.data.success);
    console.log('Message:', response.data.message);
    console.log('Attempts found:', response.data.data?.attempts?.length || 0);

    if (response.data.data?.attempts?.length > 0) {
      console.log('\n=== Test Results ===\n');
      response.data.data.attempts.forEach((attempt, index) => {
        console.log(`${index + 1}. ${attempt.test_title}`);
        console.log(`   Result Code: ${attempt.result_code}`);
        console.log(`   Result Title: ${attempt.result_title}`);
        console.log(`   Score: ${attempt.final_score}`);
        console.log(`   Completed: ${attempt.completed_at}`);
        console.log('');
      });
      console.log('✅ API is working correctly!');
    } else {
      console.log('\n⚠️ No results returned from API');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing API:');
    console.error('   Message:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testResultsAPI();
