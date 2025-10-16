const HuntModel = require("../models/huntModel");
const LeaderboardModel = require("../models/leaderboardModel");
const { sbFromReq } = require("../supabase/supabaseFromReq");

const HuntController = {
  // POST /hunts
  createHunt: async (req, res) => {
    try {
      const huntData = req.body;

      if (
        !huntData.name ||
        !huntData.description ||
        !huntData.question ||
        !huntData.answer
      ) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!huntData.collectibleId) {
        return res.status(400).json({ message: "Missing collectibleId" });
      }

      if (
        huntData.pointsAchievable === undefined ||
        huntData.pointsAchievable === null
      ) {
        return res.status(400).json({ message: "Missing pointsAchievable" });
      }

      huntData.pointsAchievable = Number(huntData.pointsAchievable);
      huntData.created_at = new Date().toISOString();
      huntData.timeLimit = huntData.timeLimit
        ? parseInt(huntData.timeLimit, 10)
        : null;

      const { data, error } = await HuntModel.createHunt(huntData);
      if (error) return res.status(500).json({ message: error.message });

      return res
        .status(201)
        .json({ message: "Hunt created successfully", hunt: data[0] });
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

  // POST /hunts/:id/activate
  activateHunt: async (req, res) => {
    try {
      const huntId = Number(req.params.id);
      if (!huntId) return res.status(400).json({ message: "Invalid hunt ID" });

      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const { data: userInfo, error: authErr } = await sb.auth.getUser();
      if (authErr) return res.status(401).json({ message: authErr.message });
      const userId = userInfo?.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthenticated" });

      const { data: hunts, error: huntErr } = await HuntModel.getHunts({ id: huntId });
      if (huntErr) return res.status(500).json({ message: huntErr.message });
      const hunt = hunts?.[0];
      if (!hunt) return res.status(404).json({ message: "Hunt not found" });

      const startedAt = new Date();
      const timeLimitMinutes = Number(hunt.timeLimit) || 0;

      let closingAt = null;
      if (timeLimitMinutes > 0) {
        closingAt = new Date(
          startedAt.getTime() + timeLimitMinutes * 60 * 1000
        ).toISOString();
      }

      const payload = {
        userId,
        huntId,
        isActive: true,
        isComplete: false,
        startedAt: startedAt.toISOString(),
        closingAt,
        completedAt: null,
      };

      const { data, error } = await sb
        .from("userHunts")
        .upsert(payload, { onConflict: ["userId", "huntId"] })
        .select();

      if (error) return res.status(400).json({ message: error.message });

      const record = Array.isArray(data) ? data[0] : data;

      return res.json({
        message: "Hunt activated successfully",
        userHunt: record,
      });
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
            answer,
            pointsAchievable,
            collectibleId
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
      if (isNaN(huntId))
        return res.status(400).json({ message: "Hunt ID is invalid" });

      let huntData = req.body;

      if (
        huntData.timeLimit !== undefined &&
        huntData.timeLimit !== null &&
        huntData.timeLimit !== ""
      ) {
        huntData.timeLimit = Number(huntData.timeLimit);
        if (isNaN(huntData.timeLimit)) huntData.timeLimit = null;
      } else {
        huntData.timeLimit = null;
      }

      if (
        huntData.pointsAchievable !== undefined &&
        huntData.pointsAchievable !== null &&
        huntData.pointsAchievable !== ""
      ) {
        huntData.pointsAchievable = Number(huntData.pointsAchievable);
        if (isNaN(huntData.pointsAchievable))
          huntData.pointsAchievable = 0;
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
      if (!huntId)
        return res.status(400).json({ message: "Hunt ID is required" });

      const { data, error } = await HuntModel.deleteHunt(huntId);
      if (error) return res.status(500).json({ message: error.message });

      return res.json({
        message: "Hunt deleted successfully",
        hunt: data[0],
      });
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
            answer,
            pointsAchievable
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
            await sb
              .from("userHunts")
              .update({ isActive: false })
              .eq("id", uh.id);
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

      if (error || !userHunt)
        return res.status(400).json({ message: "User hunt not found" });
      if (!userHunt.isActive)
        return res.json({ correct: false, message: "Hunt inactive" });

      const correct =
        userHunt.hunts?.answer?.trim().toLowerCase() ===
        answer.trim().toLowerCase();

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

  complete: async (req, res) => {
    try {
      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const who = await sb.auth.getUser();
      const userId = who.data?.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthenticated" });

      const userHuntId = Number(req.params.id);
      if (!userHuntId)
        return res.status(400).json({ message: "Invalid userHunt id" });

      const { data: uh, error: uhErr } = await HuntModel.getUserHuntById(userHuntId, sb);
      if (uhErr) return res.status(400).json({ message: uhErr.message });
      if (!uh) return res.status(404).json({ message: "userHunt not found" });
      if (uh.userId !== userId) return res.status(403).json({ message: "Forbidden" });

      const { data: hunt, error: hErr } = await HuntModel.getHuntById(uh.huntId, sb);
      if (hErr) return res.status(400).json({ message: hErr.message });

      const points = parseInt(hunt.pointsAchievable, 10) || 0;

      const { data: upd, error: updErr } = await HuntModel.setCompleteById(userHuntId, sb);
      if (updErr) return res.status(400).json({ message: updErr.message });

      await LeaderboardModel.addPointsAtomic({ userId, points });

      return res.json({ ok: true, userHunt: upd, awarded: points });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // ✅ POST /users/:id/collectibles/:collectibleId
  addCollectibleToUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const collectibleId = Number(req.params.collectibleId);

      if (!userId || !collectibleId) {
        return res.status(400).json({ message: "Missing userId or collectibleId" });
      }

      const sb = sbFromReq(req);
      if (!sb) return res.status(401).json({ message: "Missing bearer token" });

      const { data: authUser, error: authErr } = await sb.auth.getUser();
      if (authErr) return res.status(401).json({ message: authErr.message });
      if (authUser?.user?.id !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Prevent duplicates
      const { data: existing } = await sb
        .from("userInventory")
        .select("id")
        .eq("userId", userId)
        .eq("collectibleId", collectibleId)
        .maybeSingle();

      if (existing)
        return res.status(409).json({ message: "Collectible already earned" });

      const earnedAt = new Date().toISOString();
      const { data, error } = await sb
        .from("userInventory")
        .insert([{ userId, collectibleId, earnedAt }])
        .select();

      if (error) return res.status(400).json({ message: error.message });

      return res.status(201).json({
        message: "Collectible added to user inventory",
        inventoryItem: data[0],
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },
};

module.exports = HuntController;
