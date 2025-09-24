const axios = require('axios');

// Create test scoring patterns for the Scoring section
const baseURL = 'http://localhost:3001/api/v1';

async function createTestPatterns() {
    console.log('🎯 Creating test scoring patterns for Scoring section...\n');

    try {
        // Pattern 1: Preset - Highest Only
        console.log('1️⃣ Creating "Preset: Highest Only" pattern');
        const highest = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Preset: Highest Only',
            description: 'Shows only the highest scoring flag - perfect for finding dominant traits',
            category: 'flag-based',
            type: 'preset-highest',
            configuration: {
                flagCount: 1,
                orderDirection: 'high-to-low'
            },
            isActive: true
        });
        console.log('✅ Created:', highest.data.data.name, '(ID:', highest.data.data.id, ')\n');

        // Pattern 2: Preset - Lowest Only
        console.log('2️⃣ Creating "Preset: Lowest Only" pattern');
        const lowest = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Preset: Lowest Only',
            description: 'Shows only the lowest scoring flag - useful for identifying improvement areas',
            category: 'flag-based',
            type: 'preset-lowest',
            configuration: {
                flagCount: 1,
                orderDirection: 'low-to-high'
            },
            isActive: true
        });
        console.log('✅ Created:', lowest.data.data.name, '(ID:', lowest.data.data.id, ')\n');

        // Pattern 3: Top 3 R>I>E Priority
        console.log('3️⃣ Creating "RIASEC Top 3 Priority" pattern');
        const top3rie = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'RIASEC Top 3 Priority',
            description: 'Top 3 flags with R>I>E priority ordering for career counseling',
            category: 'flag-based',
            type: 'preset-top-3-rie',
            configuration: {
                flagCount: 3,
                orderDirection: 'high-to-low',
                priorityRules: true,
                priorityOrder: ['R', 'I', 'E', 'A', 'S', 'C']
            },
            isActive: true
        });
        console.log('✅ Created:', top3rie.data.data.name, '(ID:', top3rie.data.data.id, ')\n');

        // Pattern 4: Top 5 Comprehensive
        console.log('4️⃣ Creating "Comprehensive Top 5" pattern');
        const top5 = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Comprehensive Top 5',
            description: 'Shows top 5 highest scoring flags for detailed analysis',
            category: 'flag-based',
            type: 'preset-top-5',
            configuration: {
                flagCount: 5,
                orderDirection: 'high-to-low'
            },
            isActive: true
        });
        console.log('✅ Created:', top5.data.data.name, '(ID:', top5.data.data.id, ')\n');

        // Pattern 5: Custom Flag Pattern
        console.log('5️⃣ Creating "Custom Flexible Pattern" pattern');
        const custom = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Custom Flexible Pattern',
            description: 'Fully customizable pattern with adjustable flag count and priority',
            category: 'flag-based',
            type: 'custom-flag-pattern',
            configuration: {
                flagCount: 4,
                orderDirection: 'high-to-low',
                priorityRules: true,
                priorityOrder: ['R', 'I', 'A', 'S', 'E', 'C'],
                customWeights: false,
                flagWeights: {}
            },
            isActive: true
        });
        console.log('✅ Created:', custom.data.data.name, '(ID:', custom.data.data.id, ')\n');

        // Pattern 6: Male Adult Range Pattern
        console.log('6️⃣ Creating "Male Adult Scoring Ranges" pattern');
        const maleRanges = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Male Adult Scoring Ranges',
            description: 'Score ranges optimized for male adult demographics',
            category: 'range-based',
            type: 'range-male-adult',
            configuration: {
                filter: 'male-adult',
                ranges: [
                    { min: 1, max: 25, label: 'Low Interest' },
                    { min: 26, max: 50, label: 'Moderate Interest' },
                    { min: 51, max: 75, label: 'High Interest' },
                    { min: 76, max: 100, label: 'Very High Interest' }
                ]
            },
            isActive: true
        });
        console.log('✅ Created:', maleRanges.data.data.name, '(ID:', maleRanges.data.data.id, ')\n');

        // Pattern 7: Female Adult Range Pattern
        console.log('7️⃣ Creating "Female Adult Scoring Ranges" pattern');
        const femaleRanges = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Female Adult Scoring Ranges',
            description: 'Score ranges optimized for female adult demographics',
            category: 'range-based',
            type: 'range-female-adult',
            configuration: {
                filter: 'female-adult',
                ranges: [
                    { min: 1, max: 20, label: 'Minimal' },
                    { min: 21, max: 40, label: 'Low' },
                    { min: 41, max: 60, label: 'Moderate' },
                    { min: 61, max: 80, label: 'High' },
                    { min: 81, max: 100, label: 'Exceptional' }
                ]
            },
            isActive: true
        });
        console.log('✅ Created:', femaleRanges.data.data.name, '(ID:', femaleRanges.data.data.id, ')\n');

        // Pattern 8: Custom Range Pattern
        console.log('8️⃣ Creating "Professional Assessment Ranges" pattern');
        const customRanges = await axios.post(`${baseURL}/admin/scoring-patterns`, {
            name: 'Professional Assessment Ranges',
            description: 'Custom professional assessment ranges for workplace evaluations',
            category: 'range-based',
            type: 'custom-range-pattern',
            configuration: {
                filter: 'custom',
                ranges: [
                    { min: 1, max: 15, label: 'Needs Development' },
                    { min: 16, max: 30, label: 'Basic' },
                    { min: 31, max: 50, label: 'Competent' },
                    { min: 51, max: 70, label: 'Proficient' },
                    { min: 71, max: 85, label: 'Advanced' },
                    { min: 86, max: 100, label: 'Expert' }
                ]
            },
            isActive: true
        });
        console.log('✅ Created:', customRanges.data.data.name, '(ID:', customRanges.data.data.id, ')\n');

        console.log('🎉 All test patterns created successfully!');
        console.log('✨ The Scoring section now has both Flag-Based and Range-Based patterns available.');
        console.log('');
        console.log('📊 Summary:');
        console.log('   • Flag-Based Patterns: 5 patterns (Highest, Lowest, Top 3 R>I>E, Top 5, Custom)');
        console.log('   • Range-Based Patterns: 3 patterns (Male Adult, Female Adult, Custom Professional)');
        console.log('');
        console.log('🎯 Ready for testing in the Scoring section!');

    } catch (error) {
        console.error('❌ Error creating test patterns:', error.response?.data || error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
    }
}

// Run the creation script
createTestPatterns().catch(console.error);