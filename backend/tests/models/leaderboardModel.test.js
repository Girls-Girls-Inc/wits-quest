// backend/tests/models/leaderboardModel.test.js
import { createClient } from '@supabase/supabase-js';
import LeaderboardModel from '../../models/leaderboardModel';

jest.mock('@supabase/supabase-js');

describe('LeaderboardModel', () => {
  let mockRpc, mockFrom, mockSelect, mockInsert;

  beforeEach(() => {
    // fresh mocks every test
    mockRpc = jest.fn();
    mockSelect = jest.fn();
    mockInsert = jest.fn();

    mockFrom = jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    }));

    // supabase client "factory"
    createClient.mockReturnValue({
      rpc: mockRpc,
      from: mockFrom,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addPointsAtomic', () => {
    it('calls rpc and succeeds', async () => {
      mockRpc.mockResolvedValue({ data: { success: true }, error: null });

      const result = await LeaderboardModel.addPointsAtomic({
        userId: '123',
        points: 10,
      });

      expect(mockRpc).toHaveBeenCalledWith('add_points_atomic', {
        user_id: '123',
        points_to_add: 10,
      });

      expect(result).toEqual({ success: true });
    });

    it('returns error when rpc fails', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'fail' } });

      const result = await LeaderboardModel.addPointsAtomic({
        userId: '123',
        points: 5,
      });

      expect(result).toEqual({ error: 'fail' });
    });
  });

  describe('getLeaderboard', () => {
    it('fetches leaderboard successfully', async () => {
      mockSelect.mockResolvedValue({
        data: [{ user_id: '123', points: 50 }],
        error: null,
      });

      const result = await LeaderboardModel.getLeaderboard();

      expect(mockFrom).toHaveBeenCalledWith('leaderboard');
      expect(mockSelect).toHaveBeenCalled();
      expect(result).toEqual([{ user_id: '123', points: 50 }]);
    });

    it('handles select error', async () => {
      mockSelect.mockResolvedValue({ data: null, error: { message: 'db error' } });

      const result = await LeaderboardModel.getLeaderboard();

      expect(result).toEqual({ error: 'db error' });
    });
  });

  describe('createEntry', () => {
    it('inserts new entry', async () => {
      mockInsert.mockResolvedValue({
        data: { user_id: '123', points: 0 },
        error: null,
      });

      const result = await LeaderboardModel.createEntry({ userId: '123' });

      expect(mockFrom).toHaveBeenCalledWith('leaderboard');
      expect(mockInsert).toHaveBeenCalledWith([{ user_id: '123', points: 0 }]);
      expect(result).toEqual({ user_id: '123', points: 0 });
    });

    it('handles insert error', async () => {
      mockInsert.mockResolvedValue({ data: null, error: { message: 'insert fail' } });

      const result = await LeaderboardModel.createEntry({ userId: '123' });

      expect(result).toEqual({ error: 'insert fail' });
    });
  });
});
