const express = require("express");
const LocationController = require("../controllers/locationController");

const router = express.Router();

router.get("/", LocationController.getLocations);
router.post("/", LocationController.createLocation);
router.patch("/:id", LocationController.updateLocation);
router.delete("/:id", LocationController.deleteLocation);

module.exports = router;
