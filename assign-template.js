const {getOne, executeQuery} = require('./src/config/database');

(async () => {
  const templateId = '58e7f2b3-9f68-41b9-bd84-428e8b36b1a9';
  const testId = '53f959d3-8d2d-4e82-a0aa-dab683be6abe';

  console.log('Assigning template to MBTI test...');

  const result = await getOne(
    'UPDATE tests SET pdf_template_id = $1 WHERE id = $2 RETURNING id, title, pdf_template_id',
    [templateId, testId]
  );

  console.log('✅ Assignment successful!');
  console.log('Test:', result.title);
  console.log('Template ID:', result.pdf_template_id);

  process.exit(0);
})();
