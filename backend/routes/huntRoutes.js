const express = require("express");
const router = express.Router();
const HuntController = require("../controllers/huntController");

// Hunts CRUD
router.post("/hunts", HuntController.createHunt);
router.get("/hunts", HuntController.getHunts);
router.put("/hunts/:id", HuntController.updateHunt);
router.delete("/hunts/:id", HuntController.deleteHunt);


// User hunts
router.get("/user-hunts", HuntController.mine);

// GET /user-hunts/:id  -> fetch a single user-hunt
router.get("/user-hunts/:id", async (req, res) => {
  try {
    const sb = require("../supabase/supabaseFromReq").sbFromReq(req);
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
});


module.exports = router;
