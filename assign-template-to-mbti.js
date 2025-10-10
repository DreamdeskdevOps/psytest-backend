const { getOne, getMany, executeQuery } = require('./src/config/database');

async function assignTemplate() {
  try {
    // Get MBTI test
    const mbtiTest = await getOne("SELECT id, title FROM tests WHERE title LIKE '%MBTI%' OR title LIKE '%Myers%' OR title LIKE '%Briggs%'");

    if (!mbtiTest) {
      console.log('❌ MBTI test not found!');
      process.exit(1);
    }

    console.log(`\n✅ Found test: ${mbtiTest.title}`);
    console.log(`   Test ID: ${mbtiTest.id}`);

    // Get active PDF template
    const template = await getOne('SELECT template_id, template_name FROM pdf_templates WHERE is_active = true LIMIT 1');

    if (!template) {
      console.log('\n❌ No active PDF templates found!');
      console.log('Please create a PDF template first in Admin → PDF Templates');
      process.exit(1);
    }

    console.log(`\n✅ Found template: ${template.template_name}`);
    console.log(`   Template ID: ${template.template_id}`);

    // Assign template to test
    await executeQuery(
      'UPDATE tests SET pdf_template_id = $1, updated_at = NOW() WHERE id = $2',
      [template.template_id, mbtiTest.id]
    );

    console.log(`\n🎉 SUCCESS! Assigned template "${template.template_name}" to test "${mbtiTest.title}"`);
    console.log('\n✅ Now when a student completes this test, they will get a personalized PDF!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

assignTemplate();
