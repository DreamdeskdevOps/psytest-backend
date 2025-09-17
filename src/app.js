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
const adminConfigurationRoutes = require('./routes/admin/adminConfigurationRoutes');
// const testRoutes = require('./routes/tests');
// const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Frontend URL
  credentials: true // Allow cookies to be sent
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/' + process.env.API_VERSION + '/auth', authRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/auth', adminAuthRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/tests', adminTestRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/sections', adminSectionRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/questions', adminQuestionRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/answers', adminAnswersRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/configuration', adminConfigurationRoutes);

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

module.exports = app;