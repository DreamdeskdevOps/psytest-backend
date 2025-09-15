const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const adminAuthRoutes = require('./routes/admin/auth');
const adminTestRoutes = require('./routes/admin/tests');
const adminSectionRoutes = require('./routes/admin/sections');
const adminQuestionRoutes = require('./routes/admin/questions');
// const testRoutes = require('./routes/tests');
// const userRoutes = require('./routes/users');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/' + process.env.API_VERSION + '/auth', authRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/auth', adminAuthRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/tests', adminTestRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/sections', adminSectionRoutes);
app.use('/api/' + process.env.API_VERSION + '/admin/questions', adminQuestionRoutes);

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