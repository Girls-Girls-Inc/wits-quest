const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// GET leaderboard
router.get('/leaderboard', leaderboardController.getLeaderboard);

module.exports = router;
