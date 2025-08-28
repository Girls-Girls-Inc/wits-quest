const LeaderboardModel = require("../models/leaderboardModel");

const LeaderboardController = {
  // GET /api/leaderboard?periodType=weekly&start=2025-08-01&end=2025-08-07
getLeaderboard: async (req, res) => {
    try {
        const { periodType, start, end, userId, id, } = req.query;
        const data = await LeaderboardModel.getLeaderboard(periodType, start, end, userId, id);
        res.json(data); // always return array
        } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = LeaderboardController;
