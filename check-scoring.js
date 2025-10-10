const {getOne, getMany} = require('./src/config/database');

(async () => {
  const testId = '53f959d3-8d2d-4e82-a0aa-dab683be6abe';

  const test = await getOne(
    'SELECT id, title, scoring_type FROM tests WHERE id = $1',
    [testId]
  );

  console.log('========================================');
  console.log('Test:', test.title);
  console.log('Scoring type:', test.scoring_type);
  console.log('========================================\n');

  const results = await getMany(
    'SELECT result_code, title FROM test_results WHERE test_id = $1',
    [test.id]
  );

  console.log('Number of results configured:', results.length);

  if (results.length > 0) {
    console.log('\nAvailable results:');
    results.forEach(r => console.log('  -', r.result_code, ':', r.title));
  } else {
    console.log('\n❌ NO RESULTS CONFIGURED FOR THIS TEST!');
    console.log('This is why you see "Assessment Complete" with no result data.');
  }

  process.exit(0);
})();
