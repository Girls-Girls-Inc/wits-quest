const HuntModel = require("../models/huntModel");

const HuntController = {
  // POST /hunts
  createHunt: async (req, res) => {
    try {
      const huntData = req.body;

      if (!huntData.name || !huntData.description || !huntData.question || !huntData.answer) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      huntData.created_at = new Date().toISOString();
      huntData.timeLimit = huntData.timeLimit ? parseInt(huntData.timeLimit, 10) : null;

      const { data, error } = await HuntModel.createHunt(huntData);
      if (error) return res.status(500).json({ message: error.message });

      return res.status(201).json({ message: "Hunt created successfully", hunt: data[0] });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // GET /hunts
  getHunts: async (req, res) => {
    try {
      const filter = req.query || {};
      const { data, error } = await HuntModel.getHunts(filter);
      if (error) return res.status(500).json({ message: error.message });

      return res.json(data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // PUT /hunts/:id
  updateHunt: async (req, res) => {
    try {
      const huntId = Number(req.params.id);
      if (isNaN(huntId)) return res.status(400).json({ message: "Hunt ID is invalid" });

      let huntData = req.body;
      if (huntData.timeLimit !== undefined && huntData.timeLimit !== null && huntData.timeLimit !== "") {
        huntData.timeLimit = Number(huntData.timeLimit);
        if (isNaN(huntData.timeLimit)) huntData.timeLimit = null;
      } else {
        huntData.timeLimit = null;
      }

      const { data, error } = await HuntModel.updateHunt(huntId, huntData);
      if (error) return res.status(500).json({ message: error.message });

      return res.json({ message: "Hunt updated successfully", hunt: data[0] });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // DELETE /hunts/:id
  deleteHunt: async (req, res) => {
    try {
      const huntId = Number(req.params.id);
      if (!huntId) return res.status(400).json({ message: "Hunt ID is required" });

      const { data, error } = await HuntModel.deleteHunt(huntId);
      if (error) return res.status(500).json({ message: error.message });

      return res.json({ message: "Hunt deleted successfully", hunt: data[0] });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
};

module.exports = HuntController;
