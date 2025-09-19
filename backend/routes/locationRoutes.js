const express = require("express");
const LocationController = require("../controllers/locationController");

const router = express.Router();

router.post('/thrift/import', LocationController.importThriftToDb);
router.get('/', LocationController.getLocations);
router.get('/:id', LocationController.getLocationById); 
router.post('/', LocationController.createLocation); 
router.patch('/:id', LocationController.updateLocation); 
router.delete('/:id', LocationController.deleteLocation);

module.exports = router;
