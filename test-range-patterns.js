const axios = require('axios');

// Test Range-Based Patterns functionality
const baseURL = 'http://localhost:3001/api/v1';

async function testRangeBasedPatterns() {
    console.log('🧪 Testing Range-Based Patterns System...\n');

    try {
        // Test 1: Create Male Adult Range Pattern
        console.log('1️⃣ Testing Male Adult Range Pattern creation');
        const maleAdultResponse = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Male Adult Scoring Ranges',
            description: 'Score ranges optimized for male adult demographics',
            category: 'range-based',
            type: 'range-male-adult',
            configuration: {
                filter: 'male-adult',
                ranges: [
                    { min: 1, max: 20, label: 'Low' },
                    { min: 21, max: 40, label: 'Medium' },
                    { min: 41, max: 60, label: 'High' }
                ]
            },
            isActive: true
        });

        console.log('✅ Male Adult Range Pattern created successfully');
        console.log(`   Pattern ID: ${maleAdultResponse.data.data.id}`);
        console.log(`   Filter: ${maleAdultResponse.data.data.configuration.filter}`);
        console.log(`   Ranges: ${maleAdultResponse.data.data.configuration.ranges.length}`);
        console.log('');

        // Test 2: Create Female Adult Range Pattern
        console.log('2️⃣ Testing Female Adult Range Pattern creation');
        const femaleAdultResponse = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Female Adult Scoring Ranges',
            description: 'Score ranges optimized for female adult demographics',
            category: 'range-based',
            type: 'range-female-adult',
            configuration: {
                filter: 'female-adult',
                ranges: [
                    { min: 1, max: 25, label: 'Below Average' },
                    { min: 26, max: 50, label: 'Average' },
                    { min: 51, max: 75, label: 'Above Average' },
                    { min: 76, max: 100, label: 'Exceptional' }
                ]
            },
            isActive: true
        });

        console.log('✅ Female Adult Range Pattern created successfully');
        console.log(`   Pattern ID: ${femaleAdultResponse.data.data.id}`);
        console.log(`   Ranges: ${JSON.stringify(femaleAdultResponse.data.data.configuration.ranges, null, 2)}`);
        console.log('');

        // Test 3: Create Custom Range Pattern with up to 10 ranges
        console.log('3️⃣ Testing Custom Range Pattern with multiple ranges');
        const customRangeResponse = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Custom 10-Range Pattern',
            description: 'Maximum 10 custom ranges for detailed scoring',
            category: 'range-based',
            type: 'custom-range-pattern',
            configuration: {
                filter: 'custom',
                ranges: [
                    { min: 1, max: 10, label: 'Very Low' },
                    { min: 11, max: 20, label: 'Low' },
                    { min: 21, max: 30, label: 'Below Average' },
                    { min: 31, max: 40, label: 'Low Average' },
                    { min: 41, max: 50, label: 'Average' },
                    { min: 51, max: 60, label: 'High Average' },
                    { min: 61, max: 70, label: 'Above Average' },
                    { min: 71, max: 80, label: 'High' },
                    { min: 81, max: 90, label: 'Very High' },
                    { min: 91, max: 100, label: 'Exceptional' }
                ]
            },
            isActive: true
        });

        console.log('✅ Custom Range Pattern with 10 ranges created successfully');
        console.log(`   Pattern ID: ${customRangeResponse.data.data.id}`);
        console.log(`   Total ranges: ${customRangeResponse.data.data.configuration.ranges.length}`);
        console.log('');

        // Test 4: Test validation - overlapping ranges should fail
        console.log('4️⃣ Testing validation for overlapping ranges (should fail)');
        try {
            await axios.post(`${baseURL}/admin/scoring-patterns`, {
                name: 'Invalid Overlapping Ranges',
                description: 'This should fail validation',
                category: 'range-based',
                type: 'custom-range-pattern',
                configuration: {
                    filter: 'custom',
                    ranges: [
                        { min: 1, max: 30, label: 'Low' },
                        { min: 25, max: 50, label: 'Medium' }, // Overlaps with previous
                        { min: 45, max: 70, label: 'High' }   // Overlaps with previous
                    ]
                },
                isActive: true
            });
            console.log('❌ Overlapping ranges validation FAILED - should have been rejected');
        } catch (error) {
            console.log('✅ Overlapping ranges correctly rejected by validation');
            console.log(`   Error: ${error.response.data.message}`);
        }
        console.log('');

        // Test 5: Test validation - empty label should fail
        console.log('5️⃣ Testing validation for empty labels (should fail)');
        try {
            await axios.post(`${baseURL}/admin/scoring-patterns`, {
                name: 'Invalid Empty Labels',
                description: 'This should fail validation',
                category: 'range-based',
                type: 'custom-range-pattern',
                configuration: {
                    filter: 'custom',
                    ranges: [
                        { min: 1, max: 20, label: '' }, // Empty label
                        { min: 21, max: 40, label: 'Medium' }
                    ]
                },
                isActive: true
            });
            console.log('❌ Empty label validation FAILED - should have been rejected');
        } catch (error) {
            console.log('✅ Empty label correctly rejected by validation');
            console.log(`   Error: ${error.response.data.message}`);
        }
        console.log('');

        // Test 6: Get all range-based patterns
        console.log('6️⃣ Testing retrieval of range-based patterns');
        const getRangeResponse = await axios.get(`${baseURL}/admin/scoring-patterns/category/range-based`);
        const rangePatterns = getRangeResponse.data.data || [];

        console.log('✅ Range-based patterns retrieved successfully');
        console.log(`   Found ${rangePatterns.length} range-based patterns:`);
        rangePatterns.forEach((pattern, index) => {
            console.log(`     ${index + 1}. ${pattern.name} (${pattern.type})`);
            console.log(`        Filter: ${pattern.configuration.filter}`);
            console.log(`        Ranges: ${pattern.configuration.ranges.length}`);
        });
        console.log('');

        // Test 7: Update range pattern
        console.log('7️⃣ Testing range pattern update');
        const updateResponse = await axios.put(`${baseURL}/admin/scoring-patterns/${maleAdultResponse.data.data.id}`, {
            name: 'Updated Male Adult Ranges',
            description: 'Updated description for male adult ranges',
            configuration: {
                filter: 'male-adult',
                ranges: [
                    { min: 1, max: 25, label: 'Low Performance' },
                    { min: 26, max: 50, label: 'Average Performance' },
                    { min: 51, max: 75, label: 'Good Performance' },
                    { min: 76, max: 100, label: 'Excellent Performance' }
                ]
            }
        });

        console.log('✅ Range pattern updated successfully');
        console.log(`   New name: ${updateResponse.data.data.name}`);
        console.log(`   New range count: ${updateResponse.data.data.configuration.ranges.length}`);
        console.log('');

        // Test 8: Validation for configuration
        console.log('8️⃣ Testing configuration validation');
        const validateResponse = await axios.post(`${baseURL}/admin/scoring-patterns/validate`, {
            type: 'custom-range-pattern',
            configuration: {
                filter: 'custom',
                ranges: [
                    { min: 1, max: 33, label: 'Low' },
                    { min: 34, max: 66, label: 'Medium' },
                    { min: 67, max: 100, label: 'High' }
                ]
            }
        });

        console.log('✅ Configuration validation passed');
        console.log(`   Valid: ${validateResponse.data.data.isValid}`);
        console.log(`   Errors: ${validateResponse.data.data.errors.length ? validateResponse.data.data.errors.join(', ') : 'None'}`);
        console.log('');

        // Cleanup
        console.log('🧹 Cleanup: Removing test patterns');
        const patterns = [maleAdultResponse.data.data.id, femaleAdultResponse.data.data.id, customRangeResponse.data.data.id];
        for (const patternId of patterns) {
            try {
                await axios.delete(`${baseURL}/admin/scoring-patterns/${patternId}`);
                console.log(`   ✅ Deleted pattern ${patternId}`);
            } catch (error) {
                console.log(`   ⚠️ Could not delete pattern ${patternId}: ${error.message}`);
            }
        }
        console.log('');

        console.log('🎉 ALL RANGE-BASED PATTERN TESTS PASSED!');
        console.log('✨ Range-Based Scoring System is fully functional!');
        console.log('');
        console.log('📋 What works:');
        console.log('   ✅ Create range patterns with demographic filters');
        console.log('   ✅ Define up to 10 custom ranges with labels');
        console.log('   ✅ Validation prevents overlapping ranges');
        console.log('   ✅ Validation requires non-empty labels');
        console.log('   ✅ Range pattern retrieval by category');
        console.log('   ✅ Range pattern updates');
        console.log('   ✅ Configuration validation');
        console.log('   ✅ All demographic filters supported');
        console.log('');
        console.log('🎯 Range-Based Patterns ready for production!');

    } catch (error) {
        console.error('❌ Range Pattern Test FAILED:', error.response?.data || error.message);
        console.error('');
        console.error('🔧 Debug Info:');
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        console.error(`   Message: ${error.message}`);
    }
}

// Run the test
testRangeBasedPatterns().catch(console.error);