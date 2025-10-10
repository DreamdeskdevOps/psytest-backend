const { getMany } = require('./src/config/database');

async function checkTemplates() {
  try {
    const tests = await getMany('SELECT id, title, pdf_template_id FROM tests WHERE pdf_template_id IS NOT NULL');

    console.log('✅ Tests with PDF templates assigned:');
    if (tests.length === 0) {
      console.log('   ❌ No tests have PDF templates assigned!');
      console.log('   💡 Go to Admin → Test Settings → Select a test → Assign PDF Template');
    } else {
      tests.forEach(t => {
        console.log(`   - ${t.title}: template_id = ${t.pdf_template_id}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTemplates();
