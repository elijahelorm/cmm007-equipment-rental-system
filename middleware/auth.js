
// middleware/auth.js - AUTHENTICATION MIDDLEWARE
// This file checks if users are logged in


const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/*
 * protect - Middleware to check if user is logged in
 * 
 * This runs BEFORE any protected route (like dashboard)
 * If user is not logged in, they get redirected to login page
 * If user IS logged in, we attach their info to req.user
 */
const protect = async (req, res, next) => {
    let token;
    
    // Check for token in cookies (our login sets a cookie named 'token')
    if (req.cookies.token) {
        token = req.cookies.token;
    }
    // Also check Authorization header (for API requests)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    
    // If no token found, user is not logged in
    if (!token) {
        return res.redirect('/login?error=Please login first');
    }
    
    try {
        // Verify the token is valid and not expired
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Token is valid! Now get the user from database
        const [users] = await pool.query(
            'SELECT user_id, full_name, email, role FROM users WHERE user_id = ?',
            [decoded.id]
        );
        
        if (users.length === 0) {
            // User doesn't exist in database anymore
            return res.redirect('/login?error=User not found');
        }
        
        // Attach user info to the request object
        req.user = users[0];
        
        // User is authenticated, proceed to the actual route
        next();
        
    } catch (error) {
        // Token is invalid or expired
        console.error('Auth error:', error.message);
        res.clearCookie('token');
        res.redirect('/login?error=Session expired, please login again');
    }
};

/*
 * adminOnly - Middleware to check if user is admin
 * 
 * This runs AFTER protect (so we already have req.user)
 * If user is not admin, they get access denied
 */
const adminOnly = (req, res, next) => {
    // Check if user exists and has role 'admin'
    if (req.user && req.user.role === 'admin') {
        next(); // User is admin, allow access
    } else {
        res.status(403).send(`
            <h1>403 - Access Denied</h1>
            <p>This page is only for administrators.</p>
            <a href="/user/dashboard">Go to User Dashboard</a>
        `);
    }
};

/*
 * userOnly - Middleware to check if user is regular user
 * 
 * This ensures regular users can't access admin pages
 */
const userOnly = (req, res, next) => {
    if (req.user && req.user.role === 'user') {
        next(); // User is regular user, allow access
    } else {
        res.status(403).send(`
            <h1>403 - Access Denied</h1>
            <p>This page is only for regular users.</p>
            <a href="/admin/dashboard">Go to Admin Dashboard</a>
        `);
    }
};

// Export all middleware functions so other files can use them
module.exports = { protect, adminOnly, userOnly };