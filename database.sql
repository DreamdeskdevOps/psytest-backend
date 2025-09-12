-- ============================================
-- POSTGRESQL DATABASE SCHEMA
-- Multi-Test System with Payment Integration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER AUTHENTICATION & PROFILE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    
    -- Profile
    avatar TEXT, -- URL to profile image
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    
    -- Address (JSON object)
    address JSONB DEFAULT '{}',
    
    -- Account Status
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    
    -- PAYMENT & SUBSCRIPTION (Future Use)
    subscription_type VARCHAR(20) DEFAULT 'free' CHECK (subscription_type IN ('free', 'basic', 'premium', 'enterprise')),
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired')),
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    credits INTEGER DEFAULT 0,
    
    -- Analytics
    total_tests_attempted INTEGER DEFAULT 0,
    total_tests_completed INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    best_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ADMIN MANAGEMENT
-- ============================================

CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    
    -- Admin Specific
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'content_creator')),
    permissions JSONB DEFAULT '[]', -- Array of permission objects
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. MAIN TESTS CONFIGURATION
-- ============================================

CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic Info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    test_type VARCHAR(50) NOT NULL, -- 'odd_even', 'multiple_choice', 'mixed', etc.
    
    -- Test Settings
    total_duration INTEGER, -- in minutes (overall test time limit)
    total_questions INTEGER DEFAULT 0, -- calculated from sections
    passing_score DECIMAL(5,2) DEFAULT 50.00,
    max_attempts INTEGER DEFAULT 1,
    show_results BOOLEAN DEFAULT TRUE,
    show_correct_answers BOOLEAN DEFAULT FALSE,
    randomize_questions BOOLEAN DEFAULT FALSE,
    
    -- Status & Access
    is_active BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT FALSE,
    
    -- PAYMENT SETTINGS (Future Use)
    is_free BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    premium_features JSONB DEFAULT '[]', -- Array of premium features
    
    -- Analytics
    total_attempts INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    average_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- SEO & Display
    slug VARCHAR(255) UNIQUE,
    tags JSONB DEFAULT '[]',
    thumbnail TEXT, -- URL to test thumbnail
    
    -- Admin Info
    created_by UUID REFERENCES admins(id),
    updated_by UUID REFERENCES admins(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. TEST SECTIONS
-- ============================================

CREATE TABLE test_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    
    -- Basic Info
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Section Settings
    order_index INTEGER NOT NULL, -- Order of section in test
    question_count INTEGER NOT NULL,
    time_limit INTEGER, -- in minutes (section-specific time limit)
    
    -- Section Behavior
    is_timed BOOLEAN DEFAULT FALSE,
    auto_submit BOOLEAN DEFAULT FALSE, -- Auto submit when time expires
    allow_review BOOLEAN DEFAULT TRUE,
    allow_skip BOOLEAN DEFAULT TRUE,
    show_question_numbers BOOLEAN DEFAULT TRUE,
    
    -- Question Numbering
    numbering_style VARCHAR(20) DEFAULT 'numeric' CHECK (numbering_style IN ('numeric', 'alphabetic', 'roman', 'custom')),
    start_number INTEGER DEFAULT 1,
    number_prefix VARCHAR(10) DEFAULT '',
    number_suffix VARCHAR(10) DEFAULT '.',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. SECTION CONFIGURATIONS
-- ============================================

CREATE TABLE section_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
    
    -- Answer Pattern Configuration
    answer_type VARCHAR(50) NOT NULL, -- 'odd_even', 'yes_no', 'multiple_choice', 'true_false'
    options_count INTEGER DEFAULT 2, -- Number of options (2-5)
    correct_pattern VARCHAR(100), -- Pattern like 'odd', 'even', 'alternating', etc.
    
    -- Custom Options (for multiple choice)
    custom_options JSONB DEFAULT '[]', -- Array of option objects
    
    -- Scoring Configuration
    marks_per_question DECIMAL(4,2) DEFAULT 1.00,
    negative_marks DECIMAL(4,2) DEFAULT 0.00,
    bonus_marks DECIMAL(4,2) DEFAULT 0.00,
    time_bonus BOOLEAN DEFAULT FALSE,
    
    -- Advanced Settings
    randomize_options BOOLEAN DEFAULT FALSE,
    case_sensitive BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. QUESTIONS MANAGEMENT
-- ============================================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
    
    -- Question Content
    question_text TEXT NOT NULL,
    question_image TEXT, -- URL to question image
    question_type VARCHAR(20) DEFAULT 'text' CHECK (question_type IN ('text', 'image', 'mixed')),
    
    -- Question Settings
    order_index INTEGER NOT NULL,
    custom_number VARCHAR(10), -- Custom question number
    difficulty_level VARCHAR(10) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    
    -- Answer Configuration
    correct_answer TEXT, -- For specific answer
    answer_explanation TEXT,
    
    -- Analytics
    total_attempts INTEGER DEFAULT 0,
    correct_attempts INTEGER DEFAULT 0,
    difficulty_score DECIMAL(3,2) DEFAULT 0.50, -- 0-1 scale
    
    -- Metadata
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. ANSWER OPTIONS
-- ============================================

CREATE TABLE answer_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    
    -- Option Content
    option_text VARCHAR(500) NOT NULL,
    option_value VARCHAR(100) NOT NULL, -- 'A', 'B', 'C', etc. or 'odd', 'even'
    option_image TEXT, -- URL to option image
    
    -- Option Settings
    order_index INTEGER NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. ANSWER PATTERNS (Predefined)
-- ============================================

CREATE TABLE answer_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Pattern Info
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    pattern_type VARCHAR(50) NOT NULL, -- 'odd_even', 'yes_no', 'multiple_choice'
    
    -- Pattern Configuration
    options JSONB NOT NULL, -- Array of available options
    default_correct_pattern VARCHAR(100),
    is_system_pattern BOOLEAN DEFAULT FALSE, -- System vs Custom patterns
    
    -- Usage
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Admin Info
    created_by UUID REFERENCES admins(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. TEST ATTEMPTS
-- ============================================

CREATE TABLE test_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    
    -- Attempt Info
    attempt_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'paused', 'completed', 'abandoned', 'timed_out')),
    
    -- Timing
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    time_remaining INTEGER, -- in seconds
    
    -- Progress
    current_section_id UUID REFERENCES test_sections(id),
    current_question_number INTEGER DEFAULT 1,
    total_questions_answered INTEGER DEFAULT 0,
    
    -- Score (calculated after completion)
    total_score DECIMAL(6,2) DEFAULT 0.00,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    max_possible_score DECIMAL(6,2) DEFAULT 0.00,
    
    -- Section Scores (JSON)
    section_scores JSONB DEFAULT '{}',
    
    -- Status Flags
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    
    -- Browser/Environment Info
    user_agent TEXT,
    ip_address INET,
    screen_resolution VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. USER RESPONSES
