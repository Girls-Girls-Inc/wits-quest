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
  // ───────────────────────────── extra branches to improve coverage ─────────────────────────────
describe('PrivateLeaderboardModel — extra branches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom._calls = {};
  });

  describe('listForUser — more paths', () => {
    it('handles "no member ids" path (owner only)', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          // no rows -> empty memberIds -> memberPromise resolves to []
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'private_leaderboards') {
          // owner list returns one row
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ id: 'owner-only' }], error: null }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listForUser('u1');
      expect(res.error).toBeNull();
      expect(res.data.map((r) => r.id)).toEqual(['owner-only']);
    });

    it('surfaces ownerRes.error', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ leaderboardId: 'm1' }], error: null }),
            }),
          };
        }
        if (table === 'private_leaderboards') {
          // first call is ownerPromise -> returns error
          const idx = recordCall(table);
          if (idx === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: null, error: new Error('owner broken') }),
              }),
            };
          }
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listForUser('u1');
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error.message).toMatch(/owner broken/);
    });

    it('surfaces memberRes.error', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [{ leaderboardId: 'm1' }], error: null }),
            }),
          };
        }
        if (table === 'private_leaderboards') {
          const idx = recordCall(table);
          if (idx === 1) {
            // owner ok
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [{ id: 'o1' }], error: null }),
              }),
            };
          }
          // member lookup errors
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: new Error('member broken') }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listForUser('u1');
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error.message).toMatch(/member broken/);
    });
  });

  describe('addMember — conflict and other error paths', () => {
    it('on unique violation (code 23505) returns existing membership via fallback select', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: Object.assign(new Error('duplicate'), { code: '23505' }),
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [{ id: 'existing' }], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMember({ leaderboardId: 'lb', userId: 'u' });
      expect(res.data).toEqual({ id: 'existing' });
      expect(res.error).toBeNull();
    });

    it('returns error when insert fails with non-unique error', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: new Error('boom'),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMember({ leaderboardId: 'lb', userId: 'u' });
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
    });
  });

  describe('addMemberByInviteCode — more branches', () => {
    it('surfaces error when reading invite lookup fails', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('read fail') }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'X', userId: 'u' });
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error.message).toMatch(/read fail/);
    });

    it('rejects when leaderboard is inactive', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'lb', isActive: false }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'X', userId: 'u' });
      expect(res.error).toBeInstanceOf(Error);
      expect(res.error.message).toMatch(/inactive/i);
    });

    it('short-circuits when membership already exists', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'lb', isActive: true }, error: null }),
              }),
            }),
          };
        }
        if (table === 'private_leaderboard_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [{ id: 'exists' }], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'X', userId: 'u' });
      expect(res.data).toEqual({ id: 'exists' });
      expect(res.error).toBeNull();
    });

    it('insert conflict fallback (details includes "already exists")', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'lb', isActive: true }, error: null }),
              }),
            }),
          };
        }
        if (table === 'private_leaderboard_members') {
          const call = recordCall(table);
          if (call === 1) {
            // existing check -> none
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            };
          }
          // insert -> unique via "details"
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: null,
                  error: { details: 'already exists' },
                }),
              }),
            }),
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue({ data: [{ id: 'via-fallback' }], error: null }),
                }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'X', userId: 'u' });
      expect(res.data).toEqual({ id: 'via-fallback' });
      expect(res.error).toBeNull();
    });

    it('insert returns non-unique error -> surfaces error', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'lb', isActive: true }, error: null }),
              }),
            }),
          };
        }
        if (table === 'private_leaderboard_members') {
          const call = recordCall(table);
          if (call === 1) {
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    limit: jest.fn().mockResolvedValue({ data: [], error: null }),
                  }),
                }),
              }),
            };
          }
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: new Error('weird') }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.addMemberByInviteCode({ inviteCode: 'X', userId: 'u' });
      expect(res.data).toBeNull();
      expect(res.error).toBeInstanceOf(Error);
    });
  });

  describe('removeMember & listMembers — error paths', () => {
    it('removeMember returns error when delete fails', async () => {
      mockFrom.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: new Error('nope') }),
          }),
        }),
      });
      const res = await PrivateLeaderboardModel.removeMember({ leaderboardId: 'lb', userId: 'u' });
      expect(res.error).toBeInstanceOf(Error);
    });

    it('listMembers surfaces error from membership query', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: new Error('members fail') }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listMembers('lb');
      expect(res.error).toBeInstanceOf(Error);
      expect(res.data).toBeNull();
    });

    it('listMembers normalizes joined_at -> joinedAt', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboard_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ userId: 'u1', role: 'member', joined_at: '2020-01-01' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'leaderboard_with_users') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const res = await PrivateLeaderboardModel.listMembers('lb');
      expect(res.error).toBeNull();
      expect(res.data[0].joinedAt).toBe('2020-01-01');
    });
  });

  describe('getStandings / getOwnerUserId / findByUnique — more paths', () => {
    it('getStandings returns error when view fails', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: new Error('view fail') }),
          }),
        }),
      });
      const res = await PrivateLeaderboardModel.getStandings('lb1');
      expect(res.error).toBeInstanceOf(Error);
    });

    it('getOwnerUserId returns a value when found', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'private_leaderboards') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { ownerUserId: 'owner-1' }, error: null }),
              }),
            }),
          };
        }
        return { select: jest.fn().mockResolvedValue({ data: [], error: null }) };
      });

      const got = await PrivateLeaderboardModel.getOwnerUserId('lb-1');
      expect(got).toBe('owner-1');
    });

    it('findByUnique uses .is(null) for null periodStart/periodEnd', async () => {
      const calls = { is: [] };
      const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'ok' }, error: null });

      const q = {
        _filters: {},
        eq: jest.fn().mockImplementation(function (col, val) {
          this._filters[col] = val;
          return this;
        }),
        is: jest.fn().mockImplementation(function (col, val) {
          calls.is.push([col, val]);
          return this;
        }),
        limit: jest.fn().mockReturnValue({
          eq: function () { return this; }.bind(this), // chainable no-op (we won't hit it here)
          maybeSingle,
        }),
        maybeSingle,
      };

      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue(q),
      });

      const res = await PrivateLeaderboardModel.findByUnique({
        ownerUserId: 'u1',
        name: 'L',
        periodStart: null,
        periodEnd: null,
      });
      expect(res.data).toEqual({ id: 'ok' });
      // Ensure .is(null) used for both columns
      expect(calls.is).toEqual(expect.arrayContaining([
        ['periodStart', null],
        ['periodEnd', null],
      ]));
    });
  });
});

});
