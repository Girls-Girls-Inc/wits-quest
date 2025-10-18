// tests/controllers/huntController.test.js

// ---- Mock dependencies ----
jest.mock('../../models/huntModel');
jest.mock('../../models/leaderboardModel');
jest.mock('../../supabase/supabaseFromReq');

const HuntController = require('../../controllers/huntController');
const HuntModel = require('../../models/huntModel');
const LeaderboardModel = require('../../models/leaderboardModel');
const { sbFromReq } = require('../../supabase/supabaseFromReq');

describe('HuntController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════
  // createHunt
  describe('createHunt', () => {
    it('returns 400 when required fields are missing', async () => {
      req.body = { name: 'Test Hunt' };

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });

    it('returns 400 when collectibleId is missing', async () => {
      req.body = {
        name: 'Test',
        description: 'desc',
        question: 'q',
        answer: 'a',
        pointsAchievable: 100,
      };

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing collectibleId' });
    });

    it('returns 400 when pointsAchievable is missing', async () => {
      req.body = {
        name: 'Test',
        description: 'desc',
        question: 'q',
        answer: 'a',
        collectibleId: 5,
      };

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing pointsAchievable' });
    });

    it('creates hunt successfully with valid data', async () => {
      req.body = {
        name: 'Adventure Hunt',
        description: 'Find the treasure',
        question: 'What is the answer?',
        answer: 'Secret',
        collectibleId: 10,
        pointsAchievable: 150,
        timeLimit: '60',
      };

      HuntModel.createHunt.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Adventure Hunt', timeLimit: 60, pointsAchievable: 150 }],
        error: null,
      });

      await HuntController.createHunt(req, res);

      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Adventure Hunt',
          description: 'Find the treasure',
          question: 'What is the answer?',
          answer: 'Secret',
          collectibleId: 10,
          pointsAchievable: 150,
          timeLimit: 60,
          created_at: expect.any(String),
        })
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt created successfully',
        hunt: expect.objectContaining({ id: 1, name: 'Adventure Hunt' }),
      });
    });

    it('sets timeLimit to null when empty string provided', async () => {
      req.body = {
        name: 'Test',
        description: 'desc',
        question: 'q',
        answer: 'a',
        collectibleId: 5,
        pointsAchievable: 50,
        timeLimit: '',
      };

      HuntModel.createHunt.mockResolvedValueOnce({
        data: [{ id: 2, timeLimit: null }],
        error: null,
      });

      await HuntController.createHunt(req, res);

      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({ timeLimit: null })
      );
    });

    it('returns 500 when model returns error', async () => {
      req.body = {
        name: 'Test',
        description: 'desc',
        question: 'q',
        answer: 'a',
        collectibleId: 5,
        pointsAchievable: 50,
      };

      HuntModel.createHunt.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      await HuntController.createHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Database error' });
    });
  });

  // ═══════════════════════════════════════════
  // getHunts
  describe('getHunts', () => {
    it('returns hunts array successfully', async () => {
      req.query = { active: 'true' };

      const sampleHunts = [
        { id: 1, name: 'Hunt 1', description: 'First hunt' },
        { id: 2, name: 'Hunt 2', description: 'Second hunt' },
      ];

      HuntModel.getHunts.mockResolvedValueOnce({
        data: sampleHunts,
        error: null,
      });

      await HuntController.getHunts(req, res);

      expect(HuntModel.getHunts).toHaveBeenCalledWith({ active: 'true' });
      expect(res.json).toHaveBeenCalledWith(sampleHunts);
      expect(res.status).not.toHaveBeenCalled(); // default 200
    });

    it('returns 500 when model returns error', async () => {
      HuntModel.getHunts.mockResolvedValueOnce({
        data: null,
        error: new Error('Query failed'),
      });

      await HuntController.getHunts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Query failed' });
    });
  });

  // ═══════════════════════════════════════════
  // activateHunt
  describe('activateHunt', () => {
    it('returns 400 when hunt ID is invalid', async () => {
      req.params.id = 'invalid';

      await HuntController.activateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid hunt ID' });
    });

    it('returns 401 when bearer token is missing', async () => {
      req.params.id = '1';
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.activateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 401 on auth error', async () => {
      req.params.id = '1';
      
      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: null,
            error: new Error('Unauthorized'),
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.activateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
    });

    it('returns 404 when hunt not found', async () => {
      req.params.id = '999';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getHunts.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await HuntController.activateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt not found' });
    });

    it('activates hunt successfully without timeLimit', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValueOnce({
              data: [{ id: 10, huntId: 1, isActive: true, closingAt: null }],
              error: null,
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getHunts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Test Hunt', timeLimit: null }],
        error: null,
      });

      await HuntController.activateHunt(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt activated successfully',
        userHunt: expect.objectContaining({
          id: 10,
          huntId: 1,
          isActive: true,
        }),
      });
    });

    it('activates hunt successfully with timeLimit and sets closingAt', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValueOnce({
              data: [{ 
                id: 11, 
                huntId: 1, 
                isActive: true, 
                closingAt: '2025-10-18T20:36:00Z' 
              }],
              error: null,
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getHunts.mockResolvedValueOnce({
        data: [{ id: 1, name: 'Timed Hunt', timeLimit: 30 }],
        error: null,
      });

      await HuntController.activateHunt(req, res);

      const upsertCall = mockSb.from().upsert.mock.calls[0][0];
      expect(upsertCall.closingAt).toBeTruthy();
      
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt activated successfully',
        userHunt: expect.objectContaining({
          id: 11,
          huntId: 1,
          isActive: true,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════
  // getUserHunt
  describe('getUserHunt', () => {
    it('returns 401 when bearer token is missing', async () => {
      req.params.id = '5';
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.getUserHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 400 when id is invalid', async () => {
      req.params.id = 'abc';
      sbFromReq.mockReturnValueOnce({});

      await HuntController.getUserHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('returns userHunt successfully', async () => {
      req.params.id = '7';

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: 7,
                  huntId: 2,
                  isActive: true,
                  hunts: { name: 'Test Hunt' },
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.getUserHunt(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 7,
          huntId: 2,
          isActive: true,
        })
      );
    });

    it('returns 400 when supabase returns error', async () => {
      req.params.id = '3';

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.getUserHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
    });
  });

  // ═══════════════════════════════════════════
  // updateHunt
  describe('updateHunt', () => {
    it('returns 400 when hunt ID is invalid', async () => {
      req.params.id = 'abc';
      req.body = { name: 'Updated' };

      await HuntController.updateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is invalid' });
    });

    it('updates hunt successfully', async () => {
      req.params.id = '5';
      req.body = { name: 'Updated Hunt', timeLimit: 90 };

      HuntModel.updateHunt.mockResolvedValueOnce({
        data: [{ id: 5, name: 'Updated Hunt', timeLimit: 90 }],
        error: null,
      });

      await HuntController.updateHunt(req, res);

      expect(HuntModel.updateHunt).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ name: 'Updated Hunt', timeLimit: 90 })
      );

      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt updated successfully',
        hunt: expect.objectContaining({ id: 5, name: 'Updated Hunt' }),
      });
    });

    it('normalizes timeLimit to null when non-numeric', async () => {
      req.params.id = '1';
      req.body = { timeLimit: 'invalid' };

      HuntModel.updateHunt.mockResolvedValueOnce({
        data: [{ id: 1, timeLimit: null }],
        error: null,
      });

      await HuntController.updateHunt(req, res);

      expect(HuntModel.updateHunt).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ timeLimit: null })
      );
    });

    it('returns 500 on model error', async () => {
      req.params.id = '2';
      req.body = {};

      HuntModel.updateHunt.mockResolvedValueOnce({
        data: null,
        error: new Error('Update failed'),
      });

      await HuntController.updateHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Update failed' });
    });
  });

  // ═══════════════════════════════════════════
  // deleteHunt
  describe('deleteHunt', () => {
    it('returns 400 when hunt ID is missing or zero', async () => {
      req.params.id = '0';

      await HuntController.deleteHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is required' });
    });

    it('deletes hunt successfully', async () => {
      req.params.id = '9';

      HuntModel.deleteHunt.mockResolvedValueOnce({
        data: [{ id: 9, name: 'Deleted Hunt' }],
        error: null,
      });

      await HuntController.deleteHunt(req, res);

      expect(HuntModel.deleteHunt).toHaveBeenCalledWith(9);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt deleted successfully',
        hunt: expect.objectContaining({ id: 9 }),
      });
    });

    it('returns 500 on model error', async () => {
      req.params.id = '3';

      HuntModel.deleteHunt.mockResolvedValueOnce({
        data: null,
        error: new Error('Delete failed'),
      });

      await HuntController.deleteHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Delete failed' });
    });
  });

  // ═══════════════════════════════════════════
  // mine (GET /user-hunts)
  describe('mine', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-10-18T19:36:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('returns 401 when bearer token is missing', async () => {
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.mine(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 401 on auth error', async () => {
      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: null,
            error: new Error('Auth failed'),
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.mine(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Auth failed' });
    });

    it('returns active hunts and filters out expired ones', async () => {
      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValueOnce({
                  data: [
                    {
                      id: 1,
                      userId: 'user-123',
                      isActive: true,
                      closingAt: '2025-10-18T19:00:00Z', // expired
                    },
                    {
                      id: 2,
                      userId: 'user-123',
                      isActive: true,
                      closingAt: '2025-10-18T20:00:00Z', // 24 minutes remaining
                    },
                    {
                      id: 3,
                      userId: 'user-123',
                      isActive: true,
                      closingAt: null, // no time limit
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.mine(req, res);

      const result = res.json.mock.calls[0][0];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2); // Only non-expired hunts
      
      // Check that expired hunt was updated
      expect(mockSb.from().update).toHaveBeenCalled();
      
      // Verify structure of returned hunts
      result.forEach(hunt => {
        expect(hunt).toEqual(
          expect.objectContaining({
            id: expect.any(Number),
            userId: expect.any(String),
            isActive: expect.any(Boolean),
            remainingTime: expect.any(String),
          })
        );
      });
    });
  });

  // ═══════════════════════════════════════════
  // checkAnswer
  describe('checkAnswer', () => {
    it('returns 401 when bearer token is missing', async () => {
      req.params.id = '1';
      req.body = { answer: 'test' };
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.checkAnswer(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 400 when userHunt not found', async () => {
      req.params.id = '7';
      req.body = { answer: 'test' };

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: null,
                error: new Error('Not found'),
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.checkAnswer(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User hunt not found' });
    });

    it('returns correct:false when hunt is inactive', async () => {
      req.params.id = '5';
      req.body = { answer: 'secret' };

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: 5,
                  isActive: false,
                  hunts: { answer: 'Secret' },
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.checkAnswer(req, res);

      expect(res.json).toHaveBeenCalledWith({
        correct: false,
        message: 'Hunt inactive',
      });
    });

    it('returns correct:true and updates completion when answer matches (case-insensitive)', async () => {
      req.params.id = '11';
      req.body = { answer: 'secret' };

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: 11,
                  isActive: true,
                  isComplete: false,
                  hunts: { answer: ' Secret  ' },
                },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.checkAnswer(req, res);

      expect(mockSb.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          isComplete: true,
          isActive: false,
          completedAt: expect.any(String),
        })
      );

      expect(res.json).toHaveBeenCalledWith({ correct: true });
    });

    it('returns correct:false when answer does not match', async () => {
      req.params.id = '22';
      req.body = { answer: 'Wrong' };

      const mockSb = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValueOnce({
                data: {
                  id: 22,
                  isActive: true,
                  isComplete: false,
                  hunts: { answer: 'Right' },
                },
                error: null,
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.checkAnswer(req, res);

      expect(res.json).toHaveBeenCalledWith({ correct: false });
    });
  });

  // ═══════════════════════════════════════════
  // complete
  describe('complete', () => {
    it('returns 401 when bearer token is missing', async () => {
      req.params.id = '1';
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 401 when user is not authenticated', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: null },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthenticated' });
    });

    it('returns 400 when userHunt id is invalid', async () => {
      req.params.id = 'invalid';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid userHunt id' });
    });

    it('returns 404 when userHunt not found', async () => {
      req.params.id = '99';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getUserHuntById.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await HuntController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'userHunt not found' });
    });

    it('returns 403 when user does not own the hunt', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getUserHuntById.mockResolvedValueOnce({
        data: { id: 1, userId: 'other-user', huntId: 5 },
        error: null,
      });

      await HuntController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    it('completes hunt successfully and awards points', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getUserHuntById.mockResolvedValueOnce({
        data: { id: 1, userId: 'user-123', huntId: 5 },
        error: null,
      });

      HuntModel.getHuntById.mockResolvedValueOnce({
        data: { id: 5, pointsAchievable: 150 },
        error: null,
      });

      HuntModel.setCompleteById.mockResolvedValueOnce({
        data: { id: 1, isComplete: true },
        error: null,
      });

      LeaderboardModel.addPointsAtomic.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      await HuntController.complete(req, res);

      expect(HuntModel.setCompleteById).toHaveBeenCalledWith(1, mockSb);
      expect(LeaderboardModel.addPointsAtomic).toHaveBeenCalledWith({
        userId: 'user-123',
        points: 150,
      });

      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        userHunt: expect.objectContaining({ id: 1, isComplete: true }),
        awarded: 150,
      });
    });

    it('handles invalid pointsAchievable as 0', async () => {
      req.params.id = '1';

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      HuntModel.getUserHuntById.mockResolvedValueOnce({
        data: { id: 1, userId: 'user-123', huntId: 5 },
        error: null,
      });

      HuntModel.getHuntById.mockResolvedValueOnce({
        data: { id: 5, pointsAchievable: 'invalid' },
        error: null,
      });

      HuntModel.setCompleteById.mockResolvedValueOnce({
        data: { id: 1, isComplete: true },
        error: null,
      });

      LeaderboardModel.addPointsAtomic.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      await HuntController.complete(req, res);

      expect(LeaderboardModel.addPointsAtomic).toHaveBeenCalledWith({
        userId: 'user-123',
        points: 0,
      });
    });
  });

  // ═══════════════════════════════════════════
  // addCollectibleToUser
  describe('addCollectibleToUser', () => {
    it('returns 400 when userId is missing', async () => {
      req.params = { collectibleId: '5' };

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing userId or collectibleId',
      });
    });

    it('returns 400 when collectibleId is missing', async () => {
      req.params = { id: 'user-123' };

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Missing userId or collectibleId',
      });
    });

    it('returns 401 when bearer token is missing', async () => {
      req.params = { id: 'user-123', collectibleId: '5' };
      sbFromReq.mockReturnValueOnce(null);

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('returns 403 when authenticated user does not match requested userId', async () => {
      req.params = { id: 'user-123', collectibleId: '5' };

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'different-user' } },
            error: null,
          }),
        },
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
    });

    it('returns 409 when collectible already exists in inventory', async () => {
      req.params = { id: 'user-123', collectibleId: '5' };

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValueOnce({
                  data: { id: 1 }, // collectible exists
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Collectible already earned',
      });
    });

    it('adds collectible to user inventory successfully', async () => {
      req.params = { id: 'user-123', collectibleId: '5' };

      const mockSb = {
        auth: {
          getUser: jest.fn().mockResolvedValueOnce({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValueOnce({
                  data: null, // collectible doesn't exist yet
                  error: null,
                }),
              }),
            }),
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValueOnce({
              data: [
                {
                  id: 10,
                  userId: 'user-123',
                  collectibleId: 5,
                  earnedAt: '2025-10-18T19:36:00Z',
                },
              ],
              error: null,
            }),
          }),
        }),
      };
      sbFromReq.mockReturnValueOnce(mockSb);

      await HuntController.addCollectibleToUser(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Collectible added to user inventory',
        inventoryItem: expect.objectContaining({
          id: 10,
          userId: 'user-123',
          collectibleId: 5,
        }),
      });
    });
  });
});
