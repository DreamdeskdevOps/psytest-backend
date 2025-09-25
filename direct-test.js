const ScoringConfiguration = require('./src/models/ScoringConfiguration');

async function testDirectly() {
    console.log('🧪 Testing ScoringConfiguration directly...\n');

    const testId = 'dcf9590c-997d-42d2-a920-3d97daaabb9c';
    const sectionId = '0fc1dd29-4926-43ca-be09-dc49a199b74f';

    try {
        // Test saving directly
        console.log('💾 Testing save configuration directly...');

        const configData = {
            testId: testId,
            sectionId: sectionId,
            scoringType: 'flag_based',
            scoringPattern: {
                type: 'preset-highest',
                flagCount: 1,
                orderDirection: 'high-to-low'
            },
            createdBy: 'ab1b605a-7f4b-42da-995f-77737b6293c3'
        };

        console.log('📋 Configuration data:', JSON.stringify(configData, null, 2));

        const result = await ScoringConfiguration.saveConfiguration(configData);
        console.log('✅ Configuration saved successfully');
        console.log('📊 Result:', JSON.stringify(result, null, 2));

        // Now try to retrieve it
        console.log('\n🔍 Retrieving saved configuration...');
        const retrieved = await ScoringConfiguration.getConfiguration(testId, sectionId);
        console.log('✅ Configuration retrieved successfully');
        console.log('📊 Retrieved:', JSON.stringify(retrieved, null, 2));

    } catch (error) {
        console.log('❌ Test failed');
        console.log('Error:', error.message);
        console.log('Full error:', error);
    }
}

testDirectly().catch(console.error);