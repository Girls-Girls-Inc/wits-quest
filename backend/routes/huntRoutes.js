const express = require("express");
const router = express.Router();
const HuntController = require("../controllers/huntController");

// Hunts CRUD
router.post("/hunts", HuntController.createHunt);
router.get("/hunts", HuntController.getHunts);
router.put("/hunts/:id", HuntController.updateHunt);
router.delete("/hunts/:id", HuntController.deleteHunt);

module.exports = router;
