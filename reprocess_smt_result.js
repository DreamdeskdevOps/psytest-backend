const db = require('./src/config/database');

async function reprocessSMTResult() {
  try {
    console.log('\n🔄 Reprocessing SMT Test Result...\n');

    // Get the completed SMT attempt
    const attempts = await db.getMany(`
      SELECT ta.*, t.title
      FROM test_attempts ta
      JOIN tests t ON ta.test_id = t.id
      WHERE t.title ILIKE '%SMT%' AND ta.status = 'completed'
      ORDER BY ta.completed_at DESC
      LIMIT 1
    `);

    if (attempts.length === 0) {
      console.log('❌ No completed SMT attempts found');
      process.exit(1);
    }

    const attempt = attempts[0];
    console.log('📊 Found attempt:', attempt.id);
    console.log('   Total Score:', attempt.total_score);

    const sectionScores = attempt.section_scores || {};
    const questionCount = sectionScores.questionCount || 50;
    const averageScore = attempt.total_score / questionCount;

    console.log('   Average Score:', averageScore.toFixed(2));

    // Find matching range
    const ranges = await db.getMany(`
      SELECT * FROM test_results
      WHERE test_id = $1 AND result_type = 'range_based' AND is_active = true
      ORDER BY score_range
    `, [attempt.test_id]);

    console.log('\n🔍 Matching against updated ranges:');

    let matched = null;
    for (const range of ranges) {
      const [min, max] = range.score_range.split('-').map(n => parseFloat(n));
      console.log(`   ${range.result_code} (${min}-${max}): ${averageScore.toFixed(2)}...`, averageScore >= min && averageScore <= max ? '✅ MATCH' : '❌');

      if (averageScore >= min && averageScore <= max) {
        matched = range;
        break;
      }
    }

    if (!matched) {
      console.log('\n❌ Still no match found!');
      process.exit(1);
    }

    console.log('\n✅ Found matching result:', matched.result_code);

    // Update the section_scores with the correct result
    sectionScores.testResult = {
      result_code: matched.result_code,
      title: matched.title,
      description: matched.description,
      pdf_file: matched.pdf_file
    };
    sectionScores.resultTitle = matched.title;
    sectionScores.resultDescription = matched.description;
    sectionScores.resultCode = matched.result_code;

    // Update the test attempt
    await db.getOne(`
      UPDATE test_attempts
      SET section_scores = $1
      WHERE id = $2
    `, [sectionScores, attempt.id]);

    console.log('\n🎉 Updated test attempt with correct result!');
    console.log('   Result Title:', matched.title);
    console.log('   Result Code:', matched.result_code);

    console.log('\n✅ SMT test result fixed! Check the Results page now.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

reprocessSMTResult();
