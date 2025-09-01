// controllers/collectiblesController.js
const { createClient } = require('@supabase/supabase-js');
const CollectiblesModel = require('../models/collectiblesModel');

const asBigIntId = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
};

// build a per-request anon client that forwards the user's JWT
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

async function isModerator(sb, userId) {
  const { data, error } = await sb
    .from('userData')
    .select('isModerator')
    .eq('userId', userId)
    .maybeSingle();
  if (error) return false;
  return !!data?.isModerator;
}

const CollectiblesController = {
  listUserCollectibles: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const callerId = who.data?.user?.id;
      if (!callerId) return res.status(401).json({ error: 'Unauthenticated' });

      const targetUserId = String(req.params.userId);
      // Let moderators view anyone; otherwise only self
      const mod = await isModerator(sb, callerId);
      if (!mod && callerId !== targetUserId) {
        return res.status(403).json({ error: 'Not permitted' });
      }

      const limit = Math.min(Math.max(parseInt(req.query.limit ?? '100', 10), 1), 500);
      const offset = Math.max(parseInt(req.query.offset ?? '0', 10), 0);

      const rows = await CollectiblesModel.listInventoryForUser(
        targetUserId,
        { limit, offset },
        sb
      );

      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  list: async (req, res) => {
    try {
      const { search = '', limit = '50', offset = '0' } = req.query;
      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
      const result = await CollectiblesModel.list({ search, limit: parsedLimit, offset: parsedOffset });
      res.json(result.data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getOne: async (req, res) => {
    try {
      const id = asBigIntId(req.params.id);
      if (id === null) return res.status(400).json({ error: 'Invalid id' });
      const data = await CollectiblesModel.getById(id);
      res.json(data);
    } catch (err) {
      res.status(404).json({ error: 'Collectible not found' });
    }
  },

  create: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      console.log('caller uid:', who.data?.user?.id);

      const { id, name, description, imageUrl, createdAt } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: 'name is required' });
      }

      const row = {
        ...(id != null ? { id: Number(id) } : {}),
        name: String(name).trim(),
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        createdAt: createdAt ?? new Date().toISOString(),
      };

      const data = await CollectiblesModel.create(row, sb);
      res.status(201).json(data);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('row-level security')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

      const id = asBigIntId(req.params.id);
      if (id === null) return res.status(400).json({ error: 'Invalid id' });

      const allowed = ['name', 'description', 'imageUrl'];
      const updates = {};
      for (const k of allowed) if (k in req.body) updates[k] = req.body[k] ?? null;
      if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields to update' });

      const data = await CollectiblesModel.update(id, updates, sb);
      res.json(data);
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('row-level security')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  },

  remove: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

      const id = asBigIntId(req.params.id);
      if (id === null) return res.status(400).json({ error: 'Invalid id' });

      await CollectiblesModel.remove(id, sb);
      res.status(204).send();
    } catch (err) {
      if (String(err.message || '').toLowerCase().includes('row-level security')) {
        return res.status(403).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  },

  // POST /users/:userId/collectibles/:collectibleId
  // Adds (or keeps) a collectible in a user's inventory (idempotent).
  earnForUser: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

      const who = await sb.auth.getUser();
      const callerId = who.data?.user?.id;
      if (!callerId) return res.status(401).json({ error: 'Unauthenticated' });

      const userId = String(req.params.userId);
      const collectibleId = asBigIntId(req.params.collectibleId);
      if (collectibleId === null) return res.status(400).json({ error: 'Invalid collectibleId' });

      // Only the user themselves or a moderator can award into that inventory
      const mod = await isModerator(sb, callerId);
      if (!mod && callerId !== userId) {
        return res.status(403).json({ error: 'Not permitted' });
      }

      const { earnedAt } = req.body || {};
      const row = await CollectiblesModel.addToInventory(userId, collectibleId, earnedAt, sb);
      res.status(201).json(row);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // keep your simple list for dropdowns
  getCollectibles: async (req, res) => {
    try {
      const { id, name } = req.query;
      const data = await CollectiblesModel.getCollectibles(id, name);
      res.json(Array.isArray(data) ? data : []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = CollectiblesController;
