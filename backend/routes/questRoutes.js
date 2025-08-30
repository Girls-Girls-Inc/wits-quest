// backend/routes/questRoutes.js
const express = require('express');
const router = express.Router();
const QuestController = require('../controllers/questController');

// POST /api/quests → create a new quest
router.post('/quests', QuestController.createQuest);

// Optional: GET /api/quests → fetch quests (supports query filters like createdBy)
router.get('/quests', QuestController.getQuests);

router.post('/user-quests', QuestController.add);
router.get('/user-quests', QuestController.mine);

module.exports = router;
