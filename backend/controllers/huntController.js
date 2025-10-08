const HuntModel = require("../models/huntModel");
const { sbFromReq } = require("../supabase/supabaseFromReq");

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

  // GET /user-hunts/:id
  getUserHunt: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ message: "Invalid ID" });

      const { data, error } = await sb
        .from("userHunts")
        .select(`
          id,
          userId,
          huntId,
          isActive,
          isComplete,
          startedAt,
          completedAt,
          closingAt,
          hunts (
            id,
            name,
            description,
            question,
            answer
          )
        `)
        .eq("id", id)
        .single();

      if (error) return res.status(400).json({ message: error.message });
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

  // GET /user-hunts (only active)
  mine: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const { data: who, error: authErr } = await sb.auth.getUser();
      if (authErr) return res.status(401).json({ message: authErr.message });
      const userId = who?.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthenticated" });

      const { data, error } = await sb
        .from("userHunts")
        .select(`
          id,
          userId,
          huntId,
          isActive,
          isComplete,
          startedAt,
          completedAt,
          closingAt,
          hunts (
            id,
            name,
            description,
            question,
            answer
          )
        `)
        .eq("userId", userId)
        .eq("isActive", true)
        .order("id", { ascending: true });

      if (error) return res.status(400).json({ message: error.message });

      const now = new Date();
      const activeHunts = [];

      for (const uh of data || []) {
        let isExpired = false;

        if (uh.closingAt) {
          const closing = new Date(uh.closingAt);
          if (closing < now) {
            await sb.from("userHunts").update({ isActive: false }).eq("id", uh.id);
            isExpired = true;
          }
        }

        if (isExpired) continue;

        let remainingTime = "N/A";
        if (uh.closingAt) {
          const closing = new Date(uh.closingAt);
          const diff = closing - now;
          const minutes = Math.floor(diff / 1000 / 60);
          const seconds = Math.floor((diff / 1000) % 60);
          remainingTime = `${minutes}m ${seconds}s`;
        }

        activeHunts.push({ ...uh, remainingTime });
      }

      return res.json(activeHunts);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // POST /user-hunts/:id/check
  checkAnswer: async (req, res) => {
    try {
      const userHuntId = Number(req.params.id);
      const { answer } = req.body;

      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const { data: userHunt, error } = await sb
        .from("userHunts")
        .select("id, huntId, isActive, isComplete, hunts(*)")
        .eq("id", userHuntId)
        .single();

      if (error || !userHunt) return res.status(400).json({ message: "User hunt not found" });
      if (!userHunt.isActive) return res.json({ correct: false, message: "Hunt inactive" });

      const correct =
        userHunt.hunts?.answer?.trim().toLowerCase() === answer.trim().toLowerCase();

      if (correct) {
        const now = new Date().toISOString();
        await sb
          .from("userHunts")
          .update({ isComplete: true, isActive: false, completedAt: now })
          .eq("id", userHuntId);
      }

      return res.json({ correct });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
  },
};

module.exports = HuntController;
