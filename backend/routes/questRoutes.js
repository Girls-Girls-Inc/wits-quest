// backend/routes/questRoutes.js
const express = require('express');
const router = express.Router();
const QuestController = require('../controllers/questController');

// Quests CRUD-ish
router.post('/quests', QuestController.createQuest);
router.get('/quests', QuestController.getQuests);

// User quests
router.post('/user-quests', QuestController.add);
router.get('/user-quests', QuestController.mine);

// Complete + award points
router.post('/user-quests/:id/complete', QuestController.complete);

module.exports = router;
