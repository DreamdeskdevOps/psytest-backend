// Test database connection
const { getOne } = require('./src/config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    // Try a simple query
    const result = await getOne('SELECT 1 as test');
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}

testConnection();