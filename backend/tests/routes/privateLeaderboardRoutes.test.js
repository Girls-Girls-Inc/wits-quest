// backend/tests/routes/privateLeaderboardRoutes.test.js
const express = require('express');
const request = require('supertest');

// mock auth middleware to inject a user quickly (note correct relative path)
jest.mock('../../middleware/auth', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'test-user' }; next(); }
}));

// Provide the mocked controller object inline (factory must not reference out-of-scope variables)
jest.mock('../../controllers/privateLeaderboardController', () => ({
  create: jest.fn((req, res) => res.status(201).json({ ok: true })),
  list: jest.fn((req, res) => res.json([])),
  standings: jest.fn((req, res) => res.json([])),
  joinByCode: jest.fn((req, res) => res.json({ message: 'Joined' })),
  inviteMember: jest.fn((req, res) => res.status(201).json({ id: 'm1' })),
  listMembers: jest.fn((req, res) => res.json([])),
  removeMember: jest.fn((req, res) => res.status(204).send()),
  update: jest.fn((req, res) => res.json({ updated: true })),
  delete: jest.fn((req, res) => res.status(204).send())
}));

const routes = require('../../routes/privateLeaderboardRoutes');

describe('privateLeaderboardRoutes', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(routes);
  });

  const controller = require('../../controllers/privateLeaderboardController');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /private-leaderboards -> controller.create', async () => {
    const res = await request(app).post('/private-leaderboards').send({ name: 'X' });
    expect(res.status).toBe(201);
    expect(controller.create).toHaveBeenCalled();
  });

  it('GET /private-leaderboards -> controller.list', async () => {
    const res = await request(app).get('/private-leaderboards');
    expect(res.status).toBe(200);
    expect(controller.list).toHaveBeenCalled();
  });

  it('GET /private-leaderboards/:id -> controller.list', async () => {
    const res = await request(app).get('/private-leaderboards/lb-1');
    expect(res.status).toBe(200);
    expect(controller.list).toHaveBeenCalled();
  });

  it('GET /private-leaderboards/:id/standings -> controller.standings', async () => {
    const res = await request(app).get('/private-leaderboards/lb-1/standings');
    expect(res.status).toBe(200);
    expect(controller.standings).toHaveBeenCalled();
  });

  it('POST /private-leaderboards/join -> controller.joinByCode', async () => {
    const res = await request(app).post('/private-leaderboards/join').send({ code: 'ABC' });
    expect(res.status).toBe(200);
    expect(controller.joinByCode).toHaveBeenCalled();
  });

  it('members endpoints wiring', async () => {
    let res = await request(app).post('/private-leaderboards/lb-1/members').send({ userId: 'u2' });
    expect(res.status).toBe(201);
    expect(controller.inviteMember).toHaveBeenCalled();

    res = await request(app).get('/private-leaderboards/lb-1/members');
    expect(res.status).toBe(200);
    expect(controller.listMembers).toHaveBeenCalled();

    res = await request(app).delete('/private-leaderboards/lb-1/members/u2');
    expect(res.status).toBe(204);
    expect(controller.removeMember).toHaveBeenCalled();
  });

  it('patch & delete routes', async () => {
    let res = await request(app).patch('/private-leaderboards/lb-1').send({ name: 'New' });
    expect(res.status).toBe(200);
    expect(controller.update).toHaveBeenCalled();

    res = await request(app).delete('/private-leaderboards/lb-1');
    expect(res.status).toBe(204);
    expect(controller.delete).toHaveBeenCalled();
  });
});
