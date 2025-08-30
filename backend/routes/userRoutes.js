// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');

// List (usually moderator-only)
router.get('/users', /* requireAuth, requireModerator, */ UserController.getAllUsers);

// Get by id (auth — used by role watcher)
router.get('/users/:id', /* requireAuth, */ UserController.getUserById);

// Update by id (auth; requireModerator if only admins can toggle)
router.patch('/users/:id', /* requireAuth, requireModerator, */ UserController.patchUser);

module.exports = router;
