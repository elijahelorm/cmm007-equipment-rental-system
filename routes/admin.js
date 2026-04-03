const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');

// Apply authentication to ALL admin routes
router.use(protect);
router.use(adminOnly);

// Admin dashboard
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { 
        user: req.user,
        title: 'Admin Dashboard'
    });
});

module.exports = router;