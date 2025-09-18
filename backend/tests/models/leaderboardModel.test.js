global.adminRpcMock = jest.fn();
global.adminNextResult = { data: null, error: null };
global.readNextResult = { data: null, error: null };
global.lastReadSteps = [];
global.lastAdminSteps = [];

jest.mock('@supabase/supabase-js', () => {
  return {
    createClient: jest.fn(() => {
      // helper: build a chainable/thenable query object
      const makeChainable = (stepsArr) => {
        const steps = stepsArr;
        const q = {
          select(...args) { steps.push(['select', ...args]); return this; },
          order(...args)  { steps.push(['order', ...args]);  return this; },
          ilike(...args)  { steps.push(['ilike', ...args]);  return this; },
          eq(...args)     { steps.push(['eq', ...args]);     return this; },
          gte(...args)    { steps.push(['gte', ...args]);    return this; },
          lte(...args)    { steps.push(['lte', ...args]);    return this; },
          in(...args)     { steps.push(['in', ...args]);     return this; },
          update(...args) { steps.push(['update', ...args]); return this; },
          insert(...args) { steps.push(['insert', ...args]); return this; },
          delete(...args) { steps.push(['delete', ...args]); return this; },
          single()        { steps.push(['single']);          return this; },
          maybeSingle()   { steps.push(['maybeSingle']);     return this; },
          then(onFulfilled, onRejected) {
            // resolve using adminNextResult and record steps
            global.lastAdminSteps = steps.slice();
            return Promise.resolve(global.adminNextResult).then(onFulfilled, onRejected);
          },
        };
        return q;
      };

      return {
        rpc: (...args) => global.adminRpcMock(...args),
        from: () => makeChainable([]),
      };
    }),
  };
});

// --- Mock the read-only client module used by the model ---
jest.mock('../../supabase/supabaseClient', () => {
  return {
    from: () => {
      const steps = [];
      const q = {
        select(...args) { steps.push(['select', ...args]); return this; },
        order(...args)  { steps.push(['order', ...args]);  return this; },
        ilike(...args)  { steps.push(['ilike', ...args]);  return this; },
        eq(...args)     { steps.push(['eq', ...args]);     return this; },
        gte(...args)    { steps.push(['gte', ...args]);    return this; },
        lte(...args)    { steps.push(['lte', ...args]);    return this; },
        in(...args)     { steps.push(['in', ...args]);     return this; },
        update(...args) { steps.push(['update', ...args]); return this; },
        insert(...args) { steps.push(['insert', ...args]); return this; },
        delete(...args) { steps.push(['delete', ...args]); return this; },
        single()        { steps.push(['single']);          return this; },
        maybeSingle()   { steps.push(['maybeSingle']);     return this; },
        then(onFulfilled, onRejected) {
          global.lastReadSteps = steps.slice();
          return Promise.resolve(global.readNextResult).then(onFulfilled, onRejected);
        },
      };
      return q;
    },
  };
});

// Import AFTER mocks
const LeaderboardModel = require('../../models/leaderboardModel');
const { createClient } = require('@supabase/supabase-js'); // mocked factory

