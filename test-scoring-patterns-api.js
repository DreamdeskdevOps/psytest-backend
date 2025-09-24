const axios = require('axios');

// Test the scoring patterns API endpoints
const baseURL = 'http://localhost:3001/api/v1';

async function testScoringPatternsAPI() {
    console.log('🧪 Testing Scoring Patterns API...\n');

    try {
        // Test 1: Get all patterns
        console.log('1️⃣ Testing GET /admin/scoring-patterns');
        const getAllResponse = await axios.get(`${baseURL}/admin/scoring-patterns`);
        console.log('✅ GET all patterns success:', getAllResponse.data);
        console.log(`   Found ${getAllResponse.data.data.length} patterns\n`);

        // Test 2: Get patterns by category
        console.log('2️⃣ Testing GET /admin/scoring-patterns/category/flag-based');
        const getCategoryResponse = await axios.get(`${baseURL}/admin/scoring-patterns/category/flag-based`);
        console.log('✅ GET patterns by category success:', getCategoryResponse.data);
        console.log(`   Found ${getCategoryResponse.data.data.length} flag-based patterns\n`);

        // Test 3: Create a new pattern
        console.log('3️⃣ Testing POST /admin/scoring-patterns (Create new pattern)');
        const newPattern = {
            name: 'Test Pattern API',
            description: 'Test pattern created via API test',
            category: 'flag-based',
            type: 'custom-flag-pattern',
            configuration: {
                flagCount: 3,
                orderDirection: 'high-to-low',
                priorityRules: false
            },
            isActive: true
        };

        const createResponse = await axios.post(`${baseURL}/admin/scoring-patterns`, newPattern);
        console.log('✅ POST create pattern success:', createResponse.data);
        const createdPatternId = createResponse.data.data.id;
        console.log(`   Created pattern with ID: ${createdPatternId}\n`);

        // Test 4: Get single pattern
        console.log(`4️⃣ Testing GET /admin/scoring-patterns/${createdPatternId}`);
        const getOneResponse = await axios.get(`${baseURL}/admin/scoring-patterns/${createdPatternId}`);
        console.log('✅ GET single pattern success:', getOneResponse.data);
        console.log(`   Pattern name: ${getOneResponse.data.data.name}\n`);

        // Test 5: Update pattern
        console.log(`5️⃣ Testing PUT /admin/scoring-patterns/${createdPatternId}`);
        const updateData = {
            name: 'Test Pattern API (Updated)',
            description: 'Updated description via API test'
        };
        const updateResponse = await axios.put(`${baseURL}/admin/scoring-patterns/${createdPatternId}`, updateData);
        console.log('✅ PUT update pattern success:', updateResponse.data);
        console.log(`   Updated name: ${updateResponse.data.data.name}\n`);

        // Test 6: Duplicate pattern
        console.log(`6️⃣ Testing POST /admin/scoring-patterns/${createdPatternId}/duplicate`);
        const duplicateResponse = await axios.post(`${baseURL}/admin/scoring-patterns/${createdPatternId}/duplicate`, {
            name: 'Test Pattern API (Duplicate)'
        });
        console.log('✅ POST duplicate pattern success:', duplicateResponse.data);
        const duplicatedPatternId = duplicateResponse.data.data.id;
        console.log(`   Duplicated pattern ID: ${duplicatedPatternId}\n`);

        // Test 7: Toggle active status
        console.log(`7️⃣ Testing PATCH /admin/scoring-patterns/${createdPatternId}/toggle-status`);
        const toggleResponse = await axios.patch(`${baseURL}/admin/scoring-patterns/${createdPatternId}/toggle-status`);
        console.log('✅ PATCH toggle status success:', toggleResponse.data);
        console.log(`   New active status: ${toggleResponse.data.data.is_active}\n`);

        // Test 8: Get usage statistics
        console.log('8️⃣ Testing GET /admin/scoring-patterns/usage-statistics');
        const statsResponse = await axios.get(`${baseURL}/admin/scoring-patterns/usage-statistics`);
        console.log('✅ GET usage statistics success:', statsResponse.data);
        console.log(`   Statistics for ${statsResponse.data.data.length} patterns\n`);

        // Test 9: Validate configuration
        console.log('9️⃣ Testing POST /admin/scoring-patterns/validate');
        const validateResponse = await axios.post(`${baseURL}/admin/scoring-patterns/validate`, {
            type: 'custom-flag-pattern',
            configuration: {
                flagCount: 5,
                orderDirection: 'high-to-low'
            }
        });
        console.log('✅ POST validate configuration success:', validateResponse.data);
        console.log(`   Configuration valid: ${validateResponse.data.data.isValid}\n`);

        // Cleanup: Delete test patterns
        console.log(`🧹 Cleanup: Deleting test patterns`);
        try {
            await axios.delete(`${baseURL}/admin/scoring-patterns/${createdPatternId}`);
            console.log('✅ Deleted original test pattern');
        } catch (error) {
            console.log('⚠️ Could not delete original test pattern:', error.response?.data?.message || error.message);
        }

        try {
            await axios.delete(`${baseURL}/admin/scoring-patterns/${duplicatedPatternId}`);
            console.log('✅ Deleted duplicated test pattern');
        } catch (error) {
            console.log('⚠️ Could not delete duplicated test pattern:', error.response?.data?.message || error.message);
        }

        console.log('\n🎉 All API tests completed successfully!');
        console.log('✨ Scoring Patterns API is fully functional!');

    } catch (error) {
        console.error('❌ API Test failed:', error.response?.data || error.message);
        console.error('Full error:', error.response?.data || error);
    }
}

// Run the tests
testScoringPatternsAPI().catch(console.error);