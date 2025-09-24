const axios = require('axios');

// Simple test to verify the API works for frontend integration
const baseURL = 'http://localhost:3001/api/v1';

async function testFrontendIntegration() {
    console.log('🧪 Testing Frontend Integration with Scoring Patterns API...\n');

    try {
        // Test 1: Get all patterns (this is what the frontend will call on page load)
        console.log('1️⃣ Testing Frontend Pattern Loading (GET /admin/scoring-patterns)');
        const getAllResponse = await axios.get(`${baseURL}/admin/scoring-patterns`);

        const patterns = getAllResponse.data.data || getAllResponse.data || [];
        console.log('✅ Successfully loaded patterns for frontend');
        console.log(`   Found ${patterns.length} patterns in database`);

        patterns.forEach((pattern, index) => {
            console.log(`   ${index + 1}. ${pattern.name} (${pattern.type}) - ${pattern.is_active ? 'Active' : 'Inactive'}`);
        });
        console.log('');

        // Test 2: Get patterns by category (flag-based)
        console.log('2️⃣ Testing Category Filter (GET /admin/scoring-patterns/category/flag-based)');
        const getCategoryResponse = await axios.get(`${baseURL}/admin/scoring-patterns/category/flag-based`);
        const flagBasedPatterns = getCategoryResponse.data.data || getCategoryResponse.data || [];

        console.log('✅ Successfully filtered flag-based patterns');
        console.log(`   Found ${flagBasedPatterns.length} flag-based patterns`);
        console.log('');

        // Test 3: Create a unique test pattern
        const uniqueName = `Frontend Test Pattern ${Date.now()}`;
        console.log(`3️⃣ Testing Pattern Creation (POST /admin/scoring-patterns)`);
        console.log(`   Creating pattern: "${uniqueName}"`);

        const createResponse = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: uniqueName,
            description: 'Test pattern for frontend integration',
            category: 'flag-based',
            type: 'custom-flag-pattern',
            configuration: {
                flagCount: 3,
                orderDirection: 'high-to-low',
                priorityRules: false
            },
            isActive: true
        });

        const newPattern = createResponse.data.data;
        console.log('✅ Successfully created new pattern');
        console.log(`   Pattern ID: ${newPattern.id}`);
        console.log(`   Pattern Name: ${newPattern.name}`);
        console.log(`   Configuration: ${JSON.stringify(newPattern.configuration, null, 2)}`);
        console.log('');

        // Test 4: Update the pattern
        console.log(`4️⃣ Testing Pattern Update (PUT /admin/scoring-patterns/${newPattern.id})`);
        const updateResponse = await axios.put(`${baseURL}/admin/scoring-patterns/${newPattern.id}`, {
            name: uniqueName + ' (Updated)',
            description: 'Updated test pattern for frontend integration'
        });

        console.log('✅ Successfully updated pattern');
        console.log(`   New name: ${updateResponse.data.data.name}`);
        console.log('');

        // Test 5: Get single pattern
        console.log(`5️⃣ Testing Single Pattern Retrieval (GET /admin/scoring-patterns/${newPattern.id})`);
        const getSingleResponse = await axios.get(`${baseURL}/admin/scoring-patterns/${newPattern.id}`);
        const retrievedPattern = getSingleResponse.data.data;

        console.log('✅ Successfully retrieved single pattern');
        console.log(`   Pattern: ${retrievedPattern.name}`);
        console.log(`   Active: ${retrievedPattern.is_active}`);
        console.log('');

        // Test 6: Toggle active status
        console.log(`6️⃣ Testing Toggle Active Status (PATCH /admin/scoring-patterns/${newPattern.id}/toggle-status)`);
        const toggleResponse = await axios.patch(`${baseURL}/admin/scoring-patterns/${newPattern.id}/toggle-status`);

        console.log('✅ Successfully toggled pattern status');
        console.log(`   New status: ${toggleResponse.data.data.is_active ? 'Active' : 'Inactive'}`);
        console.log('');

        // Cleanup: Delete the test pattern
        console.log(`🧹 Cleanup: Deleting test pattern`);
        await axios.delete(`${baseURL}/admin/scoring-patterns/${newPattern.id}`);
        console.log('✅ Test pattern cleaned up successfully');
        console.log('');

        // Final verification: Make sure we're back to original state
        console.log('7️⃣ Final Verification: Checking pattern count');
        const finalCheckResponse = await axios.get(`${baseURL}/admin/scoring-patterns`);
        const finalPatterns = finalCheckResponse.data.data || finalCheckResponse.data || [];

        console.log('✅ Final verification complete');
        console.log(`   Final pattern count: ${finalPatterns.length}`);
        console.log('');

        console.log('🎉 Frontend Integration Test PASSED!');
        console.log('✨ The Scoring Patterns Management system is ready for frontend use!');
        console.log('');
        console.log('📋 API Endpoints Working:');
        console.log('   ✅ GET /admin/scoring-patterns (Load all patterns)');
        console.log('   ✅ GET /admin/scoring-patterns/category/:category (Filter by category)');
        console.log('   ✅ GET /admin/scoring-patterns/:id (Get single pattern)');
        console.log('   ✅ POST /admin/scoring-patterns (Create new pattern)');
        console.log('   ✅ PUT /admin/scoring-patterns/:id (Update pattern)');
        console.log('   ✅ PATCH /admin/scoring-patterns/:id/toggle-status (Toggle status)');
        console.log('   ✅ DELETE /admin/scoring-patterns/:id (Delete pattern)');
        console.log('');
        console.log('🎯 Ready for frontend integration!');

    } catch (error) {
        console.error('❌ Frontend Integration Test FAILED:', error.response?.data || error.message);
        console.error('');
        console.error('🔧 Debug Info:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
            console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        console.error(`   Message: ${error.message}`);
    }
}

// Run the test
testFrontendIntegration().catch(console.error);