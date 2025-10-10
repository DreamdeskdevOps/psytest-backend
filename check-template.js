const { getOne } = require('./src/config/database');

(async () => {
  const template = await getOne(`
    SELECT template_id, template_name, template_config, pdf_file_path
    FROM pdf_templates
    WHERE template_id = $1
  `, ['58e7f2b3-9f68-41b9-bd84-428e8b36b1a9']);

  if (!template) {
    console.log('❌ Template not found!');
    process.exit(1);
  }

  console.log('Template Name:', template.template_name);
  console.log('PDF File:', template.pdf_file_path);

  const config = typeof template.template_config === 'string'
    ? JSON.parse(template.template_config)
    : template.template_config;

  console.log('Fields configured:', config.fields?.length || 0);
  if (config.fields) {
    config.fields.forEach(f => {
      console.log(`  - ${f.name} (page ${f.page})`);
    });
  } else {
    console.log('❌ NO FIELDS CONFIGURED!');
  }

  process.exit(0);
})();
