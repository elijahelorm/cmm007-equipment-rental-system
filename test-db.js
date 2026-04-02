// test-db.js - Temporary file to test database connection
require('dotenv').config();
const { initDatabase, pool } = require('./config/db');

async function test() {
    await initDatabase();
    
    // Test query - get all equipment
    const [equipment] = await pool.query('SELECT * FROM equipment');
    console.log('Equipment in database:');
    console.table(equipment);
    
    // Close connection
    await pool.end();
}

test();