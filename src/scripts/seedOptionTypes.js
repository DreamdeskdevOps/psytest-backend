const { getMany, executeQuery, insertOne } = require('../config/database');

// System option types with proper values
const systemOptionTypes = [
  {
    name: 'YES_NO',
    description: 'Binary yes or no questions',
    pattern_type: 'YES_NO',
    options: [
      { id: 'opt_yes', text: 'Yes', value: 1, isCorrect: false },
      { id: 'opt_no', text: 'No', value: 0, isCorrect: false }
    ],
    is_system_pattern: true
  },
  {
    name: 'MULTIPLE_CHOICE',
    description: 'Single correct answer from multiple options',
    pattern_type: 'MULTIPLE_CHOICE',
    options: [
      { id: 'opt_a', text: 'Option A', value: 1, isCorrect: false },
      { id: 'opt_b', text: 'Option B', value: 2, isCorrect: false },
      { id: 'opt_c', text: 'Option C', value: 3, isCorrect: false },
      { id: 'opt_d', text: 'Option D', value: 4, isCorrect: false }
    ],
    is_system_pattern: true
  },
  {
    name: 'LIKERT_SCALE',
    description: 'Rating scale for agreement or frequency',
    pattern_type: 'LIKERT_SCALE',
    options: [
      { id: 'opt_sd', text: 'Strongly Disagree', value: 1, isCorrect: false },
      { id: 'opt_d', text: 'Disagree', value: 2, isCorrect: false },
      { id: 'opt_n', text: 'Neutral', value: 3, isCorrect: false },
      { id: 'opt_a', text: 'Agree', value: 4, isCorrect: false },
      { id: 'opt_sa', text: 'Strongly Agree', value: 5, isCorrect: false }
    ],
    is_system_pattern: true
  },
  {
    name: 'TRUE_FALSE',
    description: 'Binary true or false questions',
    pattern_type: 'TRUE_FALSE',
    options: [
      { id: 'opt_true', text: 'True', value: 1, isCorrect: false },
      { id: 'opt_false', text: 'False', value: 0, isCorrect: false }
    ],
    is_system_pattern: true
  },
  {
    name: 'RATING_SCALE',
    description: 'Numeric rating scale',
    pattern_type: 'RATING_SCALE',
    options: [
      { id: 'opt_1', text: '1', value: 1, isCorrect: false },
      { id: 'opt_2', text: '2', value: 2, isCorrect: false },
      { id: 'opt_3', text: '3', value: 3, isCorrect: false },
      { id: 'opt_4', text: '4', value: 4, isCorrect: false },
      { id: 'opt_5', text: '5', value: 5, isCorrect: false }
    ],
    is_system_pattern: true
  },
  {
    name: 'FREQUENCY_SCALE',
    description: 'How often something occurs',
    pattern_type: 'FREQUENCY_SCALE',
    options: [
      { id: 'opt_never', text: 'Never', value: 1, isCorrect: false },
      { id: 'opt_rarely', text: 'Rarely', value: 2, isCorrect: false },
      { id: 'opt_sometimes', text: 'Sometimes', value: 3, isCorrect: false },
      { id: 'opt_often', text: 'Often', value: 4, isCorrect: false },
      { id: 'opt_always', text: 'Always', value: 5, isCorrect: false }
    ],
    is_system_pattern: true
  }
];

async function seedOptionTypes() {
  try {
    console.log('🌱 Starting option types seeding...');

    // First, delete all old option types (both system and custom)
    console.log('🗑️  Deleting old option types...');
    await executeQuery('DELETE FROM answer_patterns');
    console.log('✅ Old option types deleted');

    // Insert system option types
    console.log('📝 Inserting system option types...');

    for (const optionType of systemOptionTypes) {
      await insertOne(`
        INSERT INTO answer_patterns (
          name,
          description,
          pattern_type,
          options,
          is_system_pattern,
          is_active,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        optionType.name,
        optionType.description,
        optionType.pattern_type,
        JSON.stringify(optionType.options),
        optionType.is_system_pattern,
        true,
        '227fd748-ae43-477e-b4c5-1f4253aba945' // Default admin ID
      ]);

      console.log(`✅ Inserted: ${optionType.name}`);
    }

    // Verify insertion
    const count = await getMany('SELECT COUNT(*) as count FROM answer_patterns');
    console.log(`\n✅ Seeding complete! Total option types: ${count[0].count}`);

    // Display all option types
    const allTypes = await getMany('SELECT name, description, options FROM answer_patterns ORDER BY name');
    console.log('\n📋 All option types in database:');
    allTypes.forEach(type => {
      console.log(`\n  ${type.name}:`);
      console.log(`    Description: ${type.description}`);
      console.log(`    Options: ${JSON.stringify(type.options)}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seedOptionTypes();
