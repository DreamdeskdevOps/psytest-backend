const {getOne} = require('./src/config/database');

(async () => {
  // Check MBTI test
  const test = await getOne(
    "SELECT id, title, pdf_template_id FROM tests WHERE title LIKE $1",
    ['%MBTI%']
  );

  console.log('========================================');
  console.log('MBTI Test Check:');
  console.log('Test ID:', test.id);
  console.log('Test Title:', test.title);
  console.log('PDF Template ID:', test.pdf_template_id || 'NOT ASSIGNED');
  console.log('========================================\n');

  if (test.pdf_template_id) {
    // Check if template exists
    const template = await getOne(
      'SELECT template_id, template_name, is_active, template_config, pdf_file_path FROM pdf_templates WHERE template_id = $1',
      [test.pdf_template_id]
    );

    if (template) {
      console.log('Template Found:');
      console.log('  Name:', template.template_name);
      console.log('  Active:', template.is_active);
      console.log('  PDF File:', template.pdf_file_path);

      const config = typeof template.template_config === 'string'
        ? JSON.parse(template.template_config)
        : template.template_config;

      console.log('  Fields configured:', config.fields?.length || 0);
      if (config.fields) {
        config.fields.forEach(f => {
          console.log(`    - ${f.name} (page ${f.page}, pos: ${f.x},${f.y})`);
        });
      }
    } else {
      console.log('❌ Template ID assigned but template NOT FOUND in database!');
    }
  } else {
    console.log('ℹ️ No PDF template assigned to MBTI test');
  }

  process.exit(0);
})();
