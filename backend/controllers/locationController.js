const LocationModel = require("../models/locationModel");

const LocationController = {
  getLocations: async (req, res) => {
    try {
      const { id, name } = req.query;
      const data = await LocationModel.getLocations(id, name);
      res.json(Array.isArray(data) ? data : []);
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
