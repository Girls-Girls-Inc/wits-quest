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

  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

const CollectiblesController = {
  // READS can use service-role model (public listing), or pass sbFromReq(req) if you want RLS on reads too
  list: async (req, res) => {
    try {
      const { search = '', limit = '50', offset = '0' } = req.query;
      const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
      const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);
      const result = await CollectiblesModel.list({ search, limit: parsedLimit, offset: parsedOffset });
      res.json(result);
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

  // CREATE must respect RLS -> use anon client with user's JWT
// CREATE must respect RLS -> use anon client with user's JWT
create: async (req, res) => {
  try {
    const sb = sbFromReq(req);
    if (!sb) return res.status(401).json({ error: 'Missing bearer token' });

    // (optional) prove the JWT is being forwarded
    const who = await sb.auth.getUser();
    console.log('caller uid:', who.data?.user?.id);

    // pull fields from the request body
    const { id, name, description, imageUrl, createdAt } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    // IMPORTANT: keys must match your camelCase columns ("imageUrl", "createdAt")
    const row = {
      // include id only if you assign it yourself (your table uses BIGINT)
      ...(id != null ? { id: Number(id) } : {}),
      name: String(name).trim(),
      description: description ?? null,
      imageUrl: imageUrl ?? null,
      createdAt: createdAt ?? new Date().toISOString(),
    };

    const data = await CollectiblesModel.create(row, sb); // model must use the passed sb
    res.status(201).json(data);
  } catch (err) {
    if (String(err.message || '').toLowerCase().includes('row-level security')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
},

  // UPDATE via RLS (moderators only, per your policy)
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

  // DELETE via RLS (moderators only)
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
};

module.exports = CollectiblesController;