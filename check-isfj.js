const {getOne} = require('./src/config/database');

(async () => {
  const result = await getOne(
    'SELECT result_code, title, description, LENGTH(description) as len FROM test_results WHERE result_code = $1 AND test_id = $2',
    ['ISFJ', '53f959d3-8d2d-4e82-a0aa-dab683be6abe']
  );

  console.log('Result Code:', result.result_code);
  console.log('Title:', result.title);
  console.log('Description length:', result.len);
  console.log('Description preview:', result.description.substring(0, 300));
  console.log('\n---\n');
  console.log('Full description:', result.description);

  process.exit(0);
})();
