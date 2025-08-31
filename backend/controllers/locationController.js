// backend/controllers/locationController.js
const LocationModel = require("../models/locationModel");

// helper: coerce many possible field names -> number (no NaN)
function toNum(v) {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}

// prefer-first helper, returns first finite number or undefined
function firstFinite(...vals) {
  for (const v of vals) {
    const n = toNum(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
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
      const data = await LocationModel.createLocation(req.body);
      res.status(201).json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updateLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await LocationModel.updateLocation(id, req.body);
      res.json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteLocation: async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await LocationModel.deleteLocation(id);
      if (error) return res.status(400).json({ error: error.message });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = LocationController;
