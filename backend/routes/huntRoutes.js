const express = require("express");
const router = express.Router();
const HuntController = require("../controllers/huntController");

// Hunts CRUD
router.post("/hunts", HuntController.createHunt);
router.get("/hunts", HuntController.getHunts);
router.put("/hunts/:id", HuntController.updateHunt);
router.delete("/hunts/:id", HuntController.deleteHunt);
router.post("/hunts/:id/activate", HuntController.activateHunt);


// User hunts
router.get("/user-hunts", HuntController.mine);
router.get("/user-hunts/:id", HuntController.getUserHunt);

// POST to check answer
router.post("/user-hunts/:id/check", HuntController.checkAnswer);
router.post("/user-hunts/:id/complete", HuntController.complete);
router.post("/users/:id/collectibles/:collectibleId", HuntController.addCollectibleToUser);

module.exports = router;
