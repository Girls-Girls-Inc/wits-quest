const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');

// GET leaderboard
router.get('/', leaderboardController.getLeaderboard);

// // POST a new leaderboard entry
// router.post('/', leaderboardController.createEntry);

// // PATCH/update an existing leaderboard entry by ID
// router.patch('/:id', leaderboardController.updateScore);

// // DELETE a leaderboard entry by ID
// router.delete('/:id', leaderboardController.deleteEntry);

module.exports = router;
