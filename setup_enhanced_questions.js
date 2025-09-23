#!/usr/bin/env node

/**
 * Setup script for Enhanced Question System
 * Runs the database migration and creates necessary directories
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', 'safe_enhance_question_system.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    console.log('🚀 Running database migration...');
    await client.query(migrationSQL);

    console.log('✅ Database migration completed successfully!');

    // Verify tables were created
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('question_images', 'file_uploads')
    `;

    const result = await client.query(tablesQuery);
    const createdTables = result.rows.map(row => row.table_name);

    console.log('📋 Created tables:', createdTables);

  } catch (error) {
    console.error('❌ Database migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function setupDirectories() {
  console.log('📁 Creating upload directories...');

  const directories = [
    'uploads',
    'uploads/questions',
    'uploads/questions/images',
    'uploads/questions/thumbnails',
    'uploads/questions/compressed',
    'uploads/temp'
  ];

  for (const dir of directories) {
    const dirPath = path.join(__dirname, dir);
    try {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        console.error(`❌ Failed to create directory ${dir}:`, error.message);
        throw error;
      } else {
        console.log(`📁 Directory already exists: ${dir}`);
      }
    }
  }
}

async function validateEnvironment() {
  console.log('🔍 Validating environment...');

  const requiredVars = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    throw new Error('Environment validation failed');
  }

  console.log('✅ Environment validation passed');
}

async function main() {
  console.log('🎯 Enhanced Question System Setup');
  console.log('=====================================\\n');

  try {
    await validateEnvironment();
    await setupDirectories();
    await setupDatabase();

    console.log('\\n🎉 Setup completed successfully!');
    console.log('\\nNext steps:');
    console.log('1. Start your backend server: npm run dev');
    console.log('2. Update your frontend routes to use EnhancedQuestionManagement');
    console.log('3. Test creating questions with images');
    console.log('\\n📖 See ENHANCED_QUESTION_SYSTEM_SETUP.md for detailed documentation');

  } catch (error) {
    console.error('\\n💥 Setup failed:', error.message);
    console.error('\\nPlease check the error above and try again.');
    process.exit(1);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  setupDatabase,
  setupDirectories,
  validateEnvironment
};