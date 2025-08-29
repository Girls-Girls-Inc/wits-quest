const express = require("express");
const CollectibleController = require("../controllers/collectibleController");

const router = express.Router();

router.get("/", CollectibleController.getCollectibles);
router.post("/", CollectibleController.createCollectible);
router.patch("/:id", CollectibleController.updateCollectible);
router.delete("/:id", CollectibleController.deleteCollectible);

module.exports = router;
