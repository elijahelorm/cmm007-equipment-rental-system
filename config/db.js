// config/db.js 
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
require("dotenv").config();

// socket path for XAMPP
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "equipment_rental",

  socketPath: "/Applications/XAMPP/xamppfiles/var/mysql/mysql.sock",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();

const initDatabase = async () => {
  try {
    const [result] = await promisePool.query("SELECT 1");
    console.log("✅ MySQL Connected Successfully");

    // Check if admin exists
    const [admins] = await promisePool.query(
      "SELECT * FROM users WHERE email = ?",
      [process.env.ADMIN_EMAIL],
    );

    if (admins.length === 0) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await promisePool.query(
        `INSERT INTO users (full_name, email, password, role) 
                 VALUES (?, ?, ?, 'admin')`,
        ["System Administrator", process.env.ADMIN_EMAIL, hashedPassword],
      );
      console.log("✅ Default admin account created");
    }

    console.log("📊 Database ready");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("");
    console.error("Make sure:");
    console.error("1. XAMPP/MAMP is running with MySQL");
    console.error("2. MySQL is on port 3306");
    console.error("3. You created the equipment_rental database");
    process.exit(1);
  }
};

module.exports = { pool: promisePool, initDatabase };
