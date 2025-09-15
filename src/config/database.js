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
const getOne = async (query, params = []) => {
    const [results] = await sequelize.query(query, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT,
        raw: true
    });
    return results;
};

const getMany = async (query, params = []) => {
    const results = await sequelize.query(query, {
        bind: params,
        type: Sequelize.QueryTypes.SELECT
    });
    return results;
};

const insertOne = async (query, params = []) => {
    // Check if query has RETURNING clause - if so, use SELECT type to get the returned data
    if (query.toUpperCase().includes('RETURNING')) {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.SELECT
        });
        return results;
    } else {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.INSERT
        });
        return results;
    }
};

const updateOne = async (query, params = []) => {
    // Check if query has RETURNING clause - if so, use SELECT type to get the returned data
    if (query.toUpperCase().includes('RETURNING')) {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.SELECT
        });
        return results;
    } else {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.UPDATE
        });
        return results;
    }
};

const deleteOne = async (query, params = []) => {
    // Check if query has RETURNING clause - if so, use SELECT type to get the returned data
    if (query.toUpperCase().includes('RETURNING')) {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.SELECT
        });
        return results;
    } else {
        const [results] = await sequelize.query(query, {
            bind: params,
            type: Sequelize.QueryTypes.DELETE
        });
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