// backend/tests/models/collectiblesModel.test.js
const CollectiblesModel = require('../../models/collectiblesModel');
const { createClient } = require('@supabase/supabase-js');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  })),
}));

describe('CollectiblesModel', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = createClient();
  });

  describe('list', () => {
    it('returns data and count', async () => {
      mockClient.range.mockResolvedValue({ data: [{ id: 1 }], error: null, count: 1 });
      const result = await CollectiblesModel.list({ search: '', limit: 10, offset: 0 }, mockClient);
      expect(result).toEqual({ data: [{ id: 1 }], count: 1 });
    });

    it('throws on error', async () => {
      mockClient.range.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.list({}, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('getById', () => {
    it('returns single item', async () => {
      mockClient.single.mockResolvedValue({ data: { id: 1 }, error: null });
      const result = await CollectiblesModel.getById(1, mockClient);
      expect(result).toEqual({ id: 1 });
    });

    it('throws on error', async () => {
      mockClient.single.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.getById(1, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('listInventoryForUser', () => {
    it('returns mapped collectibles', async () => {
      mockClient.range.mockResolvedValue({
        data: [
          { collectible: { id: 1, name: 'Gold', description: null, imageUrl: null, createdAt: 'now' }, earnedAt: '2025-01-01' }
        ],
        error: null
      });
      const result = await CollectiblesModel.listInventoryForUser('u1', { limit: 1, offset: 0 }, mockClient);
      expect(result).toEqual([{ id: 1, name: 'Gold', description: null, imageUrl: null, createdAt: 'now', earnedAt: '2025-01-01' }]);
    });

    it('throws on error', async () => {
      mockClient.range.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.listInventoryForUser('u1', {}, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('create', () => {
    it('inserts and returns data', async () => {
      mockClient.select.mockResolvedValue({ data: { id: 1, name: 'Gold' }, error: null });
      const result = await CollectiblesModel.create({ name: 'Gold' }, mockClient);
      expect(result).toEqual({ id: 1, name: 'Gold' });
    });

    it('throws on error', async () => {
      mockClient.select.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.create({ name: 'Gold' }, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('update', () => {
    it('updates and returns data', async () => {
      mockClient.single.mockResolvedValue({ data: { id: 1, name: 'Silver' }, error: null });
      const result = await CollectiblesModel.update(1, { name: 'Silver' }, mockClient);
      expect(result).toEqual({ id: 1, name: 'Silver' });
    });

    it('throws on error', async () => {
      mockClient.single.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.update(1, {}, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('remove', () => {
    it('deletes successfully', async () => {
      mockClient.delete.mockResolvedValue({ error: null });
      await expect(CollectiblesModel.remove(1, mockClient)).resolves.toBeUndefined();
    });

    it('throws on error', async () => {
      mockClient.delete.mockResolvedValue({ error: new Error('fail') });
      await expect(CollectiblesModel.remove(1, mockClient)).rejects.toThrow('fail');
    });
  });

  describe('getCollectibles', () => {
    it('returns filtered collectibles', async () => {
      mockClient.order.mockResolvedValue({ data: [{ id: 1, name: 'Gold' }], error: null });
      const result = await CollectiblesModel.getCollectibles(1, 'Gold', mockClient);
      expect(result).toEqual([{ id: 1, name: 'Gold' }]);
    });

    it('throws on error', async () => {
      mockClient.order.mockResolvedValue({ data: null, error: new Error('fail') });
      await expect(CollectiblesModel.getCollectibles(1, 'Gold', mockClient)).rejects.toThrow('fail');
    });
  });
});
