const express = require('express');
const { getUserEmail } = require('../controllers/user-controller');

const router = express.Router();

router.post('/user/email', getUserEmail);

module.exports = {
    routes: router
}