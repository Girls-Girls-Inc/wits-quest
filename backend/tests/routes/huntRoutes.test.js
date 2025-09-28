const express = require('express');
const request = require('supertest');

// Mock HuntController with simple handlers that echo what was called
jest.mock('../../controllers/huntController', () => ({
  createHunt: jest.fn((req, res) =>
    res.status(201).json({ message: 'Hunt created', body: req.body })
  ),
  getHunts: jest.fn((req, res) =>
    res.status(200).json([{ id: 1, name: 'Mock Hunt' }])
  ),
  updateHunt: jest.fn((req, res) =>
    res.status(200).json({ message: 'Hunt updated', id: req.params.id, body: req.body })
  ),
  deleteHunt: jest.fn((req, res) =>
    res.status(200).json({ message: 'Hunt deleted', id: req.params.id })
  ),
}));

const huntRoutes = require('../../routes/huntRoutes');
const HuntController = require('../../controllers/huntController');

describe('Hunt Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', huntRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/hunts → calls createHunt', async () => {
    const payload = { name: 'Treasure', description: 'Find it', question: 'Q?', answer: 'A' };
    const res = await request(app).post('/api/hunts').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Hunt created');
    expect(HuntController.createHunt).toHaveBeenCalledTimes(1);
  });

  it('GET /api/hunts → calls getHunts', async () => {
    const res = await request(app).get('/api/hunts');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(HuntController.getHunts).toHaveBeenCalledTimes(1);
  });

  it('PUT /api/hunts/:id → calls updateHunt', async () => {
    const payload = { name: 'Updated name', timeLimit: 300 };
    const res = await request(app).put('/api/hunts/42').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hunt updated');
    expect(res.body.id).toBe('42');
    expect(HuntController.updateHunt).toHaveBeenCalledTimes(1);
  });

  it('DELETE /api/hunts/:id → calls deleteHunt', async () => {
    const res = await request(app).delete('/api/hunts/7');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hunt deleted');
    expect(res.body.id).toBe('7');
    expect(HuntController.deleteHunt).toHaveBeenCalledTimes(1);
  });
});
