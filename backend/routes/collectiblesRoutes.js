// routes/collectiblesRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectiblesController');

// Inventory listing for a user (self or moderator)
router.get('/users/:userId/collectibles', ctrl.listUserCollectibles);

// Earn/add a collectible for a user (self or moderator); idempotent
router.post('/users/:userId/collectibles/:collectibleId', ctrl.earnForUser);

// Collectibles catalogue (CRUD)
router.get('/collectibles', ctrl.list);
router.get('/collectibles/:id', ctrl.getOne);
router.post('/collectibles', ctrl.create);
router.patch('/collectibles/:id', ctrl.update);
router.delete('/collectibles/:id', ctrl.remove);

module.exports = router;
