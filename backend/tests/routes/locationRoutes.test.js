// backend/tests/routes/locationRoutes.test.js
const request = require('supertest');
const express = require('express');
const locationRoutes = require('../../routes/locationRoutes');
const LocationController = require('../../controllers/locationController');

jest.mock('../../controllers/locationController');

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/locations', locationRoutes);
  return app;
};

describe('Location Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = makeApp();
  });

  // -----------------------------
  // GET /locations/:id
  // -----------------------------
  describe('GET /locations/:id', () => {
    it('calls getLocationById and returns data', async () => {
      LocationController.getLocationById.mockImplementation((req, res) =>
        res.json({ id: req.params.id })
      );

      const res = await request(app).get('/locations/loc1');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'loc1' });
      expect(LocationController.getLocationById).toHaveBeenCalledTimes(1);
      // Ensure param is forwarded
      const [reqArg] = LocationController.getLocationById.mock.calls[0];
      expect(reqArg.params.id).toBe('loc1');
    });

    it('propagates controller error status (e.g., 404)', async () => {
      LocationController.getLocationById.mockImplementation((req, res) =>
        res.status(404).json({ error: 'not found' })
      );

      const res = await request(app).get('/locations/missing');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'not found' });
    });
  });

  // -----------------------------
  // GET /locations
  // -----------------------------
  describe('GET /locations', () => {
    it('calls getLocations and returns data', async () => {
      LocationController.getLocations.mockImplementation((req, res) =>
        res.json([{ id: 'loc1' }])
      );

      const res = await request(app).get('/locations');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'loc1' }]);
      expect(LocationController.getLocations).toHaveBeenCalledTimes(1);
    });

    it('forwards query params to controller', async () => {
      LocationController.getLocations.mockImplementation((req, res) =>
        res.json([{ ok: true }])
      );

      const res = await request(app)
        .get('/locations')
        .query({ id: '42', name: 'Campus' });

      expect(res.status).toBe(200);
      const [reqArg] = LocationController.getLocations.mock.calls[0];
      expect(reqArg.query).toEqual({ id: '42', name: 'Campus' });
    });
  });

  // -----------------------------
  // POST /locations
  // -----------------------------
  describe('POST /locations', () => {
    it('calls createLocation and returns data', async () => {
      LocationController.createLocation.mockImplementation((req, res) =>
        res.status(201).json({ id: 'loc1', name: req.body.name })
      );

      const res = await request(app)
        .post('/locations')
        .set('Authorization', 'Bearer abc')
        .send({ name: 'New Location' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'loc1', name: 'New Location' });
      expect(LocationController.createLocation).toHaveBeenCalledTimes(1);

      // Ensure auth header & body are forwarded
      const [reqArg] = LocationController.createLocation.mock.calls[0];
      expect(reqArg.headers.authorization).toBe('Bearer abc');
      expect(reqArg.body).toEqual({ name: 'New Location' });
    });

    it('propagates controller-set 401 when missing/invalid auth', async () => {
      LocationController.createLocation.mockImplementation((req, res) =>
        res.status(401).json({ error: 'Missing Authorization Bearer token' })
      );

      const res = await request(app).post('/locations').send({ name: 'X' });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Missing Authorization Bearer token' });
    });
  });

  // -----------------------------
  // PATCH /locations/:id
  // -----------------------------
  describe('PATCH /locations/:id', () => {
    it('calls updateLocation and returns updated data', async () => {
      LocationController.updateLocation.mockImplementation((req, res) =>
        res.json({ id: req.params.id, name: req.body.name })
      );

      const res = await request(app)
        .patch('/locations/loc1')
        .set('Authorization', 'Bearer tok')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'loc1', name: 'Updated' });
      expect(LocationController.updateLocation).toHaveBeenCalledTimes(1);

      const [reqArg] = LocationController.updateLocation.mock.calls[0];
      expect(reqArg.params.id).toBe('loc1');
      expect(reqArg.headers.authorization).toBe('Bearer tok');
      expect(reqArg.body).toEqual({ name: 'Updated' });
    });

    it('propagates controller 404 and message', async () => {
      LocationController.updateLocation.mockImplementation((req, res) =>
        res.status(404).json({ error: 'Location not found' })
      );

      const res = await request(app)
        .patch('/locations/does-not-exist')
        .set('Authorization', 'Bearer tok')
        .send({ name: 'X' });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Location not found' });
    });
  });

  // -----------------------------
  // DELETE /locations/:id
  // -----------------------------
  describe('DELETE /locations/:id', () => {
    it('calls deleteLocation and returns 204', async () => {
      LocationController.deleteLocation.mockImplementation((req, res) =>
        res.status(204).send()
      );

      const res = await request(app)
        .delete('/locations/loc1')
        .set('Authorization', 'Bearer tok');

      expect(res.status).toBe(204);
      expect(LocationController.deleteLocation).toHaveBeenCalledTimes(1);

      const [reqArg] = LocationController.deleteLocation.mock.calls[0];
      expect(reqArg.params.id).toBe('loc1');
      expect(reqArg.headers.authorization).toBe('Bearer tok');
    });

    it('propagates controller 400 error', async () => {
      LocationController.deleteLocation.mockImplementation((req, res) =>
        res.status(400).json({ error: 'cannot delete' })
      );

      const res = await request(app)
        .delete('/locations/loc1')
        .set('Authorization', 'Bearer tok');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'cannot delete' });
    });
  });
});
