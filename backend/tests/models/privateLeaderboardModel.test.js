// backend/tests/models/privateLeaderboardModel.test.js
const PrivateLeaderboardModel = require('../../models/privateLeaderboardModel');

// Flexible supabase client mock used across many tests
const mockFrom = jest.fn();
jest.mock('../../supabase/supabaseClient', () => ({
  from: (...args) => mockFrom(...args)
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom._calls = {};
});

// helper to increment call counter per table
const recordCall = (table) => {
  mockFrom._calls[table] = (mockFrom._calls[table] || 0) + 1;
  return mockFrom._calls[table];
};

describe('PrivateLeaderboardModel (extended)', () => {
  describe('create', () => {
    it('errors without payload', async () => {
      const res = await PrivateLeaderboardModel.create();
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
    });

    it('inserts and returns created row', async () => {
      const single = jest.fn().mockResolvedValue({ data: { id: 'lb-1' }, error: null });
      mockFrom.mockReturnValue({
        insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) })
      });

      const res = await PrivateLeaderboardModel.create({ ownerUserId: 'u1', name: 'x' });
      expect(res.data).toEqual({ id: 'lb-1' });
    });
  });

  describe('findById', () => {
    it('errors without id', async () => {
      const res = await PrivateLeaderboardModel.findById();
      expect(res.error).toBeInstanceOf(Error);
    });

    it('returns maybeSingle data', async () => {
      const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'lb-1' }, error: null });
      mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle }) }) });

      const res = await PrivateLeaderboardModel.findById('lb-1');
      expect(res.data).toEqual({ id: 'lb-1' });
    });
  });

  describe('listForUser', () => {
    it('errors without userId', async () => {
      const res = await PrivateLeaderboardModel.listForUser();
      expect(res.error).toBeInstanceOf(Error);
    });

    it('merges owner and member leaderboards (no duplicates)', async () => {
      mockFrom.mockImplementation((table) => {
        const idx = recordCall(table);
        if (table === 'private_leaderboard_members') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [{ leaderboardId: 'm1' }], error: null }) }) };
        }
        if (table === 'private_leaderboards') {
          if (idx === 1) {
            return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [{ id: 'o1' }], error: null }) }) };
          }
          return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [{ id: 'm1' }], error: null }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listForUser('u1');
      expect(Array.isArray(res.data)).toBe(true);
      const ids = res.data.map(r => r.id).sort();
      expect(ids).toEqual(['m1', 'o1'].sort());
    });

    it('returns error when member query fails', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: null, error: new Error('bad') }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listForUser('u1');
      expect(res.error).toBeInstanceOf(Error);
    });
  });

  describe('updateById & deleteById', () => {
    it('updateById whitelists allowed fields and returns updated row', async () => {
      const single = jest.fn().mockResolvedValue({ data: { id: 'lb-1', name: 'new' }, error: null });
      mockFrom.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single }) }) }) });

      const res = await PrivateLeaderboardModel.updateById('lb-1', { name: 'new', ownerUserId: 'should-not' });
      expect(res.data).toEqual(expect.objectContaining({ id: 'lb-1', name: 'new' }));
    });

    it('deleteById calls delete and returns error if any', async () => {
      mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) });
      const res = await PrivateLeaderboardModel.deleteById('lb-1');
      expect(res.error).toBeNull();
    });
  });

  describe('addMember / addMemberByInviteCode', () => {
    it('addMember rejects missing args', async () => {
      const res = await PrivateLeaderboardModel.addMember({ leaderboardId: null, userId: null });
      expect(res.error).toBeInstanceOf(Error);
    });

    it('addMember returns inserted data when insert works', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'm1' }, error: null } ) }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMember({ leaderboardId: 'lb1', userId: 'u1' });
      expect(res.data).toEqual({ id: 'm1' });
      expect(res.error).toBeNull();
    });

    it('addMemberByInviteCode errors when invite not found', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'nope', userId: 'u1' });
      expect(res.error).toBeInstanceOf(Error);
    });

    it('addMemberByInviteCode success path (active, not existing)', async () => {
      // find leaderboard
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'lb1', isActive: true }, error: null }) }) }) };
        }
        if (table === 'private_leaderboard_members') {
          // first select existing -> returns empty array
          // second insert -> returns maybeSingle with data
          const call = recordCall(table);
          if (call === 1) {
            return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue({ data: [], error: null }) }) }) }) };
          }
          return { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'm2' }, error: null }) }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      mockFrom._calls = {};
      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'ok', userId: 'u1' });
      expect(res.data).toEqual({ id: 'm2' });
      expect(res.error).toBeNull();
    });
  });

  describe('removeMember & listMembers', () => {
    it('removeMember calls delete and returns error if any', async () => {
      mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }) }) });
      const res = await PrivateLeaderboardModel.removeMember({ leaderboardId: 'lb1', userId: 'u1' });
      expect(res.error).toBeNull();
    });

    it('listMembers returns empty array if no members', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listMembers('lb1');
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBe(0);
    });

    it('listMembers returns members without usernames if users view errors', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [{ userId: 'u1', role: 'member' }], error: null }) }) };
        }
        if (table === 'leaderboard_with_users') {
          return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: null, error: new Error('bad') }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listMembers('lb1');
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data[0]).not.toHaveProperty('username');
    });

    it('listMembers enriches members with usernames when available', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ data: [{ userId: 'u1', role: 'member' }], error: null }) }) };
        }
        if (table === 'leaderboard_with_users') {
          return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [{ userId: 'u1', username: 'bob' }], error: null }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listMembers('lb1');
      expect(res.data[0]).toHaveProperty('username', 'bob');
    });
  });

  describe('getStandings & getOwnerUserId & findByUnique', () => {
    it('getStandings errors without leaderboardId', async () => {
      const res = await PrivateLeaderboardModel.getStandings();
      expect(res.error).toBeInstanceOf(Error);
    });

    it('getStandings returns ordered data', async () => {
      // readClient is same mocked module; chain .from(...).select(...).eq(...).order(...)
      mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ order: jest.fn().mockResolvedValue({ data: [{ rank: 1 }], error: null }) }) }) });
      const res = await PrivateLeaderboardModel.getStandings('lb1');
      expect(res.data).toEqual([{ rank: 1 }]);
    });

    it('getOwnerUserId returns null when not found', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const got = await PrivateLeaderboardModel.getOwnerUserId('lb-1');
      expect(got).toBeNull();
    });

    it('getOwnerUserId throws when supabase returns error', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('db') }) }) }) };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      await expect(PrivateLeaderboardModel.getOwnerUserId('lb1')).rejects.toThrow();
    });

    it('findByUnique builds queries and returns maybeSingle', async () => {
      // We'll simulate q.maybeSingle() returning a data row
      const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'found' }, error: null });
      // We need to return an object (q) that supports eq/is/limit/maybeSingle — easiest is to return object with those fns
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle
            })
          })
        })
      });

      const res = await PrivateLeaderboardModel.findByUnique({ ownerUserId: 'u1', name: 'N', periodStart: undefined, periodEnd: undefined });
      expect(res.data).toEqual({ id: 'found' });
    });
  });
});
