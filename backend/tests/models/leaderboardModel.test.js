// backend/tests/models/leaderboardModel.test.js

// Must mock before importing the model
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    rpc: jest.fn().mockResolvedValue({ error: null }),
    upsert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { score: 0 }, error: null }),
    is: jest.fn().mockReturnThis(),
  })),
}));

jest.mock('../../supabase/supabaseClient', () => ({
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
}));

const readClient = require('../../supabase/supabaseClient');
const { createClient } = require('@supabase/supabase-js');
const LeaderboardModel = require('../../models/leaderboardModel');

describe('LeaderboardModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('returns leaderboard data with no filters', async () => {
      readClient.from().select().order.mockResolvedValue({ data: [{ id: 1, rank: 1 }], error: null });

      const res = await LeaderboardModel.getLeaderboard();

      expect(readClient.from).toHaveBeenCalledWith('leaderboard_with_users');
      expect(readClient.from().select).toHaveBeenCalledWith('*');
      expect(readClient.from().order).toHaveBeenCalledWith('rank', { ascending: true });
      expect(res).toEqual([{ id: 1, rank: 1 }]);
    });

    it('applies all filters', async () => {
      // Fully chainable mock
      const chain = {
        ilike: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ data: [{ id: 2 }], error: null }),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      };
      readClient.from.mockReturnValue(chain);

      const res = await LeaderboardModel.getLeaderboard(
        'monthly',
        '2023-01-01',
        '2023-01-31',
        'user123',
        'id456'
      );

      expect(chain.ilike).toHaveBeenCalledWith('periodType', 'monthly');
      expect(chain.eq).toHaveBeenCalledWith('id', 'id456');
      expect(chain.eq).toHaveBeenCalledWith('userId', 'user123');
      expect(chain.gte).toHaveBeenCalledWith('periodStart', new Date('2023-01-01').toISOString());
      expect(chain.lte).toHaveBeenCalledWith('periodEnd', new Date('2023-01-31').toISOString());
      expect(res).toEqual([{ id: 2 }]);
    });

    it('throws if Supabase returns an error', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB failed') }),
        from: jest.fn().mockReturnThis(),
      };
      readClient.from.mockReturnValue(chain);

      await expect(LeaderboardModel.getLeaderboard()).rejects.toThrow('DB failed');
    });

    it('returns empty array if data is null', async () => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
        from: jest.fn().mockReturnThis(),
      };
      readClient.from.mockReturnValue(chain);

      const res = await LeaderboardModel.getLeaderboard();
      expect(res).toEqual([]);
    });
  });

  describe('addPointsAtomic', () => {
    it('calls rpc and succeeds', async () => {
      const adminClient = createClient();
      const spyRpc = adminClient.rpc;

      const result = await LeaderboardModel.addPointsAtomic({
        userId: 'u1',
        points: 50,
        periodType: 'overall',
      });

      expect(spyRpc).toHaveBeenCalledWith(
        'lb_add_points',
        expect.objectContaining({ in_user_id: 'u1', in_points: 50 })
      );
      expect(result).toEqual({ ok: true, method: 'rpc' });
    });
  });
});

