const { sequelize } = require('./src/config/database');

async function addFlagColumn() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    console.log('🔍 Checking if question_flag column exists...');
    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'question_flag'
    `);

    if (columns.length > 0) {
      console.log('✅ question_flag column already exists');
    } else {
      console.log('🔧 Adding question_flag column...');
      await sequelize.query(`
        ALTER TABLE questions
        ADD COLUMN question_flag VARCHAR(50) DEFAULT NULL
      `);
      console.log('✅ question_flag column added successfully');
    }

    console.log('🔍 Verifying column structure...');
    const [verification] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'question_flag'
    `);

    console.log('📋 Column verification:', verification);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
}

addFlagColumn();