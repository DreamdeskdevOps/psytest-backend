const { sequelize } = require('./src/config/database');

async function addTestFlag() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Get the most recent question
    console.log('🔍 Finding most recent question...');
    const [questions] = await sequelize.query(`
      SELECT id, question_text, question_flag
      FROM questions
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (questions.length === 0) {
      console.log('❌ No questions found');
      return;
    }

    const question = questions[0];
    console.log('📝 Found question:', {
      id: question.id,
      text: question.question_text.substring(0, 50) + '...',
      current_flag: question.question_flag
    });

    // Update with a test flag
    const testFlag = 'TestFlag';
    console.log(`🏷️ Adding test flag: "${testFlag}"`);

    await sequelize.query(`
      UPDATE questions
      SET question_flag = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, {
      replacements: [testFlag, question.id]
    });

    console.log('✅ Flag updated successfully');

    // Verify the update
    console.log('🔍 Verifying update...');
    const [updatedQuestions] = await sequelize.query(`
      SELECT id, question_text, question_flag
      FROM questions
      WHERE id = ?
    `, {
      replacements: [question.id]
    });

    const updatedQuestion = updatedQuestions[0];
    console.log('📝 Updated question:', {
      id: updatedQuestion.id,
      text: updatedQuestion.question_text.substring(0, 50) + '...',
      new_flag: updatedQuestion.question_flag
    });

    console.log('🎉 Test flag added! Now refresh your Question Bank page to see it.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

addTestFlag();