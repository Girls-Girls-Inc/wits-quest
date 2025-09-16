// tests/unit/controllers/location.controller.test.js

// Mock the model the controller depends on
jest.mock('../../models/locationModel', () => ({
  getLocations: jest.fn(),
  getLocationById: jest.fn(),
  createLocation: jest.fn(),
  updateLocation: jest.fn(),
  deleteLocation: jest.fn(),
}));

const LocationModel = require('../../models/locationModel');
const LocationController = require('../../controllers/locationController');

describe('LocationController', () => {
  let req, res;

  function makeRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    req = { params: {}, query: {}, body: {}, headers: {} };
    res = makeRes();
  });

  // --------------------------
  // getLocations
  // --------------------------
  describe('getLocations', () => {
    it('calls the model with id/name and normalises output fields', async () => {
      req.query = { id: '42', name: 'Campus A' };

      const sample = [
        { id: 1, name: 'A', lat: '10.5', lng: '20.25', radius: '100' },
        { id: 2, name: 'B', latitude: 11, longitude: 22, radiusMeters: 150 },
        { id: 3, name: 'C', range: 'not-a-number', distance: null }, // will normalise to 0
        { id: 4, name: 'D' }, // missing -> 0s
      ];
      LocationModel.getLocations.mockResolvedValueOnce(sample);

      await LocationController.getLocations(req, res);

      expect(LocationModel.getLocations).toHaveBeenCalledWith('42', 'Campus A');

      expect(res.json).toHaveBeenCalled();
      const payload = res.json.mock.calls[0][0];
      expect(Array.isArray(payload)).toBe(true);

      for (const item of payload) {
        expect(item).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            name: expect.any(String),
            lat: expect.any(Number),
            lng: expect.any(Number),
            radius: expect.any(Number),
          })
        );
      }

      // Check specific normalisation (0s when not finite)
      const item3 = payload.find((x) => x.id === 3);
      expect(item3.lat).toBe(0);
      expect(item3.lng).toBe(0);
      expect(item3.radius).toBe(0);

      const item4 = payload.find((x) => x.id === 4);
      expect(item4.lat).toBe(0);
      expect(item4.lng).toBe(0);
      expect(item4.radius).toBe(0);

      expect(res.status).not.toHaveBeenCalled(); // default 200
    });

    it('returns 500 and error message if model throws', async () => {
      LocationModel.getLocations.mockRejectedValueOnce(new Error('DB down'));

      await LocationController.getLocations(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
    });
  });

  // --------------------------
  // getLocationById
  // --------------------------
  describe('getLocationById', () => {
    it('returns normalised location by id', async () => {
      req.params.id = '123';
      const row = {
        id: 123,
        name: 'Main Gate',
        latitude: '12.34',
        longitude: '56.78',
        distance: '250',
      };
      LocationModel.getLocationById.mockResolvedValueOnce(row);

      await LocationController.getLocationById(req, res);

      expect(LocationModel.getLocationById).toHaveBeenCalledWith('123');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 123,
          name: 'Main Gate',
          lat: 12.34,
          lng: 56.78,
          radius: 250,
        })
      );
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 404 if not found', async () => {
      req.params.id = '999';
      LocationModel.getLocationById.mockResolvedValueOnce(null);

      await LocationController.getLocationById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Location 999 not found' });
    });

    it('returns 500 if model throws', async () => {
      req.params.id = '123';
      LocationModel.getLocationById.mockRejectedValueOnce(new Error('boom'));

      await LocationController.getLocationById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  // --------------------------
  // createLocation
  // --------------------------
  describe('createLocation', () => {
    it('requires a bearer token', async () => {
      req.headers = {}; // no Authorization
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization Bearer token' });
    });

    it('returns 400 on invalid payload', async () => {
      req.headers.authorization = 'Bearer abc';
      req.body = { name: 'x', lat: 'nope', lng: 5, radius: 10 }; // lat invalid
      await LocationController.createLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid latitude/longitude/radius' });
    });

    it('passes token and payload to model and returns 201 with created row (array unwrap)', async () => {
      req.headers.authorization = 'Bearer mytoken';
      req.body = { name: 'Lib', lat: '1.23', lng: '4.56', radius: '78' };

      const created = [{ id: 7, name: 'Lib', latitude: 1.23, longitude: 4.56, radius: 78 }];
      LocationModel.createLocation.mockResolvedValueOnce(created);

      await LocationController.createLocation(req, res);

      expect(LocationModel.createLocation).toHaveBeenCalledWith(
        { name: 'Lib', latitude: 1.23, longitude: 4.56, radius: 78 },
        { token: 'mytoken' }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created[0]);
    });

    it('returns 500 if model throws', async () => {
      req.headers.authorization = 'Bearer t';
      req.body = { name: 'X', lat: 1, lng: 2, radius: 3 };
      LocationModel.createLocation.mockRejectedValueOnce(new Error('insert failed'));

      await LocationController.createLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'insert failed' });
    });
  });

  // --------------------------
  // updateLocation
  // --------------------------
  describe('updateLocation', () => {
    beforeEach(() => {
      req.headers.authorization = 'Bearer tok';
      req.params.id = '12';
    });

    it('requires a bearer token', async () => {
      req.headers = {};
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization Bearer token' });
    });

    it('validates id is a finite number', async () => {
      req.params.id = 'abc';
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('returns 400 when no valid fields to update', async () => {
      req.body = {}; // nothing to update
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No valid fields to update' });
    });

    it('returns 400 when a field is present but invalid (e.g., bad latitude)', async () => {
      req.body = { lat: 'not-a-number' };
      await LocationController.updateLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid latitude' });
    });

    it('passes id, updates, and token to model and returns updated row (array unwrap)', async () => {
      req.body = { name: 'New Name', lat: '10', lng: '20', radius: '30' };
      const updated = [{ id: 12, name: 'New Name', latitude: 10, longitude: 20, radius: 30 }];
      LocationModel.updateLocation.mockResolvedValueOnce(updated);

      await LocationController.updateLocation(req, res);

      expect(LocationModel.updateLocation).toHaveBeenCalledWith(
        12,
        { name: 'New Name', latitude: 10, longitude: 20, radius: 30 },
        { token: 'tok' }
      );
      expect(res.json).toHaveBeenCalledWith(updated[0]);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('maps row-level security errors to 403', async () => {
      req.body = { name: 'X' };
      const err = new Error('violates row-level security policy');
      LocationModel.updateLocation.mockRejectedValueOnce(err);

      await LocationController.updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: err.message });
    });

    it('maps 404 error to 404', async () => {
      req.body = { name: 'X' };
      const err = new Error('not found');
      err.status = 404;
      LocationModel.updateLocation.mockRejectedValueOnce(err);

      await LocationController.updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Location not found' });
    });

    it('returns 400 for other thrown errors', async () => {
      req.body = { name: 'X' };
      LocationModel.updateLocation.mockRejectedValueOnce(new Error('bad request'));

      await LocationController.updateLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'bad request' });
    });
  });

  // --------------------------
  // deleteLocation
  // --------------------------
  describe('deleteLocation', () => {
    beforeEach(() => {
      req.headers.authorization = 'Bearer tok';
      req.params.id = '55';
    });

    it('requires a bearer token', async () => {
      req.headers = {};
      await LocationController.deleteLocation(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing Authorization Bearer token' });
    });

    it('passes id and token to model and returns 204 on success', async () => {
      LocationModel.deleteLocation.mockResolvedValueOnce({}); // no error
      await LocationController.deleteLocation(req, res);

      expect(LocationModel.deleteLocation).toHaveBeenCalledWith('55', { token: 'tok' });
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 400 if model returns an error object', async () => {
      LocationModel.deleteLocation.mockResolvedValueOnce({ error: new Error('cannot delete') });
      await LocationController.deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'cannot delete' });
    });

    it('returns 500 if model throws', async () => {
      LocationModel.deleteLocation.mockRejectedValueOnce(new Error('boom'));
      await LocationController.deleteLocation(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });
});
