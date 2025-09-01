// backend/tests/routes/questRoutes.test.js
const express = require('express');
const request = require('supertest');

// Mock QuestController
jest.mock('../../controllers/questController', () => ({
  createQuest: jest.fn((req, res) =>
    res.status(201).json({ message: 'Quest created', body: req.body })
  ),
  getQuests: jest.fn((req, res) =>
    res.status(200).json([{ id: 1, title: 'Mock Quest' }])
  ),
  updateQuest: jest.fn((req, res) =>
    res.status(200).json({ message: 'Quest updated', id: req.params.id, body: req.body })
  ),
  deleteQuest: jest.fn((req, res) =>
    res.status(200).json({ message: 'Quest deleted', id: req.params.id })
  ),
  add: jest.fn((req, res) =>
    res.status(201).json({ message: 'User quest added', body: req.body })
  ),
  mine: jest.fn((req, res) =>
    res.status(200).json([{ id: 1, userId: 'mock-user', questId: 1 }])
  ),
  complete: jest.fn((req, res) =>
    res.status(200).json({ message: 'Quest completed', id: req.params.id })
  ),
}));

const questRoutes = require('../../routes/questRoutes');
const QuestController = require('../../controllers/questController');

describe('Quest Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', questRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/quests → should call createQuest', async () => {
    const payload = { title: 'New Quest', description: 'Test quest' };
    const res = await request(app).post('/api/quests').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Quest created');
    expect(QuestController.createQuest).toHaveBeenCalled();
  });

  it('GET /api/quests → should call getQuests', async () => {
    const res = await request(app).get('/api/quests');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(QuestController.getQuests).toHaveBeenCalled();
  });

  it('POST /api/user-quests → should call add', async () => {
    const payload = { userId: 'u1', questId: 1 };
    const res = await request(app).post('/api/user-quests').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User quest added');
    expect(QuestController.add).toHaveBeenCalled();
  });

  it('GET /api/user-quests → should call mine', async () => {
    const res = await request(app).get('/api/user-quests');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(QuestController.mine).toHaveBeenCalled();
  });

  it('POST /api/user-quests/:id/complete → should call complete', async () => {
    const res = await request(app).post('/api/user-quests/1/complete');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quest completed');
    expect(QuestController.complete).toHaveBeenCalled();
  });

  it('PUT /api/quests/:id → should call updateQuest', async () => {
    const payload = { title: 'Updated Quest' };
    const res = await request(app).put('/api/quests/1').send(payload);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quest updated');
    expect(QuestController.updateQuest).toHaveBeenCalled();
  });

it('DELETE /api/quests/:id → should call deleteQuest', async () => {
    const res = await request(app).delete('/api/quests/1');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Quest deleted');
    expect(QuestController.deleteQuest).toHaveBeenCalled();
  });

});
