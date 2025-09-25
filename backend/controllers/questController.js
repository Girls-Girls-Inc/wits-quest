// backend/controllers/questController.js
const { createClient } = require('@supabase/supabase-js');
const QuestModel = require('../models/questModel');
const LeaderboardModel = require('../models/leaderboardModel'); // we'll call a helper below

function sbFromReq(req) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || null;
  if (!token) return null;

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

const QuestController = {
  // POST /quests
  createQuest: async (req, res) => {
    try {
      // 1) Require an authenticated user (RLS)
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      // 2) Validate input
      const questData = { ...req.body };
      if (!questData.name || !questData.collectibleId || !questData.locationId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

  
      questData.pointsAchievable = parseInt(questData.pointsAchievable, 10) || 0;
      questData.isActive = questData.isActive ?? true;
      questData.createdAt = new Date().toISOString();
      questData.createdBy = userId; // <- important for policies that check createdBy

      if (questData.quizId === '' || questData.quizId == null) {
        questData.quizId = null;
      } else if (/^\d+$/.test(`${questData.quizId}`)) {
        questData.quizId = Number(questData.quizId);
      }

      const { data, error } = await QuestModel.createQuest(questData, sb);
      if (error) return res.status(500).json({ message: error.message });

      const row = Array.isArray(data) ? data[0] : data;
      return res.status(201).json({ message: 'Quest created successfully', quest: row });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  getQuests: async (req, res) => {
    try {
      const filter = req.query || {};
      const { data, error } = await QuestModel.getQuests(filter);
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  getQuiz: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const raw = req.params.id;
      if (!raw) return res.status(400).json({ message: 'Quiz id is required' });
      const quizId = /^\d+$/.test(raw) ? Number(raw) : raw;

      const { data, error } = await QuestModel.getQuizById(quizId, sb);
      if (error) return res.status(500).json({ message: error.message });
      if (!data) return res.status(404).json({ message: 'Quiz not found' });

      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // POST /user-quests  { questId }
  add: async (req, res) => {
      try { const sb = sbFromReq(req); 
        if (!sb) return res.status(401).json({ message: 'Missing bearer token' }); 
        const who = await sb.auth.getUser(); 
        const userId = who.data?.user?.id; 
        if (!userId) return res.status(401).json({ message: 'Unauthenticated' }); 
        const { questId } = req.body || {}; 
        if (!questId) return res.status(400).json({ message: 'questId is required' }); 
        const payload = { userId, questId, step: "0", isComplete: false, }; 
        const { data, error } = await QuestModel.addForUser(payload, sb); 
        if (error) return res.status(400).json({ message: error.message }); 
        return res.status(201).json(data[0]); 
      } 
      catch (err) { 
        return res.status(500).json({ message: err.message }); 
      } 
    },

  // POST /user-quests/:id/complete
  // Body: { questId }  // server verifies points from quests table
  complete: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const userQuestId = Number(req.params.id);
      if (!userQuestId) return res.status(400).json({ message: 'Invalid userQuest id' });

      // read the row (RLS ensures user owns it)
      const { data: uq, error: uqErr } = await QuestModel.getUserQuestById(userQuestId, sb);
      if (uqErr) return res.status(400).json({ message: uqErr.message });
      if (!uq) return res.status(404).json({ message: 'userQuest not found' });
      if (uq.userId !== userId) return res.status(403).json({ message: 'Forbidden' });
      if (uq.isComplete) return res.status(409).json({ message: 'Quest already completed' });

      // verify quest + points
      const { data: quest, error: qErr } = await QuestModel.getQuestById(uq.questId, sb);
      if (qErr) return res.status(400).json({ message: qErr.message });
      if (!quest) return res.status(404).json({ message: `Quest ${uq.questId} not found` });

      const points = parseInt(quest.pointsAchievable, 10) || 0;

      // mark complete (RLS still in effect)
      const { data: upd, error: updErr } = await QuestModel.setCompleteById(userQuestId, sb);
      if (updErr) return res.status(400).json({ message: updErr.message });
      if (!upd) return res.status(409).json({ message: 'Nothing to update' });

      // Award leaderboard points (trusted write, single place to mutate leaderboard)
      // Implemented in LeaderboardModel below.
      await LeaderboardModel.addPointsAtomic({
        userId,
        points,
      });

      return res.json({ ok: true, userQuest: upd, awarded: points });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
  // GET /user-quests (list mine) 
  mine: async (req, res) => { 
    try { 
      const sb = sbFromReq(req); 
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' }); 
        const who = await sb.auth.getUser(); 
        const userId = who.data?.user?.id; 
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' }); 
        const { data, error } = await QuestModel.listForUser(userId, sb); 
          if (error) return res.status(400).json({ message: error.message }); 
            return res.json(data); 
          } 
          catch (err) { 
            return res.status(500).json({ message: err.message }); 
          } 
        },

// PUT /quests/:id
updateQuest: async (req, res) => {
  try {
    const sb = sbFromReq(req);
    if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

    const who = await sb.auth.getUser();
    const userId = who.data?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

    const raw = req.params.id;
    const questId = /^\d+$/.test(raw) ? Number(raw) : raw;
    if (!raw) return res.status(400).json({ message: 'Quest ID is invalid' });

    const questData = { ...req.body };

    // Coerce/clean fields
    if (questData.locationId === '' || questData.locationId == null) {
      questData.locationId = null;
    } else {
      const loc = Number(questData.locationId);
      questData.locationId = Number.isFinite(loc) ? loc : null;
    }

    if (questData.pointsAchievable === '' || questData.pointsAchievable == null) {
      questData.pointsAchievable = 0;
    } else {
      const pts = Number(questData.pointsAchievable);
      questData.pointsAchievable = Number.isFinite(pts) ? pts : 0;
    }

    if (Object.prototype.hasOwnProperty.call(questData, 'quizId')) {
      if (questData.quizId === '' || questData.quizId == null) {
        questData.quizId = null;
      } else if (/^\d+$/.test(`${questData.quizId}`)) {
        questData.quizId = Number(questData.quizId);
      }
    }

    const { data, error } = await QuestModel.updateQuest(questId, questData, sb);
    if (error) return res.status(500).json({ message: error.message });

    // IMPORTANT: treat "no row" as not found
    if (!data) return res.status(404).json({ message: 'Quest not found' });

    return res.json({ message: 'Quest updated successfully', quest: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
},

// DELETE /quests/:id
deleteQuest: async (req, res) => {
  try {
    const sb = sbFromReq(req);
    if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

    const who = await sb.auth.getUser();
    const userId = who.data?.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

    const raw = req.params.id;
    const questId = /^\d+$/.test(raw) ? Number(raw) : raw;
    if (!raw) return res.status(400).json({ message: 'Quest ID is required' });

    const { data, error } = await QuestModel.deleteQuest(questId, sb);
    if (error) return res.status(500).json({ message: error.message });

    if (!data) return res.status(404).json({ message: 'Quest not found' });

    return res.json({ message: 'Quest deleted successfully', quest: data });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
},
}

module.exports = QuestController;
