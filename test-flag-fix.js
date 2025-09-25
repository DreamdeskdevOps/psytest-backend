require('dotenv').config();
const { sequelize } = require('./src/config/database');
const QuestionModel = require('./src/models/Questions');

async function testFlagUpdate() {
  console.log('🧪 Testing Question Flag Update Fix');
  console.log('====================================');

  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Step 1: Get a question to test with
    console.log('1️⃣ Finding a test question...');
    const [result] = await sequelize.query('SELECT id, question_text, question_flag FROM questions WHERE is_active = true LIMIT 1');

    if (result.length === 0) {
      console.log('❌ No active questions found for testing');
      return;
    }

    const testQuestion = result[0];
    console.log(`   Question ID: ${testQuestion.id}`);
    console.log(`   Current flag: "${testQuestion.question_flag || 'null'}"`);

    // Step 2: Test our updated updateQuestion function
    console.log('\n2️⃣ Testing updated updateQuestion function...');
    const newFlag = 'TEST_FLAG_' + Date.now();

    const updateData = {
      questionFlag: newFlag
    };

    console.log(`   Attempting to update flag to: "${newFlag}"`);

    const updateResult = await QuestionModel.updateQuestion(testQuestion.id, updateData, 'test-admin-id');

    if (updateResult) {
      console.log('   ✅ Update function executed successfully');
      console.log(`   Updated question flag: "${updateResult.question_flag}"`);

      if (updateResult.question_flag === newFlag) {
        console.log('   ✅ Flag update verification PASSED!');
      } else {
        console.log('   ❌ Flag update verification FAILED');
        console.log(`   Expected: "${newFlag}"`);
        console.log(`   Got: "${updateResult.question_flag}"`);
      }
    } else {
      console.log('   ❌ Update function returned null');
    }

    // Step 3: Verify in database
    console.log('\n3️⃣ Verifying directly in database...');
    const [verifyResult] = await sequelize.query('SELECT question_flag FROM questions WHERE id = ?', {
      replacements: [testQuestion.id]
    });

    if (verifyResult.length > 0) {
      const dbFlag = verifyResult[0].question_flag;
      console.log(`   Database flag: "${dbFlag}"`);

      if (dbFlag === newFlag) {
        console.log('   ✅ Database verification PASSED!');
        console.log('\n🎉 OVERALL RESULT: Flag update fix is working correctly!');
      } else {
        console.log('   ❌ Database verification FAILED');
        console.log('\n❌ OVERALL RESULT: Flag update fix is NOT working');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await sequelize.close();
  }
}

testFlagUpdate();