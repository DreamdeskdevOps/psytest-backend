const { sequelize } = require('./src/config/database');

async function testFlagTypes() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('\n🧪 Testing different flag data types...');

    // Test with exact SQL to see data types
    const [results] = await sequelize.query(`
      SELECT
        id,
        question_text,
        question_flag,
        CASE
          WHEN question_flag IS NULL THEN 'IS_NULL'
          WHEN question_flag = '' THEN 'EMPTY_STRING'
          WHEN question_flag = 'null' THEN 'STRING_NULL'
          ELSE 'HAS_VALUE'
        END as flag_type,
        LENGTH(question_flag) as flag_length,
        created_at
      FROM questions
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📋 Recent questions analysis:`);
    results.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id.substring(0, 8)}...`);
      console.log(`   Text: "${q.question_text.substring(0, 40)}..."`);
      console.log(`   Flag: "${q.question_flag}"`);
      console.log(`   Type: ${q.flag_type}`);
      console.log(`   Length: ${q.flag_length}`);
      console.log(`   Created: ${q.created_at}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

testFlagTypes();