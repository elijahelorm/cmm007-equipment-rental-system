// routes/auth.js - AUTHENTICATION ROUTES
// Handles login and registration

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

/**
 * POST /auth/login
 * Handles login form submission
 */
router.post('/login', async (req, res) => {
    try {
        // Get form data from the request body
        const { email, password, role } = req.body;
        
        console.log(`Login attempt: ${email} as ${role}`);
        
        // Step 1: Find user by email
        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        const user = users[0];
        
        // Step 2: Check if user exists AND role matches
        if (!user) {
            return res.redirect('/login?error=Account not found with this email');
        }
        
        if (user.role !== role) {
            return res.redirect(`/login?error=This account is not a ${role} account`);
        }
        
        // Step 3: Verify password using bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.redirect('/login?error=Incorrect password');
        }
        
        // Step 4: Login successful! Create JWT token
        // The token contains user info (id, email, role)
        // It's signed with our secret key from .env
        const token = jwt.sign(
            { 
                id: user.user_id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }  // Token expires in 24 hours
        );
        
        // Step 5: Store token in a cookie
        // httpOnly: true means JavaScript can't access it
        // maxAge: 24 hours in milliseconds
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax' 
        });
        
        // Step 6: Redirect based on role
        if (user.role === 'admin') {
            console.log(`✅ Admin logged in: ${user.full_name}`);
            res.redirect('/admin/dashboard');
        } else {
            console.log(`✅ User logged in: ${user.full_name}`);
            res.redirect('/user/dashboard');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=Something went wrong. Please try again.');
    }
});

/**
 * POST /auth/register
 * Handles new user registration
 */
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        console.log(`Registration attempt: ${email}`);
        
        // Step 1: Check if email already exists
        const [existing] = await pool.query(
            'SELECT user_id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.redirect('/login?error=Email already registered. Please login.');
        }
        
        // Step 2: Validate password strength
        if (password.length < 6) {
            return res.redirect('/login?error=Password must be at least 6 characters');
        }
        
        // Step 3: Hash the password before storing
        // 10 = salt rounds (higher = more secure but slower)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Step 4: Insert new user into database
        const [result] = await pool.query(
            `INSERT INTO users (full_name, email, password, role) 
             VALUES (?, ?, ?, 'user')`,
            [fullName, email, hashedPassword]
        );
        
        console.log(`✅ New user registered: ${email}`);
        
        // Step 5: Create JWT token for auto-login
        const token = jwt.sign(
            { id: result.insertId, email: email, role: 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Step 6: Set cookie and redirect to dashboard
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
        
        res.redirect('/user/dashboard');
        
    } catch (error) {
        console.error('Registration error:', error);
        res.redirect('/login?error=Registration failed. Please try again.');
    }
});

module.exports = router;