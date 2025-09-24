const axios = require('axios');

const testId = 'dcf9590c-997d-42d2-a920-3d97daaabb9c';
const sectionId = '0fc1dd29-4926-43ca-be09-dc49a199b74f';
const baseURL = 'http://localhost:3001/api/v1';

async function testSaveConfiguration() {
    console.log('🧪 Testing Save Configuration...\n');

    try {
        // Test saving a configuration
        const saveUrl = `${baseURL}/admin/scoring/tests/${testId}/configuration`;
        console.log('💾 Saving configuration to:', saveUrl);

        const configData = {
            sectionId: sectionId,
            scoringType: 'flag_based',
            scoringPattern: {
                type: 'preset-highest',
                flagCount: 1,
                orderDirection: 'high-to-low'
            },
            createdBy: '12345678-1234-1234-1234-123456789012' // Mock admin UUID
        };

        console.log('📋 Configuration data:', JSON.stringify(configData, null, 2));

        const saveResponse = await axios.post(saveUrl, configData);
        console.log('✅ Configuration saved successfully');
        console.log('Status:', saveResponse.status);
        console.log('Response:', JSON.stringify(saveResponse.data, null, 2));

        // Now try to retrieve it
        console.log('\n🔍 Retrieving saved configuration...');
        const getUrl = `${baseURL}/admin/scoring/tests/${testId}/configuration?sectionId=${sectionId}`;
        const getResponse = await axios.get(getUrl);

        console.log('✅ Configuration retrieved successfully');
        console.log('Status:', getResponse.status);
        console.log('Retrieved data:', JSON.stringify(getResponse.data, null, 2));

    } catch (error) {
        console.log('❌ Test failed');
        console.log('Status:', error.response?.status);
        console.log('Error:', JSON.stringify(error.response?.data, null, 2));
        console.log('Full error:', error.message);
    }
}

testSaveConfiguration().catch(console.error);