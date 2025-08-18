const express = require('express');
const { getUserEmail } = require('../controllers/user-controller');

const router = express.Router();

router.get('/user/:email', getUserEmail);

module.exports = {
    routes: router
}