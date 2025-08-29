const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const supabase = require('../supabase/supabaseClient');

// GET all users
router.get('/users', UserController.getAllUsers);

// PATCH /api/users/:userId
router.patch('/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const { isModerator } = req.body;

  try {
    const { data, error } = await supabase
      .from('userData')
      .update({ isModerator })
      .eq('userId', userId)
      .select();

    if (error) throw error;
    // always return JSON
    res.status(200).json(data[0] || { userId, isModerator });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;


