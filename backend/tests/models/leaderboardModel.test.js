// tests/models/leaderboardModel.test.js
const LeaderboardModel = require('../../models/leaderboardModel');
const supabase = require('../../supabase/supabaseClient');

jest.mock('../../supabase/supabaseClient', () => ({
  from: jest.fn(),
}));

// helper to create a chainable supabase mock
function makeQueryMock({ data = [], error = null } = {}) {
  const query = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
  };

  // the last link in the chain should resolve to { data, error }
  return { query, result: Promise.resolve({ data, error }) };
}

describe('LeaderboardModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns leaderboard data with no filters', async () => {
    const { query, result } = makeQueryMock({ data: [{ id: 1, rank: 1 }] });
    supabase.from.mockReturnValue(query);
    query.order.mockReturnValue(result);

    const res = await LeaderboardModel.getLeaderboard();

    expect(supabase.from).toHaveBeenCalledWith('leaderboard');
    expect(query.select).toHaveBeenCalledWith('*');
    expect(query.order).toHaveBeenCalledWith('rank', { ascending: true });
    expect(res).toEqual([{ id: 1, rank: 1 }]);
  });

  it('applies all filters', async () => {
    const { query, result } = makeQueryMock({ data: [{ id: 2 }] });
    supabase.from.mockReturnValue(query);
    query.lte.mockReturnValue(result); // last in chain resolves the promise

    const res = await LeaderboardModel.getLeaderboard(
      'monthly',
      '2023-01-01',
      '2023-01-31',
      'user123',
      'id456'
    );

    expect(query.ilike).toHaveBeenCalledWith('periodType', 'monthly');
    expect(query.eq).toHaveBeenCalledWith('id', 'id456');
    expect(query.eq).toHaveBeenCalledWith('userId', 'user123');
    expect(query.gte).toHaveBeenCalledWith('periodStart', new Date('2023-01-01').toISOString());
    expect(query.lte).toHaveBeenCalledWith('periodEnd', new Date('2023-01-31').toISOString());
    expect(res).toEqual([{ id: 2 }]);
  });

  it('throws on supabase error', async () => {
    const { query, result } = makeQueryMock({ error: new Error('DB failed') });
    supabase.from.mockReturnValue(query);
    query.order.mockReturnValue(result);

    await expect(LeaderboardModel.getLeaderboard()).rejects.toThrow('DB failed');
  });

  it('returns empty array if no data', async () => {
    const { query, result } = makeQueryMock({ data: null });
    supabase.from.mockReturnValue(query);
    query.order.mockReturnValue(result);

    const res = await LeaderboardModel.getLeaderboard();
    expect(res).toEqual([]);
  });
});
