// backend/tests/controllers/locationController.test.js
const LocationController = require('../../controllers/locationController');
const LocationModel = require('../../models/locationModel');

jest.mock('../../models/locationModel');

describe('LocationController', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('getLocations', () => {
    it('should return locations from model', async () => {
      LocationModel.getLocations.mockResolvedValue([{ id: 1, name: 'Cape Town' }]);
      req.query = {};
      await LocationController.getLocations(req, res);
      expect(LocationModel.getLocations).toHaveBeenCalledWith(undefined, undefined);
      expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Cape Town' }]);
    });

    it('should return empty array if model returns non-array', async () => {
      LocationModel.getLocations.mockResolvedValue(null);
      req.query = {};
      await LocationController.getLocations(req, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('should handle model errors', async () => {
      LocationModel.getLocations.mockRejectedValue(new Error('DB fail'));
      await LocationController.getLocations(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });
  });

  describe('getLocationById', () => {
    it('should return location with lat/lng normalized', async () => {
      LocationModel.getLocationById.mockResolvedValue({ id: 1, latitude: '12.34', longitude: '56.78' });
      req.params = { id: 1 };
      await LocationController.getLocationById(req, res);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        latitude: '12.34',
        longitude: '56.78',
        lat: 12.34,
        lng: 56.78,
      });
    });

    it('should return 404 if location not found', async () => {
      LocationModel.getLocationById.mockResolvedValue(null);
      req.params = { id: 99 };
      await LocationController.getLocationById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Location 99 not found' });
    });

    it('should handle model errors', async () => {
      LocationModel.getLocationById.mockRejectedValue(new Error('DB fail'));
      req.params = { id: 1 };
      await LocationController.getLocationById(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });
  });

  describe('createLocation', () => {
    it('should create a location and return first item', async () => {
      LocationModel.createLocation.mockResolvedValue([{ id: 1, name: 'New Location' }]);
      req.body = { name: 'New Location' };
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'New Location' });
    });

    it('should handle model errors', async () => {
      LocationModel.createLocation.mockRejectedValue(new Error('Insert fail'));
      req.body = {};
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Insert fail' });
    });
  });

  describe('updateLocation', () => {
    it('should update a location and return first item', async () => {
      LocationModel.updateLocation.mockResolvedValue([{ id: 1, name: 'Updated' }]);
      req.params = { id: 1 };
      req.body = { name: 'Updated' };
      await LocationController.updateLocation(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Updated' });
    });

    it('should handle model errors', async () => {
      LocationModel.updateLocation.mockRejectedValue(new Error('Update fail'));
      req.params = { id: 1 };
      req.body = {};
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Update fail' });
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location successfully', async () => {
      LocationModel.deleteLocation.mockResolvedValue({ error: null });
      req.params = { id: 1 };
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 400 if model returns error', async () => {
      LocationModel.deleteLocation.mockResolvedValue({ error: new Error('Delete fail') });
      req.params = { id: 1 };
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Delete fail' });
    });

    it('should handle unexpected errors', async () => {
      LocationModel.deleteLocation.mockRejectedValue(new Error('DB fail'));
      req.params = { id: 1 };
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });
  });
});
