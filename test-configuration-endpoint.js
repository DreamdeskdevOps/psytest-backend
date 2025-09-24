const axios = require('axios');

const testId = 'dcf9590c-997d-42d2-a920-3d97daaabb9c';
const sectionId = '0fc1dd29-4926-43ca-be09-dc49a199b74f';
const baseURL = 'http://localhost:3001/api/v1';

async function testConfigurationEndpoint() {
    console.log('🧪 Testing Configuration Endpoint...\n');

    try {
        // Test the exact URL from the error
        const url = `${baseURL}/admin/scoring/tests/${testId}/configuration?sectionId=${sectionId}`;
        console.log('🔍 Testing URL:', url);

        const response = await axios.get(url);
        console.log('✅ Configuration endpoint successful');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('❌ Configuration endpoint failed');
        console.log('Status:', error.response?.status);
        console.log('Status Text:', error.response?.statusText);
        console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));

        // Let's also test if this is a database/table issue
        console.log('\n🔍 Checking if this is a table/database issue...');

        // Test with different test ID to see if it's UUID-specific
        try {
            const simpleUrl = `${baseURL}/admin/scoring/tests/123/configuration`;
            console.log('🔍 Testing with simple ID:', simpleUrl);
            await axios.get(simpleUrl);
        } catch (simpleError) {
            console.log('Simple ID test status:', simpleError.response?.status);
            console.log('Simple ID error:', simpleError.response?.data?.message);
        }
    }

    // Test if we can directly access the database table
    console.log('\n🗄️ Let\'s check if the table exists and what\'s in it...');
}

testConfigurationEndpoint().catch(console.error);