// backend/controllers/quizController.js
const { createClient } = require('@supabase/supabase-js');
const QuizModel = require('../models/quizModel');

function sbFromReq(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;
  if (!token) return null;

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

async function isModerator(sb, userId) {
  if (!sb || !userId) return false;
  const { data, error } = await sb
    .from('userData')
    .select('isModerator')
    .eq('userId', userId)
    .maybeSingle();
  if (error) return false;
  return !!data?.isModerator;
}

const normalizeOptionsInput = (rawOptions) => {
  const normalizeOption = (opt) => String(opt ?? '').trim();
  if (Array.isArray(rawOptions)) {
    return rawOptions.map(normalizeOption).filter(Boolean);
  }
  if (typeof rawOptions === 'string') {
    return rawOptions
      .split(/\r?\n/)
      .map(normalizeOption)
      .filter(Boolean);
  }
  if (rawOptions && Array.isArray(rawOptions.options)) {
    return rawOptions.options.map(normalizeOption).filter(Boolean);
  }
  return [];
};

const QuizController = {
  // POST /quiz
  create: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const mod = await isModerator(sb, userId);
      if (!mod) return res.status(403).json({ message: 'Forbidden' });

      const payload = req.body || {};
      const questionText = String(payload.questionText ?? payload.text ?? '').trim();
      const questionType = String(payload.questionType || '').trim().toLowerCase();
      if (!questionText || !questionType) {
        return res.status(400).json({ message: 'questionText and questionType are required' });
      }
      if (!['text', 'mcq'].includes(questionType)) {
        return res.status(400).json({ message: 'Unsupported questionType' });
      }

      let options = [];
      if (questionType === 'mcq') {
        options = normalizeOptionsInput(payload.options);
        if (options.length < 2) {
          return res.status(400).json({ message: 'At least two options are required for MCQ' });
        }
      }

      const correctAnswer = String(payload.correctAnswer ?? '').trim();
      if (!correctAnswer) {
        return res.status(400).json({ message: 'correctAnswer is required' });
      }
      if (questionType === 'mcq' && !options.includes(correctAnswer)) {
        return res.status(400).json({ message: 'correctAnswer must match one of the options' });
      }

      const quizData = {
        questionText,
        questionType,
        options: questionType === 'mcq' ? options : null,
        correctAnswer,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      };

      const { data, error } = await QuizModel.create(quizData, sb);
      if (error) return res.status(500).json({ message: error.message });

      return res.status(201).json({ message: 'Quiz created successfully', quiz: data });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // GET /quizzes
  list: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const mod = await isModerator(sb, userId);
      if (!mod) return res.status(403).json({ message: 'Forbidden' });

      const { data, error } = await QuizModel.list(sb);
      if (error) return res.status(500).json({ message: error.message });

      return res.json(Array.isArray(data) ? data : []);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // PUT /quiz/:id
  update: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const mod = await isModerator(sb, userId);
      if (!mod) return res.status(403).json({ message: 'Forbidden' });

      const rawId = req.params.id;
      if (!rawId) return res.status(400).json({ message: 'Quiz id is required' });
      const quizId = /^\d+$/.test(rawId) ? Number(rawId) : rawId;

      const payload = req.body || {};
      const questionText = String(payload.questionText ?? payload.text ?? '').trim();
      const questionType = String(payload.questionType || '').trim().toLowerCase();
      if (!questionText || !questionType) {
        return res.status(400).json({ message: 'questionText and questionType are required' });
      }
      if (!['text', 'mcq'].includes(questionType)) {
        return res.status(400).json({ message: 'Unsupported questionType' });
      }

      let options = [];
      if (questionType === 'mcq') {
        options = normalizeOptionsInput(payload.options);
        if (options.length < 2) {
          return res.status(400).json({ message: 'At least two options are required for MCQ' });
        }
      }

      const correctAnswer = String(payload.correctAnswer ?? '').trim();
      if (!correctAnswer) {
        return res.status(400).json({ message: 'correctAnswer is required' });
      }
      if (questionType === 'mcq' && !options.includes(correctAnswer)) {
        return res.status(400).json({ message: 'correctAnswer must match one of the options' });
      }

      const quizData = {
        questionText,
        questionType,
        options: questionType === 'mcq' ? options : null,
        correctAnswer,
      };

      const { data, error } = await QuizModel.update(quizId, quizData, sb);
      if (error) return res.status(500).json({ message: error.message });
      if (!data) return res.status(404).json({ message: 'Quiz not found' });

      return res.json({ message: 'Quiz updated successfully', quiz: data });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // DELETE /quiz/:id
  remove: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const mod = await isModerator(sb, userId);
      if (!mod) return res.status(403).json({ message: 'Forbidden' });

      const rawId = req.params.id;
      if (!rawId) return res.status(400).json({ message: 'Quiz id is required' });
      const quizId = /^\d+$/.test(rawId) ? Number(rawId) : rawId;

      const { data, error } = await QuizModel.remove(quizId, sb);
      if (error) return res.status(500).json({ message: error.message });
      if (!data) return res.status(404).json({ message: 'Quiz not found' });

      return res.json({ message: 'Quiz deleted successfully', quiz: data });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // GET /quiz/:id
  getById: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const raw = req.params.id;
      if (!raw) return res.status(400).json({ message: 'Quiz id is required' });
      const quizId = /^\d+$/.test(raw) ? Number(raw) : raw;

      const { data, error } = await QuizModel.getById(quizId, sb);
      if (error) return res.status(500).json({ message: error.message });
      if (!data) return res.status(404).json({ message: 'Quiz not found' });

      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
};

module.exports = QuizController;

