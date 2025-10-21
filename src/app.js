const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/admin/auth');
const adminTestRoutes = require('./routes/admin/tests');
const adminSectionRoutes = require('./routes/admin/sections');
const adminQuestionRoutes = require('./routes/admin/questions');
const adminAnswersRoutes = require('./routes/admin/answerOptions');
const adminOptionTypesRoutes = require('./routes/admin/optionTypes');
const adminConfigurationRoutes = require('./routes/admin/adminConfigurationRoutes');
const adminFileRoutes = require('./routes/admin/fileRoutes');
const adminScoringRoutes = require('./routes/admin/scoring');
const adminScoringPatternsRoutes = require('./routes/admin/scoringPatterns');
const adminResultRoutes = require('./routes/admin/results');
const adminResultComponentRoutes = require('./routes/admin/resultComponents');
const pdfTemplateRoutes = require('./routes/pdfTemplates');
const fileServingRoutes = require('./routes/fileServing');
const testAttemptRoutes = require('./routes/testAttempts');
const userTestRoutes = require('./routes/userTests');
const studentsRoutes = require('./routes/students');
const reportsRoutes = require('./routes/reports');
const pdfGenerationRoutes = require('./routes/pdfGeneration');
// const testRoutes = require('./routes/tests');
// const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors({
    //   origin: 'http://localhost:3000', // Frontend URL
    origin: function (origin, callback) {
        // Allow requests from localhost and any IP on the local network
        const allowedOrigins = [
            'http://localhost:3000',
            // 'http://127.0.0.1:3000',
            // 'http://172.20.10.6:3000/', // Example local network IP
            
            // /^http:\/\/192\.168\.\d+\.\d+:3000$/  // Allow any 192.168.x.x:3000
        ];

        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return origin === allowedOrigin;
            }
            // For regex patterns
            return allowedOrigin.test(origin);
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow cookies to be sent
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/' + process.env.API_VERSION + '/auth', authRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/auth', adminAuthRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/tests', adminTestRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/sections', adminSectionRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/questions', adminQuestionRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/answers', adminAnswersRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/options', adminAnswersRoutes); // Also mount at /options for frontend compatibility
app.use('/api/' + process.env.API_VERSION + '/admin/option-types', adminOptionTypesRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/configuration', adminConfigurationRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/files', adminFileRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/scoring', adminScoringRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/scoring-patterns', adminScoringPatternsRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/results', adminResultRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/result-components', adminResultComponentRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/pdf-templates', pdfTemplateRoutes);
app.use('/api/' + process.env.API_VERSION + '/files', fileServingRoutes);
app.use('/api/' + process.env.API_VERSION + '/test-attempts', testAttemptRoutes);
app.use('/api/' + process.env.API_VERSION + '/user-tests', userTestRoutes);
app.use('/api/' + process.env.API_VERSION + '/students', studentsRoutes);
app.use('/api/' + process.env.API_VERSION + '/reports', reportsRoutes);
app.use('/api/' + process.env.API_VERSION + '/pdf', pdfGenerationRoutes);

// app.use('/api/' + process.env.API_VERSION + '/tests', testRoutes);
// app.use('/api/' + process.env.API_VERSION + '/users', userRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to test full test-attempt flow without auth
app.get('/debug/test-attempt/:sessionToken', async (req, res) => {
    try {
        const { sessionToken } = req.params;
        const testAttemptService = require('./services/testAttemptService');

        console.log('🐛 Debug: Testing test attempt flow for session:', sessionToken);

        // Try to get test questions using the service
        const result = await testAttemptService.getTestQuestions(sessionToken);
        console.log('🐛 Debug: Service result:', result.success ? 'SUCCESS' : 'FAILED');
        if (!result.success) {
            console.log('🐛 Debug: Error:', result.message);
        }

        res.json(result);

    } catch (error) {
        console.error('🐛 Debug test attempt error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to test questions without auth
app.get('/debug/test-questions/:testId', async (req, res) => {
    try {
        const { testId } = req.params;
        const SectionModel = require('./models/Section');
        const QuestionModel = require('./models/Questions');

        console.log('🐛 Debug: Testing questions for testId:', testId);

        // Get sections for this test
        const sections = await SectionModel.getSectionsByTestId(testId);
        console.log('🐛 Debug: Found sections:', sections.length);

        // Get questions for each section
        let allQuestions = [];
        for (const section of sections) {
            const sectionQuestions = await QuestionModel.getQuestionsBySection(section.id);
            console.log(`🐛 Debug: Section ${section.section_name} has ${sectionQuestions.length} questions`);

            // Extract answer options from section config
            let answerOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
            if (section.custom_scoring_config) {
                try {
                    const config = typeof section.custom_scoring_config === 'string'
                        ? JSON.parse(section.custom_scoring_config)
                        : section.custom_scoring_config;
                    if (config.section_options && Array.isArray(config.section_options)) {
                        answerOptions = config.section_options.map(opt => opt.text || opt);
                    }
                } catch (error) {
                    console.error('Error parsing section options:', error);
                }
            }

            allQuestions = allQuestions.concat(sectionQuestions.map(q => ({
                id: q.id,
                text: q.question_text,
                section_name: section.section_name,
                section_id: section.id,
                answer_options: answerOptions
            })));
        }

        res.json({
            success: true,
            testId,
            sectionsCount: sections.length,
            questionsCount: allQuestions.length,
            sections: sections.map(s => ({ id: s.id, name: s.section_name })),
            questions: allQuestions.slice(0, 3) // First 3 questions for testing
        });

    } catch (error) {
        console.error('🐛 Debug endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;