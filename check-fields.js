const {getOne} = require('./src/config/database');

(async () => {
  const template = await getOne(
    'SELECT template_config FROM pdf_templates WHERE template_id = $1',
    ['58e7f2b3-9f68-41b9-bd84-428e8b36b1a9']
  );

  const config = JSON.parse(template.template_config);
  console.log(JSON.stringify(config.fields, null, 2));

  process.exit(0);
})();
