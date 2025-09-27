// backend/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const QuizController = require('../controllers/quizController');

router.post('/quiz', QuizController.create);
router.get('/quizzes', QuizController.list);
router.get('/quiz/:id', QuizController.getById);
router.put('/quiz/:id', QuizController.update);
router.delete('/quiz/:id', QuizController.remove);

module.exports = router;
