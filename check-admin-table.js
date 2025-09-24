const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkAdminTable() {
    const client = await pool.connect();

    try {
        console.log('🔍 Checking admin table structure...');

        // Get admin table structure
        const adminStructure = await client.query(`
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'admins'
            ORDER BY ordinal_position;
        `);

        if (adminStructure.rows.length === 0) {
            console.log('❌ Admin table not found');

            // Check what tables exist
            const tables = await client.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `);

            console.log('Available tables:', tables.rows.map(r => r.table_name).join(', '));
        } else {
            console.log('✅ Admin table structure:');
            console.table(adminStructure.rows);

            // Check if there are any records
            const count = await client.query('SELECT COUNT(*) as count FROM admins');
            console.log(`📊 Admin records count: ${count.rows[0].count}`);
        }

    } catch (error) {
        console.error('❌ Error checking admin table:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

checkAdminTable().catch(console.error);