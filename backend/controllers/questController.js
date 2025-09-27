// backend/controllers/questController.js
const { createClient } = require('@supabase/supabase-js');
const QuestModel = require('../models/questModel');
const LeaderboardModel = require('../models/leaderboardModel'); // we'll call a helper below
const HuntModel = require("../models/huntModel");

// Build a per-request client that forwards the user's JWT.
// IMPORTANT: use the ANON key so RLS applies.
function sbFromReq(req) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
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
      const questData = req.body;

      if (
        !questData.name ||
        !questData.collectibleId ||
        !questData.locationId ||
        !questData.createdBy
      ) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      questData.pointsAchievable = parseInt(questData.pointsAchievable, 10) || 0;
      questData.isActive = questData.isActive ?? true;
      questData.createdAt = new Date().toISOString();

      const { data, error } = await QuestModel.createQuest(questData);
      if (error) return res.status(500).json({ message: error.message });

      return res.status(201).json({ message: 'Quest created successfully', quest: data[0] });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // GET /quests?createdBy=UUID
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

  // POST /user-quests  { questId }
// POST /user-quests  { questId }
add: async (req, res) => {
  try {
    const sb = sbFromReq(req);
    if (!sb) return res.status(401).json({ message: "Missing bearer token" });

    const who = await sb.auth.getUser();
    const userId = who.data?.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthenticated" });

    const { questId } = req.body || {};
    if (!questId) return res.status(400).json({ message: "questId is required" });

    // --- Step 1: add quest to userQuests
    const questPayload = {
      userId,
      questId,
      step: "0",
      isComplete: false,
    };
    const { data: uq, error: uqErr } = await QuestModel.addForUser(questPayload, sb);
    if (uqErr) return res.status(400).json({ message: uqErr.message });

    // --- Step 2: lookup quest → huntId
    const { data: questRow, error: qErr } = await QuestModel.getQuestById(questId, sb);
    if (qErr) return res.status(400).json({ message: qErr.message });

    if (questRow && questRow.huntId) {
      // fetch hunt to get timeLimit
      const { data: huntRow, error: hErr } = await QuestModel.getHuntById(questRow.huntId, sb);
      if (hErr) return res.status(400).json({ message: hErr.message });

      const now = new Date().toISOString();
      const userHuntPayload = {
        userId,
        huntId: questRow.huntId,
        isActive: false, // still inactive
        timeLimit: huntRow?.timeLimit || null,
      };
      await HuntModel.addForUser(userHuntPayload, sb);
    }

    return res.status(201).json(uq[0]);
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
    } catch (err) {
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

// PUT /quests/:id
updateQuest: async (req, res) => {
  try {
    const questId = Number(req.params.id); // ensure questId is number
    if (isNaN(questId)) return res.status(400).json({ message: "Quest ID is invalid" });

    let questData = req.body;

    // Safely convert optional numeric fields
    if (questData.locationId !== undefined && questData.locationId !== null && questData.locationId !== "") {
      questData.locationId = Number(questData.locationId);
      if (isNaN(questData.locationId)) questData.locationId = null;
    } else {
      questData.locationId = null;
    }

    if (questData.pointsAchievable !== undefined && questData.pointsAchievable !== null && questData.pointsAchievable !== "") {
      questData.pointsAchievable = Number(questData.pointsAchievable);
      if (isNaN(questData.pointsAchievable)) questData.pointsAchievable = 0;
    } else {
      questData.pointsAchievable = 0;
    }

    const { data, error } = await QuestModel.updateQuest(questId, questData);
    if (error) return res.status(500).json({ message: error.message });

    return res.json({ message: "Quest updated successfully", quest: data[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
},



// DELETE /quests/:id
deleteQuest: async (req, res) => {
  try {
    const questId = req.params.id;

    if (!questId) return res.status(400).json({ message: "Quest ID is required" });

    const { data, error } = await QuestModel.deleteQuest(questId);
    if (error) return res.status(500).json({ message: error.message });

    return res.json({ message: "Quest deleted successfully", quest: data[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
},

};

module.exports = QuestController;
