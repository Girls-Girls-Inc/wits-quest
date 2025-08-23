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

  // POST /api/leaderboard
  // createEntry: async (req, res) => {
  //   try {
  //     const { user_id, period_type, period_start, period_end, score, rank } = req.body;
  //     const { data, error } = await LeaderboardModel.addEntry({
  //       user_id, period_type, period_start, period_end, score, rank
  //     });
  //     if (error) return res.status(400).json({ error: error.message });
  //     res.status(201).json(data);
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  // PATCH /api/leaderboard/:id
  // updateScore: async (req, res) => {
  //   try {
  //     const { id } = req.params;
  //     const { score, rank } = req.body;
  //     const { data, error } = await LeaderboardModel.updateScore(id, score, rank);
  //     if (error) return res.status(400).json({ error: error.message });
  //     res.json(data);
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // },

  // DELETE /api/leaderboard/:id
//   deleteEntry: async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { error } = await LeaderboardModel.deleteEntry(id);
//       if (error) return res.status(400).json({ error: error.message });
//       res.status(204).send();
//     } catch (err) {
//       res.status(500).json({ error: err.message });
//     }
//   }
};

module.exports = LeaderboardController;
