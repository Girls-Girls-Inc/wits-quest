// tests/unit/controllers/leaderboard.controller.test.js

// Mock the model the controller depends on
jest.mock('../../models/leaderboardModel', () => ({
  getLeaderboard: jest.fn(),
}));

const LeaderboardModel = require('../../models/leaderboardModel');
const LeaderboardController = require('../../controllers/leaderboardController');

describe('LeaderboardController.getLeaderboard', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        periodType: 'yearly',
        start: '2025-01-01',
        end: '2025-12-31',
        // userId and id are optional
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('calls the model with correct args and returns array with stable (non-date) shape', async () => {
    const sample = [
      {
        id: 12345,
        userId: '089ec04b-40ff-45dd-b57d-c62207c0c443',
        periodType: 'Yearly',
        periodStart: '2025-01-01T14:43:21', // present but NOT asserted
        periodEnd: '2025-12-31T14:43:32',   // present but NOT asserted
        points: 30,
        rank: 1,
      },
      {
        id: 54321,
        userId: '0c70e828-a68f-4640-8148-a089ebf313bc',
        periodType: 'Yearly',
        periodStart: '2025-01-01T14:32:17',
        periodEnd: '2025-12-31T14:33:45',
        points: 20,
        rank: 2,
      },
    ];
    LeaderboardModel.getLeaderboard.mockResolvedValueOnce(sample);

    await LeaderboardController.getLeaderboard(req, res);

    // Model called with query params in the correct order
    expect(LeaderboardModel.getLeaderboard).toHaveBeenCalledWith(
      'yearly',
      '2025-01-01',
      '2025-12-31',
      undefined,
      undefined
    );

    // Assert only stable, non-date fields
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];

    expect(Array.isArray(payload)).toBe(true);
    for (const item of payload) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          userId: expect.any(String),
          periodType: expect.any(String),
          periodStart: expect.any(String),
          periodEnd: expect.any(String),
          points: expect.any(Number),
          rank: expect.any(Number),
        })
      );
      // Note: intentionally NOT checking periodStart/periodEnd at all
    }

    expect(res.status).not.toHaveBeenCalled(); // default 200
  });

  it('returns 500 and error message if model throws', async () => {
    LeaderboardModel.getLeaderboard.mockRejectedValueOnce(new Error('DB down'));

    await LeaderboardController.getLeaderboard(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'DB down' });
  });

  it('works when optional query params (userId, id) are missing', async () => {
    req.query = { periodType: 'monthly', start: '2025-08-01', end: '2025-08-31' };

    const sample = [
      {
        id: 777,
        userId: 'some-user',
        periodType: 'Monthly',
        periodStart: '2025-08-01T00:00:00',
        periodEnd: '2025-08-31T23:59:59',
        points: 5,
        rank: 10,
      },
    ];
    LeaderboardModel.getLeaderboard.mockResolvedValueOnce(sample);

    await LeaderboardController.getLeaderboard(req, res);

    expect(LeaderboardModel.getLeaderboard).toHaveBeenCalledWith(
      'monthly',
      '2025-08-01',
      '2025-08-31',
      undefined,
      undefined
    );

    const payload = res.json.mock.calls[0][0];
    expect(Array.isArray(payload)).toBe(true);
    // Again: no assertions on periodStart/periodEnd
    expect(payload[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        userId: expect.any(String),
        periodType: expect.any(String),
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
        points: expect.any(Number),
        rank: expect.any(Number),
      })
    );
  });
});

