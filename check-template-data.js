const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection - using correct credentials from .env
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'psytest_database',
  password: 'Boom#123',
  port: 5432,
});

async function checkTemplates() {
  try {
    console.log('Connecting to PostgreSQL...');
    
    // Query all PDF templates
    const result = await pool.query(`
      SELECT 
        template_id,
        template_name,
        template_description,
        pdf_file_path,
        template_config,
        is_active,
        created_at
      FROM pdf_templates
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== PDF TEMPLATES ===');
    console.log('Total templates:', result.rows.length);
    
    result.rows.forEach((template, index) => {
      console.log(`\n--- Template ${index + 1} ---`);
      console.log('Template ID:', template.template_id);
      console.log('Name:', template.template_name);
      console.log('Description:', template.template_description);
      console.log('PDF File Path:', template.pdf_file_path);
      console.log('Is Active:', template.is_active);
      console.log('Created:', template.created_at);
      
      // Check if file exists
      if (template.pdf_file_path) {
        // The path in DB is relative like "uploads/pdf-templates/template-xxx.pdf"
        const fullPath = path.join(__dirname, template.pdf_file_path);
        const exists = fs.existsSync(fullPath);
        console.log('Full path:', fullPath);
        console.log('File exists:', exists);
        
        if (exists) {
          const stats = fs.statSync(fullPath);
          console.log('File size:', stats.size, 'bytes');
          
          // Check if it's a valid PDF
          const buffer = fs.readFileSync(fullPath);
          const isPDF = buffer.toString('utf8', 0, 4) === '%PDF';
          console.log('Is valid PDF:', isPDF);
          
          // Show what URL the frontend should use
          console.log('Frontend URL:', `http://localhost:3001/${template.pdf_file_path}`);
        } else {
          console.log('⚠️  FILE NOT FOUND!');
        }
      } else {
        console.log('⚠️  No PDF file path set!');
      }
      
      // Show template config summary
      if (template.template_config) {
        const config = typeof template.template_config === 'string' 
          ? JSON.parse(template.template_config) 
          : template.template_config;
        console.log('Fields count:', config.fields ? config.fields.length : 0);
        console.log('Page count:', config.pageCount);
        
        if (config.fields && config.fields.length > 0) {
          console.log('First field:', JSON.stringify(config.fields[0], null, 2));
        }
      }
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('\n✅ Connection closed');
  }
}

checkTemplates();
