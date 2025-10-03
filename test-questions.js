// Quick test script to check if questions exist in database
const { getOne, getMany } = require('./src/config/database');

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...');

    // Check tests
    const tests = await getMany('SELECT id, title, is_active FROM tests LIMIT 5', []);
    console.log('📋 Available tests:', tests.length);
    if (tests.length > 0) {
      console.log('First test:', tests[0]);
    }

    // Check sections
    const sections = await getMany('SELECT id, test_id, section_name FROM test_sections LIMIT 5', []);
    console.log('📚 Available sections:', sections.length);
    if (sections.length > 0) {
      console.log('First section:', sections[0]);
    }

    // Check questions
    const questions = await getMany('SELECT id, section_id, question_text FROM questions LIMIT 5', []);
    console.log('❓ Available questions:', questions.length);
    if (questions.length > 0) {
      console.log('First question:', questions[0]);
    }

    // Test specific section questions
    if (sections.length > 0) {
      const sectionQuestions = await getMany('SELECT id, question_text FROM questions WHERE section_id = $1 LIMIT 3', [sections[0].id]);
      console.log(`📝 Questions in section ${sections[0].section_name}:`, sectionQuestions.length);
      sectionQuestions.forEach((q, i) => {
        console.log(`  ${i+1}. ${q.question_text?.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('❌ Database test error:', error.message);
  }

  process.exit(0);
}

testDatabase();