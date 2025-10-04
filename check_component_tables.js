const db = require('./src/config/database');

async function checkComponentTables() {
  try {
    console.log('\n=== result_components table schema ===\n');
    const compCols = await db.getMany(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'result_components'
      ORDER BY ordinal_position
    `);
    compCols.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));

    console.log('\n=== result_components sample data ===\n');
    const compData = await db.getMany(`SELECT * FROM result_components LIMIT 5`);
    console.table(compData);

    console.log('\n=== result_templates table schema ===\n');
    const tempCols = await db.getMany(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'result_templates'
      ORDER BY ordinal_position
    `);
    tempCols.forEach(col => console.log(`${col.column_name}: ${col.data_type}`));

    console.log('\n=== result_templates sample data ===\n');
    const tempData = await db.getMany(`SELECT * FROM result_templates LIMIT 5`);
    console.table(tempData);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkComponentTables();
