const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const runMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Results System Migration...');

    // Begin transaction
    await client.query('BEGIN');

    // ============================================
    // 1. TEST RESULTS TABLE (Predefined Results)
    // ============================================
    console.log('📋 Creating test_results table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

        -- Result Configuration
        result_code VARCHAR(100) NOT NULL,
        score_range VARCHAR(50), -- e.g., "80-100", "60-79", null for flag-based
        title VARCHAR(255) NOT NULL,
        description TEXT,

        -- PDF Management
        pdf_file TEXT, -- PDF file path/URL
        pdf_upload_date TIMESTAMP,
        pdf_file_size INTEGER, -- in bytes

        -- Result Type
        result_type VARCHAR(20) DEFAULT 'range_based' CHECK (result_type IN ('range_based', 'flag_based', 'hybrid')),

        -- Usage Analytics
        usage_count INTEGER DEFAULT 0,
        last_used TIMESTAMP,

        -- Status
        is_active BOOLEAN DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Unique constraint per test
        UNIQUE(test_id, result_code)
      );
    `);

    // ============================================
    // 2. RESULT COMPONENTS TABLE (Individual Components)
    // ============================================
    console.log('🧩 Creating result_components table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS result_components (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,

        -- Component Configuration
        component_code VARCHAR(10) NOT NULL, -- e.g., 'A', 'B', 'C', 'I', 'E'
        component_name VARCHAR(255) NOT NULL, -- e.g., 'Introversion', 'Extraversion'
        description TEXT,

        -- Scoring Configuration
        score_value INTEGER DEFAULT 0,
        order_priority INTEGER NOT NULL DEFAULT 1,

        -- Component Metadata
        component_category VARCHAR(50), -- e.g., 'personality', 'cognitive', 'behavioral'
        component_weight DECIMAL(3,2) DEFAULT 1.00, -- Weight in combination calculation

        -- Usage Analytics
        usage_count INTEGER DEFAULT 0,

        -- Status
        is_active BOOLEAN DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Unique constraint per test
        UNIQUE(test_id, component_code)
      );
    `);

    // ============================================
    // 3. USER TEST RESULTS TABLE (Assigned Results)
    // ============================================
    console.log('👤 Creating user_test_results table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_test_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        test_attempt_id UUID REFERENCES test_attempts(id) ON DELETE CASCADE,

        -- Assigned Result
        result_id UUID REFERENCES test_results(id) ON DELETE SET NULL,
        generated_result_code VARCHAR(100), -- For dynamic results
        final_score DECIMAL(8,2),

        -- Result Details
        result_title VARCHAR(255),
        result_description TEXT,
        result_pdf_path TEXT,

        -- Result Generation Method
        generation_method VARCHAR(20) DEFAULT 'range_based' CHECK (generation_method IN ('range_based', 'flag_based', 'manual', 'hybrid')),
        component_combination JSONB, -- Store the component combination used
        calculation_details JSONB, -- Store detailed calculation breakdown

        -- Result Status
        is_final BOOLEAN DEFAULT TRUE,
        is_visible_to_user BOOLEAN DEFAULT TRUE,
        admin_notes TEXT,

        -- Analytics
        viewed_count INTEGER DEFAULT 0,
        first_viewed_at TIMESTAMP,
        last_viewed_at TIMESTAMP,
        pdf_downloaded_count INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Ensure one result per user per test attempt
        UNIQUE(user_id, test_id, test_attempt_id)
      );
    `);

    // ============================================
    // 4. RESULT TEMPLATES TABLE (PDF Templates)
    // ============================================
    console.log('📄 Creating result_templates table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS result_templates (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

        -- Template Information
        name VARCHAR(255) NOT NULL,
        description TEXT,
        template_type VARCHAR(50) DEFAULT 'pdf' CHECK (template_type IN ('pdf', 'html', 'json')),

        -- Template Content
        template_content TEXT, -- HTML template or JSON structure
        template_file_path TEXT, -- Path to template file
        css_styles TEXT, -- Custom CSS for PDF generation

        -- Template Configuration
        variables JSONB DEFAULT '[]', -- Available template variables
        default_values JSONB DEFAULT '{}', -- Default values for variables

        -- Template Settings
        page_size VARCHAR(10) DEFAULT 'A4' CHECK (page_size IN ('A4', 'Letter', 'A3', 'Legal')),
        orientation VARCHAR(10) DEFAULT 'portrait' CHECK (orientation IN ('portrait', 'landscape')),
        margins JSONB DEFAULT '{"top": 20, "right": 20, "bottom": 20, "left": 20}',

        -- Usage
        usage_count INTEGER DEFAULT 0,
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ============================================
    // 5. CREATE INDEXES
    // ============================================
    console.log('📊 Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_results_test_id ON test_results(test_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_test_results_result_code ON test_results(result_code);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_result_components_test_id ON result_components(test_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_result_components_priority ON result_components(test_id, order_priority);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_test_results_user_id ON user_test_results(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_test_results_test_id ON user_test_results(test_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_test_results_attempt_id ON user_test_results(test_attempt_id);
    `);

    // ============================================
    // 6. CREATE UPDATE FUNCTION AND TRIGGERS
    // ============================================
    console.log('⚡ Creating update function and triggers...');

    // Create or replace the update function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      CREATE TRIGGER update_test_results_updated_at
      BEFORE UPDATE ON test_results
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_result_components_updated_at
      BEFORE UPDATE ON result_components
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_user_test_results_updated_at
      BEFORE UPDATE ON user_test_results
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      CREATE TRIGGER update_result_templates_updated_at
      BEFORE UPDATE ON result_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // ============================================
    // 7. INSERT SAMPLE DATA
    // ============================================
    console.log('🌱 Inserting sample templates...');

    await client.query(`
      INSERT INTO result_templates (name, description, template_content, template_type, variables)
      VALUES (
        'Default Result Template',
        'Standard result template with basic information',
        '<html><body><h1>{{title}}</h1><p>{{description}}</p><p>Score: {{score}}</p></body></html>',
        'html',
        '["title", "description", "score", "date", "user_name"]'::jsonb
      ) ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO result_templates (name, description, template_content, template_type, is_default)
      VALUES (
        'Personality Report Template',
        'Template for personality test results with detailed analysis',
        '<html><body><h1>Personality Assessment Report</h1><h2>{{user_name}}</h2><p><strong>Result:</strong> {{result_code}}</p><p><strong>Score:</strong> {{score}}</p><div>{{description}}</div><div><strong>Date:</strong> {{date}}</div></body></html>',
        'html',
        true
      ) ON CONFLICT DO NOTHING;
    `);

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Results System Migration completed successfully!');
    console.log('📋 Created tables:');
    console.log('   - test_results (predefined results)');
    console.log('   - result_components (individual components)');
    console.log('   - user_test_results (assigned results)');
    console.log('   - result_templates (PDF templates)');
    console.log('📊 Created indexes for optimal performance');
    console.log('⚡ Added update triggers');
    console.log('🌱 Added sample templates');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Run migration
runMigration().catch(console.error);