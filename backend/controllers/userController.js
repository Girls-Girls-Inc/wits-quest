// backend/controllers/userController.js
const UserModel = require('../models/userModel');

const UserController = {
  // GET /users?userId=...&email=...&isModerator=true&createdBefore=...&createdAfter=...
  getAllUsers: async (req, res) => {
    try {
      const { userId, email, isModerator, createdBefore, createdAfter } = req.query;

      // Cast isModerator query param to boolean if provided
      let modFlag;
      if (typeof isModerator !== 'undefined') {
        const v = String(isModerator).toLowerCase().trim();
        if (['true', '1', 't', 'yes', 'y'].includes(v)) modFlag = true;
        else if (['false', '0', 'f', 'no', 'n'].includes(v)) modFlag = false;
        else modFlag = undefined; // ignore if malformed
      }

      // Validate dates
      const cb = createdBefore && !isNaN(Date.parse(createdBefore)) ? new Date(createdBefore).toISOString() : undefined;
      const ca = createdAfter && !isNaN(Date.parse(createdAfter)) ? new Date(createdAfter).toISOString() : undefined;

      const users = await UserModel.getAllUsers({
        userId,
        email,
        isModerator: modFlag,
        createdBefore: cb,
        createdAfter: ca,
      });

      res.json(users); // always array
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

  // OPTIONAL: PATCH /users/:id (move logic here instead of inline in route)
  patchUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { isModerator } = req.body;
      const updated = await UserModel.updateById(id, { isModerator });
      res.json(updated || { userId: id, isModerator });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
};

module.exports = UserController;
