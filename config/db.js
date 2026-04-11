// This file controls the connection between Node.js and MySQL
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// socket path for XAMPP - MacOS
// Create a connection pool
// A pool maintains multiple database connections for efficiency
const pool = mysql.createPool({
    host: process.env.DB_HOST,     
    user: process.env.DB_USER,      
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,  
    waitForConnections: true,
    connectionLimit: 10,         
    queueLimit: 0             
});

// Convert to Promise-based (so we can use async/await)
const promisePool = pool.promise();

// Function to initialize database (test connection + setup admin)
const initDatabase = async () => {
    try {
        // Test the connection by running a simple query
        const [result] = await promisePool.query('SELECT 1');
        console.log('✅ MySQL Connected Successfully');
        
        // Check if admin account exists
        const [admins] = await promisePool.query(
            'SELECT * FROM users WHERE email = ?',
            [process.env.ADMIN_EMAIL]
        );
        
        if (admins.length === 0) {
            // Create admin account if it doesn't exist
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            await promisePool.query(
                `INSERT INTO users (full_name, email, password, role) 
                 VALUES (?, ?, ?, 'admin')`,
                ['System Administrator', process.env.ADMIN_EMAIL, hashedPassword]
            );
            console.log('✅ Default admin account created');
            console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
            console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
        } else {
            console.log('✅ Admin account already exists');
        }
        
        console.log('📊 Database ready for use');
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('');
        console.error('Make sure:');
        console.error('1. XAMPP is running with MySQL');
        console.error('2. MySQL is on port 3306');
        console.error('3. You created the equipment_rental database');
        process.exit(1); // Stop the server if database fails
    }
};

// Export so other files can use the connection
module.exports = { pool: promisePool, initDatabase };
