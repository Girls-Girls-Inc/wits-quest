const UserModel = require('../models/userModel');

const UserController = {
  // GET /api/users?userId=...&email=...&isModerator=true
  getAllUsers: async (req, res) => {
    try {
      const { userId, email, isModerator, createdBefore, createdAfter } = req.query;
      const users = await UserModel.getAllUsers({ userId, email, isModerator, createdBefore, createdAfter });
      res.json(users); // always return array
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = UserController;