-- ============================================

CREATE TABLE user_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES test_sections(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    
    -- Response Data
    question_number INTEGER NOT NULL,
    selected_answer TEXT, -- User's answer
    selected_option_id UUID REFERENCES answer_options(id),
    
    -- Response Metadata
    is_correct BOOLEAN,
    marks_obtained DECIMAL(4,2) DEFAULT 0.00,
    time_taken INTEGER DEFAULT 0, -- in seconds
    
    -- Response Status
    is_flagged BOOLEAN DEFAULT FALSE,
    is_reviewed BOOLEAN DEFAULT FALSE,
    confidence_level INTEGER, -- 1-5 scale (if collected)
    
    -- Response Timing
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. PAYMENT SYSTEM (Future Use)
-- ============================================

CREATE TABLE payment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Plan Info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    plan_type VARCHAR(20) CHECK (plan_type IN ('subscription', 'one_time', 'credit_pack')),
    
    -- Pricing
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'lifetime')),
    
    -- Features
    features JSONB DEFAULT '[]',
    test_access JSONB DEFAULT '[]', -- Array of test IDs
    max_attempts INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_popular BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment Info
    payment_method VARCHAR(20) CHECK (payment_method IN ('stripe', 'paypal', 'razorpay', 'manual')),
    payment_id VARCHAR(255), -- External payment ID
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Transaction
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('subscription', 'test_purchase', 'credit_purchase', 'refund')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Related Items
    plan_id UUID REFERENCES payment_plans(id),
    test_id UUID REFERENCES tests(id), -- For individual test purchases
    
    -- Payment Details
    payment_gateway_response JSONB,
    failure_reason TEXT,
    
    -- Timestamps
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_purchased_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES user_payments(id),
    
    -- Purchase Info
    purchase_type VARCHAR(20) CHECK (purchase_type IN ('individual', 'subscription', 'bundle', 'free')),
    expires_at TIMESTAMP, -- NULL for lifetime access
    
    -- Usage Limits
    max_attempts INTEGER, -- NULL for unlimited
    attempts_used INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(user_id, test_id)
);

