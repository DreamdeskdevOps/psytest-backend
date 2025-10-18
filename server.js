// Load environment variables FIRST before requiring anything else
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const { connectDB } = require('./src/config/database');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

// Connect to PostgreSQL database
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});