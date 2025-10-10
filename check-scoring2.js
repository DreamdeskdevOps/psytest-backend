const {getOne, getMany} = require('./src/config/database');

(async () => {
  const testId = '53f959d3-8d2d-4e82-a0aa-dab683be6abe';

  const test = await getOne(
    'SELECT id, title FROM tests WHERE id = $1',
    [testId]
  );

  console.log('========================================');
  console.log('Test:', test.title);
  console.log('========================================\n');

  const results = await getMany(
    'SELECT result_code, title, description FROM test_results WHERE test_id = $1',
    [test.id]
  );

  console.log('Number of results configured:', results.length);

  if (results.length > 0) {
    console.log('\nAvailable results:');
    results.slice(0, 3).forEach(r => {
      console.log('  -', r.result_code, ':', r.title);
      console.log('    Description length:', r.description?.length || 0);
    });
  } else {
    console.log('\n❌ NO RESULTS CONFIGURED FOR THIS TEST!');
  }

  process.exit(0);
})();
