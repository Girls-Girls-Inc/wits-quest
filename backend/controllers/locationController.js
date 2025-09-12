// backend/controllers/locationController.js
const LocationModel = require("../models/locationModel");

// helper: coerce many possible field names -> number (no NaN)
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

      // IMPORTANT: never send NaN in JSON (JSON.stringify turns NaN -> null)
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

      const data = await LocationModel.createLocation(payload, { token }); // <- pass token
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
