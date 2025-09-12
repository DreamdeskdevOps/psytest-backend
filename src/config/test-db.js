require('dotenv').config();
const { connectDB } = require('./src/config/database');

connectDB();