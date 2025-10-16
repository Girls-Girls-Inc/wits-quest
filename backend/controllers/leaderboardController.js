// backend/controllers/leaderboardController.js
const LeaderboardModel = require("../models/leaderboardModel");

const LeaderboardController = {
  getLeaderboard: async (req, res) => {
    try {
      const { id, userId } = req.query;
      const data = await LeaderboardModel.getLeaderboard(id, userId);
      res.json(data);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      res.status(500).json({ error: err.message });
    }
  },

};

module.exports = LeaderboardController;

