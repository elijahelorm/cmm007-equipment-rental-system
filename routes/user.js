const express = require('express');
const router = express.Router();
const { protect, userOnly } = require('../middleware/auth');

// Apply authentication to ALL user routes
router.use(protect);
router.use(userOnly);

// User dashboard
router.get('/dashboard', (req, res) => {
    res.render('user/dashboard', { 
        user: req.user,
        title: 'User Dashboard'
    });
});

module.exports = router;