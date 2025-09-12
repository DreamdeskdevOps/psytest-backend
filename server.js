const express = require('express');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/database');
const app = require('./src/app');

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to PostgreSQL database
connectDB();

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});