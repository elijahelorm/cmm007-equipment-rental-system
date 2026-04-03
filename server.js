// server.js - MAIN ENTRY POINT
// This file starts your entire application


// ---------- IMPORT PACKAGES ----------
const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const session = require('express-session');
const path = require('path');

// Load environment variables from .env file
dotenv.config();


// Import database connection and initialization function
const { initDatabase } = require('./config/db');

// Import route handlers (we'll create these next)
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');

// ---------- CREATE EXPRESS AND INITIATE ----------
// 'app' is your web server object
const app = express();

// ---------- MIDDLEWARE SETUP ----------

// 1. Parse JSON bodies (for API requests)
app.use(express.json());

// 2. Parse URL-encoded bodies (for form submissions from login/register)
// Extended: true allows nested objects
app.use(express.urlencoded({ extended: true }));

// 3. Parse cookies (so we can read the login token)
app.use(cookieParser());

// 4. Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 5. Set up session management
// Sessions allow us to store temporary data for each user
app.use(session({
    secret: process.env.SESSION_SECRET,  
    resave: false,                       
    saveUninitialized: false,            
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,     
        httpOnly: true                  
    }
}));

// ---------- VIEW ENGINE SETUP ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ---------- ROUTES (URL HANDLERS) ----------

// Home page - redirect to login
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Login page - show the login form
// When someone visits http://localhost:3000/login
app.get('/login', (req, res) => {
    // Get error message from URL query parameter (if any)
    const error = req.query.error || '';
    const message = req.query.message || '';
    
    // Render the login.ejs template and pass data to it
    res.render('login', { 
        error: error, 
        message: message,
        title: 'Login | Equipment Rental'
    });
});


app.use('/auth', authRoutes);

// Any URL starting with /admin goes to adminRoutes
app.use('/admin', adminRoutes);

// Any URL starting with /user goes to userRoutes

app.use('/user', userRoutes);

// Logout route - clears session and cookie
app.get('/logout', (req, res) => {
    res.clearCookie('token');
    req.session.destroy();
    res.redirect('/login?message=Logged out successfully');
});

// 404 Handler - for any URL that doesn't exist
// This runs if no other route matched
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/login">Go to Login</a>
    `);
});

// ---------- START THE SERVER ----------
// This function initializes database THEN starts the server
const startServer = async () => {
    try {
        // First, connect to database and setup admin account
        await initDatabase();
        
        // Database is ready, now start the web server
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log('');
            console.log('========================================');
            console.log(`SERVER RUNNING: http://localhost:${PORT}`);
            console.log('========================================');
            console.log('');
            console.log('vailable URLs:');
            console.log(`   Login:      http://localhost:${PORT}/login`);
            console.log(`   Admin Demo: http://localhost:${PORT}/admin/dashboard (after login)`);
            console.log(`   User Demo:  http://localhost:${PORT}/user/dashboard (after login)`);
            console.log('');
            console.log('Default Admin Account:');
            console.log(`   Email:    ${process.env.ADMIN_EMAIL}`);
            console.log(`   Password: ${process.env.ADMIN_PASSWORD}`);
            console.log('');
            console.log('Tip: Press CTRL+C to stop the server');
            console.log('========================================');
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Actually start the server
startServer();