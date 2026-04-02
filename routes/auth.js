const express = require('express');
const router = express.Router();

// Temporary home route to test the server works
router.get('/', (req, res) => {
    res.send('Equipment Rental System is running!');
});

module.exports = router;