const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send('Admin route working!');
});

module.exports = router;