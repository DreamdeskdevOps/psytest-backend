const { Sequelize } = require('sequelize');

// Load environment variables from .env file
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: process.env.DB_DIALECT,
    logging: console.log, // Enable SQL logging for debugging
});

// Test the database connection
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL Connected Successfully via Sequelize');
        console.log(`📊 Database: ${process.env.DB_NAME}`);
        
        // Models are ready for use
        console.log('✅ Models are ready for use');
        
        // Sync all models with force: false to avoid altering existing tables
        await sequelize.sync({ force: false });
        console.log('📋 Database models synchronized');
    } catch (error) {
        console.error('❌ Database Connection Failed:', error.message);
        process.exit(1);
    }
};

// Database utility functions
const getOne = async (query, params = [], transaction = null) => {
    const options = {
        bind: params,
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    };
    if (transaction) options.transaction = transaction;

    const [results] = await sequelize.query(query, options);
    return results;
};

const getMany = async (query, params = [], transaction = null) => {
    const options = {
        bind: params,
        type: Sequelize.QueryTypes.SELECT
    };
    if (transaction) options.transaction = transaction;

    const results = await sequelize.query(query, options);
    return results;
};

const insertOne = async (query, params = [], transaction = null) => {
    const options = { bind: params };
    if (transaction) options.transaction = transaction;

    if (query.toUpperCase().includes('RETURNING')) {
        options.type = Sequelize.QueryTypes.SELECT;
        const [results] = await sequelize.query(query, options);
        return results;
    } else {
        options.type = Sequelize.QueryTypes.INSERT;
        const [results] = await sequelize.query(query, options);
        return results;
    }
};

const updateOne = async (query, params = [], transaction = null) => {
    const options = { bind: params };
    if (transaction) options.transaction = transaction;

    if (query.toUpperCase().includes('RETURNING')) {
        options.type = Sequelize.QueryTypes.SELECT;
        const [results] = await sequelize.query(query, options);
        return results;
    } else {
        options.type = Sequelize.QueryTypes.UPDATE;
        const [results] = await sequelize.query(query, options);
        return results;
    }
};

const deleteOne = async (query, params = [], transaction = null) => {
    const options = { bind: params };
    if (transaction) options.transaction = transaction;

    if (query.toUpperCase().includes('RETURNING')) {
        options.type = Sequelize.QueryTypes.SELECT;
        const [results] = await sequelize.query(query, options);
        return results;
    } else {
        options.type = Sequelize.QueryTypes.DELETE;
        const [results] = await sequelize.query(query, options);
        return results;
    }
};

const executeQuery = async (query, params = []) => {
    // Convert $1, $2, etc. to ? placeholders for Sequelize
    let sequelizeQuery = query;
    for (let i = 1; i <= params.length; i++) {
        sequelizeQuery = sequelizeQuery.replace(new RegExp('\\$' + i + '(?!\\d)', 'g'), '?');
    }
    
    const results = await sequelize.query(sequelizeQuery, {
        replacements: params
    });
    return results;
};

module.exports = {
    sequelize,
    connectDB,
    getOne,
    getMany,
    insertOne,
    updateOne,
    deleteOne,
    executeQuery
};