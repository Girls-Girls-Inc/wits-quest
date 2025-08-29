// backend/controllers/questController.js
const QuestModel = require('../models/questModel');

const QuestController = {
  // POST /quests
  createQuest: async (req, res) => {
    try {
      const questData = req.body;

      // Basic validation
      if (
        !questData.name ||
        !questData.collectibleId || // use lowercase to match model
        !questData.locationId ||
        !questData.createdBy
      ) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Ensure proper types
      questData.pointsAchievable = parseInt(questData.pointsAchievable, 10) || 0;
      questData.isActive = questData.isActive ?? true;
      questData.createdAt = new Date().toISOString();

      const { data, error } = await QuestModel.createQuest(questData);

      if (error) return res.status(500).json({ message: error.message });

      res.status(201).json({ message: 'Quest created successfully', quest: data[0] });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  // Optional: GET /quests?createdBy=UUID
  getQuests: async (req, res) => {
    try {
      const filter = req.query || {};
      const { data, error } = await QuestModel.getQuests(filter);

      if (error) return res.status(500).json({ message: error.message });

      res.json(data); // always return array
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = QuestController;
