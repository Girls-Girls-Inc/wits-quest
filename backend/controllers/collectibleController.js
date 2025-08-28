const CollectibleModel = require("../models/collectibleModel");

const CollectibleController = {
  // GET /collectibles?id=&name=
  getCollectibles: async (req, res) => {
    try {
      const { id, name } = req.query;
      const data = await CollectibleModel.getCollectibles(id, name);
      res.json(Array.isArray(data) ? data : []); // always return array
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // POST /collectibles
  createCollectible: async (req, res) => {
    try {
      const data = await CollectibleModel.createCollectible(req.body);
      res.status(201).json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // PATCH /collectibles/:id
  updateCollectible: async (req, res) => {
    try {
      const { id } = req.params;
      const data = await CollectibleModel.updateCollectible(id, req.body);
      res.json(Array.isArray(data) ? data[0] : data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // DELETE /collectibles/:id
  deleteCollectible: async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await CollectibleModel.deleteCollectible(id);
      if (error) return res.status(400).json({ error: error.message });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = CollectibleController;
