// backend/tests/routes/locationRoutes.test.js
const request = require('supertest');
const express = require('express');
const locationRoutes = require('../../routes/locationRoutes');
const LocationController = require('../../controllers/locationController');

jest.mock('../../controllers/locationController');

const app = express();
app.use(express.json());
app.use('/locations', locationRoutes);

describe('Location Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /locations/:id', () => {
    it('calls getLocationById and returns data', async () => {
      LocationController.getLocationById.mockImplementation((req, res) => res.json({ id: 'loc1' }));

      const res = await request(app).get('/locations/loc1');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'loc1' });
      expect(LocationController.getLocationById).toHaveBeenCalled();
    });
  });

  describe('GET /locations', () => {
    it('calls getLocations and returns data', async () => {
      LocationController.getLocations.mockImplementation((req, res) => res.json([{ id: 'loc1' }]));

      const res = await request(app).get('/locations');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 'loc1' }]);
      expect(LocationController.getLocations).toHaveBeenCalled();
    });
  });

  describe('POST /locations', () => {
    it('calls createLocation and returns data', async () => {
      LocationController.createLocation.mockImplementation((req, res) =>
        res.status(201).json({ id: 'loc1', name: 'New Location' })
      );

      const res = await request(app)
        .post('/locations')
        .send({ name: 'New Location' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 'loc1', name: 'New Location' });
      expect(LocationController.createLocation).toHaveBeenCalled();
    });
  });

  describe('PATCH /locations/:id', () => {
    it('calls updateLocation and returns updated data', async () => {
      LocationController.updateLocation.mockImplementation((req, res) =>
        res.json({ id: 'loc1', name: 'Updated' })
      );

      const res = await request(app)
        .patch('/locations/loc1')
        .send({ name: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: 'loc1', name: 'Updated' });
      expect(LocationController.updateLocation).toHaveBeenCalled();
    });
  });

  describe('DELETE /locations/:id', () => {
    it('calls deleteLocation and returns success', async () => {
      LocationController.deleteLocation.mockImplementation((req, res) =>
        res.status(204).send()
      );

      const res = await request(app).delete('/locations/loc1');

      expect(res.status).toBe(204);
      expect(LocationController.deleteLocation).toHaveBeenCalled();
    });
  });
});
