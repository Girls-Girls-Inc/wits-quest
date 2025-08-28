// routes/collectibles.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/collectiblesController');

router.get('/collectibles',        ctrl.list);      // GET many  (?search=&limit=&offset=)
router.get('/collectibles/:id',    ctrl.getOne);    // GET one
router.post('/collectibles',       ctrl.create);    // CREATE
router.patch('/collectibles/:id',  ctrl.update);    // UPDATE
router.delete('/collectibles/:id', ctrl.remove);    // DELETE

module.exports = router;