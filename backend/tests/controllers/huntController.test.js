// backend/tests/controllers/huntController.test.js
const HuntController = require('../../controllers/huntController');
const HuntModel = require('../../models/huntModel');

// ---- Mocks ----
jest.mock('../../models/huntModel');

const mockSbFromReq = jest.fn();
jest.mock('../../supabase/supabaseFromReq', () => ({
  sbFromReq: (...args) => mockSbFromReq(...args),
}));

// req/res helpers
const makeReqRes = ({ params = {}, query = {}, body = {}, headers = {} } = {}) => {
  const req = { params, query, body, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
};

// build a tiny supabase-client-like mock
const makeSb = (opts = {}) => {
  const {
    user = { id: 'u-1' },
    authError = null,
    // for mine()
    userHuntsRows = [],
    // for checkAnswer()
    userHuntSingle = null, // { data, error }
  } = opts;

  const updateCalls = [];
  const tables = {
    userHunts: {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ data: userHuntsRows, error: null })),
          })),
        })),
      })),
      update: jest.fn((payload) => ({
        eq: jest.fn((col, val) => {
          updateCalls.push({ payload, where: { [col]: val } });
          return Promise.resolve({ data: null, error: null });
        }),
      })),
    },
  };

  // for checkAnswer() — needs .single()
  const checkBuilder = {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve(userHuntSingle ?? { data: null, error: new Error('no') })),
      })),
    })),
    update: (payload) => ({
      eq: (col, val) => {
        updateCalls.push({ payload, where: { [col]: val } });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: jest.fn((table) => {
      if (table === 'userHunts') {
        // If a test provided userHuntSingle we’re on the checkAnswer path
        return userHuntSingle ? checkBuilder : tables.userHunts;
      }
      // Allow any other table references without failing tests
      return {
        update: jest.fn(() => ({ eq: jest.fn(() => Promise.resolve({ data: null, error: null })) })),
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
            single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      };
    }),
    _updates: updateCalls,
  };
};

describe('HuntController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSbFromReq.mockReset();
  });

  // ───────────────────────────── createHunt
  describe('createHunt', () => {
    it('400 when required fields missing', async () => {
      const { req, res } = makeReqRes({ body: { name: 'A' } });
      await HuntController.createHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });

    it('201 on success; timeLimit parsed to number', async () => {
      HuntModel.createHunt.mockResolvedValue({ data: [{ id: 1, name: 'A' }], error: null });

      const { req, res } = makeReqRes({
        body: {
          name: 'A',
          description: 'd',
          question: 'q',
          answer: 'a',
          timeLimit: '120',
        },
      });

      await HuntController.createHunt(req, res);

      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'A', timeLimit: 120, created_at: expect.any(String) })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt created successfully', hunt: { id: 1, name: 'A' } });
    });

    it('sets timeLimit to null when empty string', async () => {
      HuntModel.createHunt.mockResolvedValue({ data: [{ id: 2 }], error: null });
      const { req, res } = makeReqRes({
        body: { name: 'A', description: 'd', question: 'q', answer: 'a', timeLimit: '' },
      });
      await HuntController.createHunt(req, res);
      expect(HuntModel.createHunt).toHaveBeenCalledWith(
        expect.objectContaining({ timeLimit: null })
      );
    });

    it('500 on model error', async () => {
      HuntModel.createHunt.mockResolvedValue({ data: null, error: new Error('db') });
      const { req, res } = makeReqRes({
        body: { name: 'A', description: 'd', question: 'q', answer: 'a' },
      });
      await HuntController.createHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'db' });
    });
  });

  // ───────────────────────────── getHunts
  describe('getHunts', () => {
    it('returns data on success', async () => {
      HuntModel.getHunts.mockResolvedValue({ data: [{ id: 1 }], error: null });
      const { req, res } = makeReqRes({ query: { q: 'x' } });
      await HuntController.getHunts(req, res);
      expect(HuntModel.getHunts).toHaveBeenCalledWith({ q: 'x' });
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('500 on model error', async () => {
      HuntModel.getHunts.mockResolvedValue({ data: null, error: new Error('boom') });
      const { req, res } = makeReqRes();
      await HuntController.getHunts(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  // ───────────────────────────── getUserHunt (GET /user-hunts/:id)
  describe('getUserHunt', () => {
    it('401 when bearer token missing', async () => {
      mockSbFromReq.mockReturnValue(null);
      const { req, res } = makeReqRes({ params: { id: '5' } });
      await HuntController.getUserHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('400 when id is invalid', async () => {
      mockSbFromReq.mockReturnValue({});
      const { req, res } = makeReqRes({ params: { id: 'abc' } });
      await HuntController.getUserHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ID' });
    });

    it('400 when supabase returns an error', async () => {
      const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'no row' } });
      const sb = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single })),
          })),
        })),
      };
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ params: { id: '3' } });

      await HuntController.getUserHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'no row' });
      expect(sb.from).toHaveBeenCalledWith('userHunts');
      expect(single).toHaveBeenCalledTimes(1);
    });

    it('200 returns row when successful', async () => {
      const single = jest.fn().mockResolvedValue({
        data: { id: 7, huntId: 2, isActive: true },
        error: null,
      });
      const eq = jest.fn(() => ({ single }));
      const sb = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq,
          })),
        })),
      };
      mockSbFromReq.mockReturnValue(sb);

      const { req, res } = makeReqRes({ params: { id: '7' } });
      await HuntController.getUserHunt(req, res);

      expect(res.json).toHaveBeenCalledWith({ id: 7, huntId: 2, isActive: true });
      expect(eq).toHaveBeenCalledWith('id', 7);
    });

    it('500 when supabase throws', async () => {
      const single = jest.fn().mockRejectedValue(new Error('boom'));
      const sb = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single })),
          })),
        })),
      };
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ params: { id: '4' } });

      await HuntController.getUserHunt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  // ───────────────────────────── updateHunt
  describe('updateHunt', () => {
    it('400 invalid id', async () => {
      const { req, res } = makeReqRes({ params: { id: 'abc' }, body: {} });
      await HuntController.updateHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is invalid' });
    });

    it('normalizes timeLimit to null when non-numeric', async () => {
      HuntModel.updateHunt.mockResolvedValue({ data: [{ id: 1, timeLimit: null }], error: null });
      const { req, res } = makeReqRes({ params: { id: '1' }, body: { timeLimit: 'NaN' } });
      await HuntController.updateHunt(req, res);
      expect(HuntModel.updateHunt).toHaveBeenCalledWith(1, expect.objectContaining({ timeLimit: null }));
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hunt updated successfully',
        hunt: { id: 1, timeLimit: null },
      });
    });

    it('200 success', async () => {
      HuntModel.updateHunt.mockResolvedValue({
        data: [{ id: 5, name: 'X' }],
        error: null,
      });
      const { req, res } = makeReqRes({ params: { id: '5' }, body: { name: 'X', timeLimit: 90 } });
      await HuntController.updateHunt(req, res);
      expect(HuntModel.updateHunt).toHaveBeenCalledWith(5, expect.objectContaining({ name: 'X', timeLimit: 90 }));
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt updated successfully', hunt: { id: 5, name: 'X' } });
    });

    it('500 on model error', async () => {
      HuntModel.updateHunt.mockResolvedValue({ data: null, error: new Error('db') });
      const { req, res } = makeReqRes({ params: { id: '2' }, body: {} });
      await HuntController.updateHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'db' });
    });
  });

  // ───────────────────────────── deleteHunt
  describe('deleteHunt', () => {
    it('400 when id missing/zero', async () => {
      const { req, res } = makeReqRes({ params: { id: '0' } });
      await HuntController.deleteHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt ID is required' });
    });

    it('200 success', async () => {
      HuntModel.deleteHunt.mockResolvedValue({ data: [{ id: 9 }], error: null });
      const { req, res } = makeReqRes({ params: { id: '9' } });
      await HuntController.deleteHunt(req, res);
      expect(HuntModel.deleteHunt).toHaveBeenCalledWith(9);
      expect(res.json).toHaveBeenCalledWith({ message: 'Hunt deleted successfully', hunt: { id: 9 } });
    });

    it('500 on model error', async () => {
      HuntModel.deleteHunt.mockResolvedValue({ data: null, error: new Error('boom') });
      const { req, res } = makeReqRes({ params: { id: '3' } });
      await HuntController.deleteHunt(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'boom' });
    });
  });

  // ───────────────────────────── mine (GET /user-hunts)
  describe('mine', () => {
    const realDate = Date;

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    });
    afterAll(() => {
      jest.useRealTimers();
      global.Date = realDate;
    });

    it('401 when missing bearer token (sbFromReq returns null)', async () => {
      mockSbFromReq.mockReturnValue(null);
      const { req, res } = makeReqRes();
      await HuntController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('401 on auth error', async () => {
      const sb = makeSb({ authError: new Error('auth') });
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ headers: { authorization: 'Bearer t' } });
      await HuntController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'auth' });
    });

    it('401 when unauthenticated (no user id)', async () => {
      const sb = makeSb({ user: null });
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ headers: { authorization: 'Bearer t' } });
      await HuntController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthenticated' });
    });

    it('returns only non-expired hunts and updates expired to inactive; includes remainingTime', async () => {
      const rows = [
        // expired (closingAt before "now" 2024-01-01T00:00:00Z)
        { id: 1, userId: 'u-1', isActive: true, closingAt: '2023-12-31T23:59:50.000Z' },
        // future (1m30s)
        { id: 2, userId: 'u-1', isActive: true, closingAt: '2024-01-01T00:01:30.000Z' },
        // no closingAt (N/A)
        { id: 3, userId: 'u-1', isActive: true, closingAt: null },
      ];
      const sb = makeSb({ userHuntsRows: rows });
      mockSbFromReq.mockReturnValue(sb);

      const { req, res } = makeReqRes({ headers: { authorization: 'Bearer t' } });
      await HuntController.mine(req, res);

      // One update for expired row id=1
      expect(sb._updates.some(u => u.where.id === 1 && u.payload.isActive === false)).toBe(true);

      // Response contains only id 2 and 3
      const payload = res.json.mock.calls[0][0];
      const ids = payload.map(r => r.id).sort();
      expect(ids).toEqual([2, 3]);

      const future = payload.find(r => r.id === 2);
      expect(future.remainingTime).toMatch(/^1m 30s$/);

      const na = payload.find(r => r.id === 3);
      expect(na.remainingTime).toBe('N/A');
    });
  });

  // ───────────────────────────── checkAnswer (POST /user-hunts/:id/check)
  describe('checkAnswer', () => {
    it('401 when missing bearer token', async () => {
      mockSbFromReq.mockReturnValue(null);
      const { req, res } = makeReqRes({ params: { id: '1' }, body: { answer: 'x' } });
      await HuntController.checkAnswer(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('400 when userHunt not found', async () => {
      const sb = makeSb({ userHuntSingle: { data: null, error: new Error('no') } });
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ params: { id: '7' }, body: { answer: 'a' } });
      await HuntController.checkAnswer(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User hunt not found' });
    });

    it('returns correct:false with message when hunt inactive', async () => {
      const sb = makeSb({
        userHuntSingle: {
          data: {
            id: 5,
            isActive: false,
            hunts: { answer: 'Secret' },
          },
          error: null,
        },
      });
      mockSbFromReq.mockReturnValue(sb);
      const { req, res } = makeReqRes({ params: { id: '5' }, body: { answer: 'secret' } });
      await HuntController.checkAnswer(req, res);
      expect(res.json).toHaveBeenCalledWith({ correct: false, message: 'Hunt inactive' });
    });

    it('returns correct:true and updates completion when answer matches (case/trim-insensitive)', async () => {
      const sb = makeSb({
        userHuntSingle: {
          data: {
            id: 11,
            isActive: true,
            isComplete: false,
            hunts: { answer: ' Secret  ' },
          },
          error: null,
        },
      });
      mockSbFromReq.mockReturnValue(sb);

      const { req, res } = makeReqRes({ params: { id: '11' }, body: { answer: 'secret' } });
      await HuntController.checkAnswer(req, res);

      // Update called with isComplete true, isActive false, completedAt set
      const update = sb._updates.find(u => u.where.id === 11);
      expect(update).toBeTruthy();
      expect(update.payload.isComplete).toBe(true);
      expect(update.payload.isActive).toBe(false);
      expect(typeof update.payload.completedAt).toBe('string');

      expect(res.json).toHaveBeenCalledWith({ correct: true });
    });

    it('returns correct:false when answer does not match (no update)', async () => {
      const sb = makeSb({
        userHuntSingle: {
          data: {
            id: 22,
            isActive: true,
            isComplete: false,
            hunts: { answer: 'Right' },
          },
          error: null,
        },
      });
      mockSbFromReq.mockReturnValue(sb);

      const { req, res } = makeReqRes({ params: { id: '22' }, body: { answer: 'Wrong' } });
      await HuntController.checkAnswer(req, res);

      expect(sb._updates.length).toBe(0);
      expect(res.json).toHaveBeenCalledWith({ correct: false });
    });
  });
});
