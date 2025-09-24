const axios = require('axios');

// Test the scoring endpoints to ensure they work properly
const baseURL = 'http://localhost:3001/api/v1';

async function testScoringEndpoints() {
    console.log('🧪 Testing Scoring API Endpoints...\n');

    try {
        // Test 1: Test flags endpoint with a valid test ID
        console.log('1️⃣ Testing getTestFlags endpoint');
        try {
            const testId = '5285f3a7-ade4-44ce-9977-fc0cc4f18196'; // Sample test ID from error
            const sectionId = '689a1d68-75f5-4d58-b7c2-d57d8ba083a6'; // Sample section ID from error

            const flagsResponse = await axios.get(`${baseURL}/admin/scoring/tests/${testId}/flags?sectionId=${sectionId}`);
            console.log('✅ Test flags endpoint successful');
            console.log('   Status:', flagsResponse.status);
            console.log('   Flags found:', flagsResponse.data.data?.length || 0);
            console.log('   Sample flags:', JSON.stringify(flagsResponse.data.data?.slice(0, 3), null, 2));
        } catch (error) {
            console.log('❌ Test flags endpoint failed');
            console.log('   Status:', error.response?.status);
            console.log('   Error:', error.response?.data?.message || error.message);
        }
        console.log('');

        // Test 2: Configuration endpoint
        console.log('2️⃣ Testing getConfiguration endpoint');
        try {
            const testId = '5285f3a7-ade4-44ce-9977-fc0cc4f18196';
            const sectionId = '689a1d68-75f5-4d58-b7c2-d57d8ba083a6';

            const configResponse = await axios.get(`${baseURL}/admin/scoring/tests/${testId}/configuration?sectionId=${sectionId}`);
            console.log('✅ Configuration endpoint successful');
            console.log('   Status:', configResponse.status);
            console.log('   Configuration:', configResponse.data);
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Configuration endpoint working (404 means no config exists - normal)');
                console.log('   Status:', error.response.status);
                console.log('   Message:', error.response.data?.message);
            } else {
                console.log('❌ Configuration endpoint failed');
                console.log('   Status:', error.response?.status);
                console.log('   Error:', error.response?.data?.message || error.message);
            }
        }
        console.log('');

        // Test 3: Available patterns endpoint
        console.log('3️⃣ Testing getAvailablePatterns endpoint');
        try {
            const patternsResponse = await axios.get(`${baseURL}/admin/scoring/patterns`);
            console.log('✅ Available patterns endpoint successful');
            console.log('   Status:', patternsResponse.status);
            console.log('   Patterns available:', patternsResponse.data.data?.length || 0);
            console.log('   Sample patterns:', JSON.stringify(patternsResponse.data.data?.slice(0, 2), null, 2));
        } catch (error) {
            console.log('❌ Available patterns endpoint failed');
            console.log('   Status:', error.response?.status);
            console.log('   Error:', error.response?.data?.message || error.message);
        }
        console.log('');

        console.log('🎉 Scoring endpoints test completed!');
        console.log('✨ Check the results above to see which endpoints are working correctly.');

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Run the test
testScoringEndpoints().catch(console.error);