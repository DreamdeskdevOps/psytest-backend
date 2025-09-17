// Script to add missing columns to answer_patterns table
const { Client } = require('pg');
require('dotenv').config();

async function addMissingColumns() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'add_missing_columns.sql'), 'utf8');
    
    console.log('Executing SQL:');
    console.log(sql);
    
    // Execute the SQL
    await client.query(sql);
    console.log('Successfully added missing columns to answer_patterns table');
  } catch (error) {
    console.error('Error adding missing columns:', error);
  } finally {
    await client.end();
  }
}

addMissingColumns();