-- ============================================
-- 12. MEDIA MANAGEMENT
-- ============================================

CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- File Info
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL, -- in bytes
    mime_type VARCHAR(100) NOT NULL,
    
    -- File Category
    file_type VARCHAR(20) CHECK (file_type IN ('question_image', 'option_image', 'avatar', 'certificate', 'other')),
    
    -- Usage
    used_in_questions INTEGER DEFAULT 0,
    used_in_options INTEGER DEFAULT 0,
    
    -- Admin Info
    uploaded_by UUID REFERENCES admins(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. ANALYTICS & LOGS
-- ============================================

CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity Info
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'test_start', 'test_complete', 'payment', etc.
    description TEXT,
    
    -- Context Data
    test_id UUID REFERENCES tests(id),
    section_id UUID REFERENCES test_sections(id),
    ip_address INET,
    user_agent TEXT,
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Log Info
    log_level VARCHAR(10) CHECK (log_level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    module VARCHAR(50), -- 'auth', 'tests', 'payments', etc.
    
    -- Error Details
    error_code VARCHAR(20),
    stack_trace TEXT,
    
    -- Context
    user_id UUID REFERENCES users(id),
    admin_id UUID REFERENCES admins(id),
    request_id VARCHAR(100),
    
    -- Additional Data
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. SYSTEM SETTINGS
-- ============================================

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Setting Info
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    
    -- Setting Metadata
    category VARCHAR(50), -- 'general', 'email', 'payment', 'test_defaults'
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by frontend
    
    -- Admin Info
    updated_by UUID REFERENCES admins(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription ON users(subscription_type, subscription_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Test indexes
CREATE INDEX idx_tests_status ON tests(is_active, is_published);
CREATE INDEX idx_tests_price ON tests(is_free, price);
CREATE INDEX idx_tests_created_at ON tests(created_at);

-- Section indexes
CREATE INDEX idx_sections_test_id ON test_sections(test_id);
CREATE INDEX idx_sections_order ON test_sections(test_id, order_index);

-- Question indexes
CREATE INDEX idx_questions_section_id ON questions(section_id);
CREATE INDEX idx_questions_order ON questions(section_id, order_index);

-- Attempt indexes
CREATE INDEX idx_attempts_user_test ON test_attempts(user_id, test_id);
CREATE INDEX idx_attempts_status ON test_attempts(status);
CREATE INDEX idx_attempts_started_at ON test_attempts(started_at);

-- Response indexes
CREATE INDEX idx_responses_attempt ON user_responses(attempt_id);
CREATE INDEX idx_responses_user_test ON user_responses(user_id, test_id);

-- Payment indexes
CREATE INDEX idx_payments_user ON user_payments(user_id);
CREATE INDEX idx_payments_status ON user_payments(status);
CREATE INDEX idx_purchased_tests_user ON user_purchased_tests(user_id);

-- Activity log indexes
CREATE INDEX idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- ============================================
-- 15. TEMPLATES & PRESETS SYSTEM
-- ============================================

CREATE TABLE test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(20) CHECK (template_type IN ('test', 'section', 'question')),
    template_data JSONB NOT NULL, -- Complete template structure
    
    -- Template Category
    category VARCHAR(50), -- 'academic', 'professional', 'entrance_exam', etc.
    tags JSONB DEFAULT '[]',
    
    -- Template Status
    is

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_sections_updated_at BEFORE UPDATE ON test_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_section_configurations_updated_at BEFORE UPDATE ON section_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_plans_updated_at BEFORE UPDATE ON payment_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_payments_updated_at BEFORE UPDATE ON user_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();