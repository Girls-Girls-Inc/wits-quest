// backend/routes/privateLeaderboardRoutes.js
const express = require('express');
const router = express.Router();
const privateLeaderboardController = require('../controllers/privateLeaderboardController');
const { requireAuth } = require('../middleware/auth');

// Protected routes (require token in Authorization header)
router.post('/private-leaderboards', requireAuth, privateLeaderboardController.create);
router.get('/private-leaderboards', requireAuth, privateLeaderboardController.list);
router.get('/private-leaderboards/:id', requireAuth, privateLeaderboardController.list);

router.get('/private-leaderboards/:id/standings', requireAuth, privateLeaderboardController.standings);

// Join by invite code
router.post('/private-leaderboards/join', requireAuth, privateLeaderboardController.joinByCode);

// Invite, list members, remove member
router.post('/private-leaderboards/:id/members', requireAuth, privateLeaderboardController.inviteMember);
router.get('/private-leaderboards/:id/members', requireAuth, privateLeaderboardController.listMembers);
router.delete('/private-leaderboards/:id/members/:userId', requireAuth, privateLeaderboardController.removeMember);

// Update & delete (owner only)
router.patch('/private-leaderboards/:id', requireAuth, privateLeaderboardController.update);
router.delete('/private-leaderboards/:id', requireAuth, privateLeaderboardController.delete);

module.exports = router;
