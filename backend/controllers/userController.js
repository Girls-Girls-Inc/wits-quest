// backend/controllers/userController.js
const UserModel = require('../models/userModel');

const UserController = {
  // GET /users?userId=...&email=...&isModerator=true&createdBefore=...&createdAfter=...
  getAllUsers: async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const users = await UserModel.getAllUsers(token);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // MISSING: GET /users/:id  (needed for your role check)
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await UserModel.getById(id); // implement in model below
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  patchUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { isModerator } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      const updated = await UserModel.updateById(id, { isModerator }, token);

      res.json(updated || { userId: id, isModerator });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = UserController;
