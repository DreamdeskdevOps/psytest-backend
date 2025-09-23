const { sequelize } = require('./src/config/database');

async function checkFlags() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('🔍 Checking question flags in database...');
    const [questions] = await sequelize.query(`
      SELECT id, question_text, question_flag, created_at
      FROM questions
      WHERE question_flag IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log(`\n📋 Found ${questions.length} questions with flags:`);
    questions.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}, Flag: "${q.question_flag}", Text: "${q.question_text.substring(0, 50)}..."`);
    });

    console.log('\n🔍 Checking all recent questions (with and without flags)...');
    const [allRecent] = await sequelize.query(`
      SELECT id, question_text, question_flag, created_at
      FROM questions
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\n📋 Recent 5 questions:`);
    allRecent.forEach((q, index) => {
      console.log(`${index + 1}. ID: ${q.id}, Flag: "${q.question_flag}", Text: "${q.question_text.substring(0, 50)}..."`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Database connection closed');
  }
}

checkFlags();