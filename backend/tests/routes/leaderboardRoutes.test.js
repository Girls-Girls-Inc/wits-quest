// backend/tests/routes/leaderboardRoutes.test.js
const request = require('supertest');
const express = require('express');
const leaderboardRoutes = require('../../routes/leaderboardRoutes');
const leaderboardController = require('../../controllers/leaderboardController');

// Mock the controller so we’re testing only the route wiring
jest.mock('../../controllers/leaderboardController');

describe('Leaderboard Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/', leaderboardRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /leaderboard calls leaderboardController.getLeaderboard', async () => {
    leaderboardController.getLeaderboard.mockImplementation((req, res) =>
      res.json([{ id: 1, score: 100 }])
    );

    const res = await request(app).get('/leaderboard');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1, score: 100 }]);
    expect(leaderboardController.getLeaderboard).toHaveBeenCalled();
  });

  // it('GET /notfound should return 404', async () => {
  //   const res = await request(app).get('/notfound');
  //   expect(res.status).toBe(404);
  // });
});

