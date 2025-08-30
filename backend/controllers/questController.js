// backend/controllers/questController.js
const { createClient } = require('@supabase/supabase-js');
const QuestModel = require('../models/questModel');

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

      // Public/admin reads/writes for quests (adjust to your policy);
      // if you want RLS on create, you can also pass sbFromReq(req)
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
  add: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: 'Unauthenticated' });

      const { questId } = req.body || {};
      if (!questId) return res.status(400).json({ message: 'questId is required' });

      // Add defaults for new quests
      const payload = {
        userId,
        questId,
        step: "0",           // default step
        isComplete: false,   // default incomplete
      };

      const { data, error } = await QuestModel.addForUser(payload, sb);
      if (error) return res.status(400).json({ message: error.message });

      return res.status(201).json(data[0]);
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
};

module.exports = QuestController;
