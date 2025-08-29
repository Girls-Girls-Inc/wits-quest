// routes/collectibles.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectiblesController');

router.get('/users/:userId/collectibles', ctrl.listUserCollectibles);
router.get('/collectibles',               ctrl.list);   // reads req.query.board (year|month|week)
router.get('/collectibles/:id',           ctrl.getOne);
router.post('/collectibles',              ctrl.create);
router.patch('/collectibles/:id',         ctrl.update);
router.delete('/collectibles/:id',        ctrl.remove);

module.exports = router;