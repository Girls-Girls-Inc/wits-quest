const LocationModel = require("../models/locationModel");

const { createClient } = require('@supabase/supabase-js');

function supaUser(token) {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

const THRIFT_API_BASE = process.env.THRIFT_API_BASE
const CREATED_BY = process.env.SYSTEM_USER_ID

const DEFAULT_COLLECTIBLE = 1;
const DEFAULT_POINTS = 75;
const DEFAULT_HUNT_ID = 1;
const DEFAULT_RADIUS = 50;
const DEDUPE_METERS = 50;
const FETCH_TIMEOUT_MS = 1000000000;

let lastThriftSync = 0;
let thriftSyncInflight = false;
const THRIFT_TTL_MS = 5 * 60 * 1000;

function toRad(x) { return (x * Math.PI) / 180; }
function metersBetween(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2), sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function fetchThriftStores({ signal } = {}) {
  const res = await fetch(`${THRIFT_API_BASE}/external/stores`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) throw new Error(`Thrift API HTTP ${res.status}`);
  return res.json();
}

function toLocationRowFromThrift(store, radius = DEFAULT_RADIUS) {
  const lat = Number(store?.location?.lat);
  const lng = Number(store?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    name: store.storeName,
    latitude: lat,
    longitude: lng,
    radius: Number.isFinite(radius) ? radius : DEFAULT_RADIUS,
  };
}

async function ensureQuestForLocation(supabase, { locationId, name, description }) {
  const { data: existing, error: selErr } = await supabase
    .from('quests')
    .select('id')
    .eq('location_id', locationId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return { id: existing.id, created: false };

  const row = {
    created_at: new Date().toISOString(),
    name,
    description,
    collectible: DEFAULT_COLLECTIBLE,
    created_by: CREATED_BY,
    location_id: locationId,
    points: DEFAULT_POINTS,
    is_active: true,
    hunt_id: DEFAULT_HUNT_ID,
  };
  const { data, error } = await supabase
    .from('quests')
    .insert([row])
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id, created: true };
}

async function findExistingLocation(supabase, name, lat, lng) {
  const { data, error } = await supabase
    .from('locations')
    .select('id,name,latitude,longitude')
    .ilike('name', `%${name}%`)
    .limit(50);
  if (error) throw error;

  for (const row of data || []) {
    const here = { lat: Number(row.latitude), lng: Number(row.longitude) };
    if (!Number.isFinite(here.lat) || !Number.isFinite(here.lng)) continue;
    const d = metersBetween({ lat, lng }, here);
    if (d <= DEDUPE_METERS) return row;
  }
  return null;
}

async function createQuestForLocation(supabase, { locationId, name, description }) {
  const row = {
    createdAt: new Date().toISOString(),
    name,
    description,
    collectibleId: DEFAULT_COLLECTIBLE,
    createdBy: CREATED_BY,
    locationId: locationId,
    pointsAchievable: DEFAULT_POINTS,
    isActive: true,
    huntId: DEFAULT_HUNT_ID,
  };
  const { data, error } = await supabase
    .from('quests')
    .insert([row])
    .select('id')
    .single();
  if (error) throw error;
  return data;
}


function toNum(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

function firstFinite(...vals) {
  for (const v of vals) {
    const n = toNum(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function withTimeout(promise, ms, controller) {
  const t = setTimeout(() => controller.abort(), ms);
  return promise.finally(() => clearTimeout(t));
}


function buildLocationPayload(body) {
  const name = body.name ?? body.title ?? '';
  const latitude  = firstFinite(body.lat, body.latitude);
  const longitude = firstFinite(body.lng, body.longitude, body.lon);
  const radius    = firstFinite(body.radius, body.radiusMeters, body.range, body.distance);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius)) {
    return { error: 'Invalid latitude/longitude/radius' };
  }
  return { name, latitude, longitude, radius };
}

function buildLocationUpdates(body) {
  const updates = {};

  if ('name' in body || 'title' in body) {
    const name = (body.name ?? body.title ?? '').toString().trim();
    if (!name) throw new Error('Invalid name');
    updates.name = name;
  }

  if ('lat' in body || 'latitude' in body) {
    const latitude = firstFinite(body.lat, body.latitude);
    if (!Number.isFinite(latitude)) throw new Error('Invalid latitude');
    updates.latitude = latitude;
  }

  if ('lng' in body || 'longitude' in body || 'lon' in body) {
    const longitude = firstFinite(body.lng, body.longitude, body.lon);
    if (!Number.isFinite(longitude)) throw new Error('Invalid longitude');
    updates.longitude = longitude;
  }

  if ('radius' in body || 'radiusMeters' in body || 'range' in body || 'distance' in body) {
    const radius = firstFinite(body.radius, body.radiusMeters, body.range, body.distance);
    if (!Number.isFinite(radius)) throw new Error('Invalid radius');
    updates.radius = radius;
  }

  return updates;
}

const LocationController = {

  importThriftToDb: async (req, res) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });
    const supabaseUser = supaUser(token); 
    const defaultRadius = Number(req.query.defaultRadius) || DEFAULT_RADIUS;
    const alsoCreateQuests = String(req.query.createQuests || 'true') === 'true'; // default true
    const dryRun = String(req.query.dryRun ?? 'false') === 'true';

    const controller = new AbortController();
    const syncIfStale = String(req.query.syncIfStale ?? 'true') === 'true';
  const now = Date.now();

    if (syncIfStale) {
      if (now - lastThriftSync < THRIFT_TTL_MS) {
        return res.json({ ok: true, skipped: 'fresh', lastSync: lastThriftSync });
      }
      if (thriftSyncInflight) {
        return res.json({ ok: true, skipped: 'inflight', lastSync: lastThriftSync });
      }
    }

    thriftSyncInflight = true;
    try {
      let stores = await withTimeout(
       fetchThriftStores({ signal: controller.signal }),
       FETCH_TIMEOUT_MS,
       controller
     );

      const needle = (req.query.name || req.query.q || '').toLowerCase();
      if (needle) {
        stores = stores.filter(
          s =>
            s.storeName?.toLowerCase().includes(needle) ||
            s.address?.toLowerCase().includes(needle)
        );
      }

      if (dryRun) {
       const preview = stores.slice(0, 5).map(s => toLocationRowFromThrift(s, defaultRadius));
       return res.json({ ok: true, dryRun: true, storesProcessed: stores.length, sampleLocations: preview });
     }

      let createdLocations = 0;
      let skippedExisting = 0;
      let questsCreated = 0;

      for (const s of stores) {
        const loc = toLocationRowFromThrift(s, defaultRadius);
        if (!loc) continue;

        const existing = await findExistingLocation(supabaseUser, loc.name, loc.latitude, loc.longitude);
        let locationId;

        if (existing) {
          skippedExisting += 1;
          locationId = existing.id;
        } else {
          const inserted = await LocationModel.createLocation(loc, { token });
          createdLocations += 1;
          locationId = inserted.id;
        }

        if (alsoCreateQuests) {
          const questName = `${loc.name} Thrift Quest`;
          const lines = [];
          if (s.description) lines.push(s.description);
          if (s.address) lines.push(s.address);
          const questDesc = lines.join(' — ') || 'Explore this thrift location!';
          await createQuestForLocation(supabaseUser, {
            locationId,
            name: questName,
            description: questDesc,
          });
          questsCreated += 1;
          const { created } = await ensureQuestForLocation(supabaseUser, {
          locationId,
          name: questName,
          description: questDesc,
        });
        if (created) questsCreated += 1;
        }
      }

    lastThriftSync = Date.now();
    return res.json({ ok: true,  storesProcessed: stores.length, createdLocations, skippedExisting, questsCreated: alsoCreateQuests ? questsCreated : 0, lastSync: lastThriftSync });
  } catch (err) {
    return res.status(err.name === 'AbortError' ? 504 : 500).json({ error: err.message });
  } finally {
    thriftSyncInflight = false;
  }
  },


  getLocations: async (req, res) => {
    try {
      const { id, name } = req.query;
      const data = await LocationModel.getLocations(id, name);

      const normalised = (Array.isArray(data) ? data : []).map((row) => {
        const lat = firstFinite(row.lat, row.latitude);
        const lng = firstFinite(row.lng, row.longitude);
        const radius = firstFinite(row.radius, row.radiusMeters, row.range, row.distance);

        return {
          ...row,
          lat: Number.isFinite(lat) ? lat : 0,
          lng: Number.isFinite(lng) ? lng : 0,
          radius: Number.isFinite(radius) ? radius : 0,
        };
      });

      res.json(normalised);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getLocationById: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await LocationModel.getLocationById(id);
      if (!data) return res.status(404).json({ error: `Location ${id} not found` });

      const lat = firstFinite(data.lat, data.latitude);
      const lng = firstFinite(data.lng, data.longitude);
      const radius = firstFinite(
        data.radius,
        data.radiusMeters,
        data.range,
        data.distance
      );

      res.json({
        ...data,
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        radius: Number.isFinite(radius) ? radius : 0,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createLocation: async (req, res) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

      const payload = buildLocationPayload(req.body);
      if (payload.error) return res.status(400).json({ error: payload.error });

      const data = await LocationModel.createLocation(payload, { token });
      res.status(201).json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

 updateLocation: async (req, res) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

      const updates = buildLocationUpdates(req.body);
      if (!Object.keys(updates).length) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const data = await LocationModel.updateLocation(id, updates, { token });
      // model should use .maybeSingle() and 404 if not found
      res.json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      const msg = String(err.message || '');
      if (msg.toLowerCase().includes('row-level security')) {
        return res.status(403).json({ error: err.message });
      }
      if (err.status === 404) {
        return res.status(404).json({ error: 'Location not found' });
      }
      res.status(400).json({ error: err.message });
    }
  },

  deleteLocation: async (req, res) => {
    try {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

      const { id } = req.params;
      const { error } = await LocationModel.deleteLocation(id, { token }); // <- pass token
      if (error) return res.status(400).json({ error: error.message });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = LocationController;
