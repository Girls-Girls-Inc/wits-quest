const supabase = require('../../supabase/supabaseClient');
const UserModel = require('../../models/userModel');

jest.mock('../../supabase/supabaseClient', () => ({
  from: jest.fn(),
}));

describe('UserModel', () => {
  let mockQuery;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset a fresh query chain for each test
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    supabase.from.mockReturnValue(mockQuery);
  });

  describe('getAllUsers', () => {
    it('should build query with filters and return data', async () => {
      mockQuery.order.mockResolvedValue({ data: [{ userId: '1' }], error: null });

      const result = await UserModel.getAllUsers({
        userId: '1',
        email: 'test@example.com',
        isModerator: true,
        createdBefore: '2024-01-01',
        createdAfter: '2023-01-01',
      });

      expect(supabase.from).toHaveBeenCalledWith('userData');
      expect(mockQuery.eq).toHaveBeenCalledWith('userId', '1');
      expect(mockQuery.ilike).toHaveBeenCalledWith('email', '%test@example.com%');
      expect(mockQuery.eq).toHaveBeenCalledWith('isModerator', true);
      expect(mockQuery.lte).toHaveBeenCalledWith('created_at', '2024-01-01');
      expect(mockQuery.gte).toHaveBeenCalledWith('created_at', '2023-01-01');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: true });
      expect(result).toEqual([{ userId: '1' }]);
    });

    it('should return [] when no data', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: null });
      const result = await UserModel.getAllUsers({});
      expect(result).toEqual([]);
    });

    it('should throw error if query fails', async () => {
      mockQuery.order.mockResolvedValue({ data: null, error: new Error('DB fail') });
      await expect(UserModel.getAllUsers({})).rejects.toThrow('DB fail');
    });
  });

  describe('getById', () => {
    it('should return data when found', async () => {
      mockQuery.single.mockResolvedValue({ data: { userId: '1' }, error: null });
      const result = await UserModel.getById('1');
      expect(mockQuery.eq).toHaveBeenCalledWith('userId', '1');
      expect(result).toEqual({ userId: '1' });
    });

    it('should return null when error.code = PGRST116 (no rows)', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });
      const result = await UserModel.getById('99');
      expect(result).toBeNull();
    });

    it('should throw other errors', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'SOME_OTHER', message: 'Unexpected' },
      });
      await expect(UserModel.getById('99')).rejects.toThrow('Unexpected');
    });
  });

  describe('updateById', () => {
    it('should update and return data', async () => {
      mockQuery.single.mockResolvedValue({ data: { userId: '1', isModerator: true }, error: null });
      const result = await UserModel.updateById('1', { isModerator: true });

      expect(mockQuery.update).toHaveBeenCalledWith({ isModerator: true });
      expect(mockQuery.eq).toHaveBeenCalledWith('userId', '1');
      expect(result).toEqual({ userId: '1', isModerator: true });
    });

    it('should throw error when update fails', async () => {
      mockQuery.single.mockResolvedValue({ data: null, error: new Error('Update failed') });
      await expect(UserModel.updateById('1', { isModerator: false })).rejects.toThrow(
        'Update failed'
      );
    });
  });
});