describe('LeaderboardModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.adminRpcMock.mockReset();
    global.adminNextResult = { data: null, error: null };
    global.readNextResult = { data: null, error: null };
    global.lastReadSteps = [];
    global.lastAdminSteps = [];
  });

  // ─────────────────────────────────────────────
  // getLeaderboard
  // ─────────────────────────────────────────────
  describe('getLeaderboard', () => {
    it('fetches successfully and sorts by points desc', async () => {
      global.readNextResult = { data: [{ id: 1, points: 10 }], error: null };

      const rows = await LeaderboardModel.getLeaderboard();

      expect(rows).toEqual([{ id: 1, points: 10 }]);

      // Ensure order call matches desired sort
      const orderCall = global.lastReadSteps.find(s => s[0] === 'order');
      expect(orderCall).toEqual(['order', 'points', { ascending: false, nullsFirst: false }]);
    });

    it('applies all filters and trims id/userId', async () => {
      global.readNextResult = { data: [], error: null };

      const start = '2025-01-01';
      const end = '2025-12-31';
      const expectedStartIso = new Date(start).toISOString();
      const expectedEndIso = new Date(end).toISOString();

      await LeaderboardModel.getLeaderboard('Yearly', start, end, '  user-123  ', '  42  ');

      // ilike on periodType
      expect(global.lastReadSteps).toEqual(expect.arrayContaining([
        ['ilike', 'periodType', 'Yearly'],
      ]));
      // eq on trimmed id and userId
      expect(global.lastReadSteps).toEqual(expect.arrayContaining([
        ['eq', 'id', '42'],
        ['eq', 'userId', 'user-123'],
      ]));
      // date bounds to ISO (UTC)
      expect(global.lastReadSteps).toEqual(expect.arrayContaining([
        ['gte', 'periodStart', expectedStartIso],
        ['lte', 'periodEnd', expectedEndIso],
      ]));
    });

    it('throws when read client returns error', async () => {
      global.readNextResult = { data: null, error: { message: 'db error' } };

      await expect(LeaderboardModel.getLeaderboard()).rejects.toEqual({ message: 'db error' });
    });
  });

  // ─────────────────────────────────────────────
  // addPointsAtomic
  // ─────────────────────────────────────────────
  describe('addPointsAtomic', () => {
    it('uses RPC path when rpc returns no error', async () => {
      global.adminRpcMock.mockResolvedValue({ data: { ok: true }, error: null });

      const out = await LeaderboardModel.addPointsAtomic({ userId: 'u1', points: 10 });

      expect(global.adminRpcMock).toHaveBeenCalledWith('lb_add_points', {
        in_user_id: 'u1',
        in_points: 10,
      });
      expect(out).toEqual({ ok: true, method: 'rpc' });
    });

    it('falls back when RPC fails and succeeds with no rows', async () => {
      // Trigger fallback
      global.adminRpcMock.mockResolvedValue({ data: null, error: { message: 'rpc fail' } });
      // Fallback SELECT returns no rows
      global.adminNextResult = { data: [], error: null };

      const out = await LeaderboardModel.addPointsAtomic({ userId: 'user-x', points: 5 });

      // Admin SELECT should have run (eq + in), but we only assert result here
      expect(out).toEqual({ ok: true, method: 'fallback' });
    });

    it('fallback updates when SELECT returns rows', async () => {
      // Trigger fallback
      global.adminRpcMock.mockResolvedValue({ data: null, error: { message: 'rpc fail' } });

      // First awaited call (SELECT) returns one row
      // Note: our mock returns the same adminNextResult for each await; we set it such that
      // SELECT gets data, and updates see no error.
      global.adminNextResult = {
        data: [{ id: 101, userId: 'u2', points: 20 }],
        error: null,
      };

      const out = await LeaderboardModel.addPointsAtomic({ userId: 'u2', points: 3 });

      expect(out).toEqual({ ok: true, method: 'fallback' });
      // Optionally, verify that an update was attempted (best-effort; lastAdminSteps
      // will reflect the final awaited chain—likely the last update call)
      const updateCall = global.lastAdminSteps.find(s => s[0] === 'update');
      expect(updateCall).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────
  // currentPeriod helper
  // ─────────────────────────────────────────────
  describe('currentPeriod', () => {
    it('weekly has full UTC-day bounds and exactly 7 days - 1 ms span', () => {
      const cp = LeaderboardModel.currentPeriod('weekly');
      expect(cp.periodType).toBe('weekly');
      expect(cp.periodStart).toBeTruthy();
      expect(cp.periodEnd).toBeTruthy();

      const s = new Date(cp.periodStart);
      const e = new Date(cp.periodEnd);

      // start at 00:00:00.000 UTC
      expect(s.getUTCHours()).toBe(0);
      expect(s.getUTCMinutes()).toBe(0);
      expect(s.getUTCSeconds()).toBe(0);
      expect(s.getUTCMilliseconds()).toBe(0);

      // end at 23:59:59.999 UTC
      expect(e.getUTCHours()).toBe(23);
      expect(e.getUTCMinutes()).toBe(59);
      expect(e.getUTCSeconds()).toBe(59);
      expect(e.getUTCMilliseconds()).toBe(999);

      const WEEK_MS = 7 * 24 * 60 * 60 * 1000 - 1; // 604,799,999
      expect(e.getTime() - s.getTime()).toBe(WEEK_MS);
    });

    it('monthly spans the entire UTC month correctly', () => {
      const cp = LeaderboardModel.currentPeriod('monthly');
      expect(cp.periodType).toBe('monthly');
      const s = new Date(cp.periodStart);
      const e = new Date(cp.periodEnd);

      // start on 1st at midnight UTC
      expect(s.getUTCDate()).toBe(1);
      expect(s.getUTCHours()).toBe(0);
      expect(s.getUTCMinutes()).toBe(0);
      expect(s.getUTCSeconds()).toBe(0);
      expect(s.getUTCMilliseconds()).toBe(0);

      // end on last day at 23:59:59.999 UTC
      const year = e.getUTCFullYear();
      const month = e.getUTCMonth();
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

      expect(e.getUTCDate()).toBe(lastDay);
      expect(e.getUTCHours()).toBe(23);
      expect(e.getUTCMinutes()).toBe(59);
      expect(e.getUTCSeconds()).toBe(59);
      expect(e.getUTCMilliseconds()).toBe(999);

      const daysInMonth = lastDay;
      const expectedMs = daysInMonth * 24 * 60 * 60 * 1000 - 1;
      expect(e.getTime() - s.getTime()).toBe(expectedMs);
    });

    it('overall returns null bounds', () => {
      const cp = LeaderboardModel.currentPeriod('overall');
      expect(cp).toEqual({ periodType: 'overall', periodStart: null, periodEnd: null });
    });
  });
});
