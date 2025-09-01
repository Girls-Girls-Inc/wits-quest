// backend/tests/controllers/collectiblesController.test.js
const CollectiblesController = require('../../controllers/collectiblesController');
const CollectiblesModel = require('../../models/collectiblesModel');
const { createClient } = require('@supabase/supabase-js');

jest.mock('../../models/collectiblesModel');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ data: [], error: null }) })),
    })),
  })),
}));

function mockReqRes({ params = {}, query = {}, body = {}, headers = {} } = {}) {
  const req = { params, query, body, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

describe('CollectiblesController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listUserCollectibles', () => {
    it('returns 401 if no bearer token', async () => {
      const { req, res } = mockReqRes({ params: { userId: 'user123' } });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing bearer token' });
    });

    it('returns 401 if user is unauthenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ 
        data: { user: null } 
      });
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'user123' },
        headers: { authorization: 'Bearer token' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthenticated' });
    });

    it('returns 403 if non-moderator tries to view other user', async () => {
      const { req, res } = mockReqRes({ 
        params: { userId: 'otherUser' },
        headers: { authorization: 'Bearer token' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not permitted' });
    });

    it('allows user to view their own collectibles', async () => {
      CollectiblesModel.listInventoryForUser.mockResolvedValue([
        { id: 1, name: 'Gold Medal', earnedAt: '2023-01-01' }
      ]);
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'user123' },
        headers: { authorization: 'Bearer token' },
        query: { limit: '10', offset: '0' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(CollectiblesModel.listInventoryForUser).toHaveBeenCalledWith(
        'user123',
        { limit: 10, offset: 0 },
        mockSupabaseClient
      );
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: 'Gold Medal', earnedAt: '2023-01-01' }
      ]);
    });

    it('allows moderator to view any user collectibles', async () => {
      mockSupabaseClient.from().maybeSingle.mockResolvedValueOnce({
        data: { isModerator: true },
        error: null
      });
      
      CollectiblesModel.listInventoryForUser.mockResolvedValue([
        { id: 2, name: 'Silver Medal' }
      ]);
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'otherUser' },
        headers: { authorization: 'Bearer token' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(res.json).toHaveBeenCalledWith([
        { id: 2, name: 'Silver Medal' }
      ]);
    });

    it('enforces limit boundaries', async () => {
      CollectiblesModel.listInventoryForUser.mockResolvedValue([]);
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'user123' },
        headers: { authorization: 'Bearer token' },
        query: { limit: '1000', offset: '-5' } // over limit, negative offset
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(CollectiblesModel.listInventoryForUser).toHaveBeenCalledWith(
        'user123',
        { limit: 500, offset: 0 }, // clamped values
        mockSupabaseClient
      );
    });

    it('handles database errors', async () => {
      CollectiblesModel.listInventoryForUser.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'user123' },
        headers: { authorization: 'Bearer token' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Database connection failed' });
    });
  });

  describe('list', () => {
    it('returns collectibles with default pagination', async () => {
      CollectiblesModel.list.mockResolvedValue({ 
        data: [{ id: 1, name: 'Gold Medal' }] 
      });
      
      const { req, res } = mockReqRes({ query: {} });
      
      await CollectiblesController.list(req, res);
      
      expect(CollectiblesModel.list).toHaveBeenCalledWith({ 
        search: '', 
        limit: 50, 
        offset: 0 
      });
      expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Gold Medal' }]);
    });

    it('applies search and pagination parameters', async () => {
      CollectiblesModel.list.mockResolvedValue({ data: [] });
      
      const { req, res } = mockReqRes({ 
        query: { search: 'medal', limit: '25', offset: '10' }
      });
      
      await CollectiblesController.list(req, res);
      
      expect(CollectiblesModel.list).toHaveBeenCalledWith({ 
        search: 'medal', 
        limit: 25, 
        offset: 10 
      });
    });

    it('enforces limit boundaries', async () => {
      CollectiblesModel.list.mockResolvedValue({ data: [] });
      
      const { req, res } = mockReqRes({ 
        query: { limit: '500', offset: '-10' }
      });
      
      await CollectiblesController.list(req, res);
      
      expect(CollectiblesModel.list).toHaveBeenCalledWith({ 
        search: '', 
        limit: 200, // max limit
        offset: 0   // min offset
      });
    });

    it('handles invalid limit and offset values', async () => {
      CollectiblesModel.list.mockResolvedValue({ data: [] });
      
      const { req, res } = mockReqRes({ 
        query: { limit: 'invalid', offset: 'invalid' }
      });
      
      await CollectiblesController.list(req, res);
      
      expect(CollectiblesModel.list).toHaveBeenCalledWith({ 
        search: '', 
        limit: 50, // default
        offset: 0  // default
      });
    });

    it('handles database errors', async () => {
      CollectiblesModel.list.mockRejectedValue(new Error('DB Error'));
      
      const { req, res } = mockReqRes();
      
      await CollectiblesController.list(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('getOne', () => {
    it('returns a collectible if found', async () => {
      CollectiblesModel.getById.mockResolvedValue({ 
        id: 1, 
        name: 'Gold Medal' 
      });
      
      const { req, res } = mockReqRes({ params: { id: '1' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(CollectiblesModel.getById).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Gold Medal' });
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns 404 if not found', async () => {
      CollectiblesModel.getById.mockResolvedValue(null);
      
      const { req, res } = mockReqRes({ params: { id: '1' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Collectible not found' });
    });

    it('returns 400 for invalid id', async () => {
      const { req, res } = mockReqRes({ params: { id: 'invalid' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
      expect(CollectiblesModel.getById).not.toHaveBeenCalled();
    });

    it('returns 400 for negative id', async () => {
      const { req, res } = mockReqRes({ params: { id: '-1' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('returns 400 for decimal id', async () => {
      const { req, res } = mockReqRes({ params: { id: '1.5' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('handles database errors', async () => {
      CollectiblesModel.getById.mockRejectedValue(new Error('DB connection lost'));
      
      const { req, res } = mockReqRes({ params: { id: '1' } });
      
      await CollectiblesController.getOne(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Collectible not found' });
    });
  });

  describe('create', () => {
    it('returns 401 if no token', async () => {
      const { req, res } = mockReqRes();
      
      await CollectiblesController.create(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing bearer token' });
    });

    it('returns 400 if name is missing', async () => {
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        body: {} 
      });
      
      await CollectiblesController.create(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'name is required' });
    });

    it('returns 400 if name is empty string', async () => {
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        body: { name: '   ' }
      });
      
      await CollectiblesController.create(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'name is required' });
    });

    it('creates collectible successfully with minimal data', async () => {
      CollectiblesModel.create.mockResolvedValue({ 
        id: 1, 
        name: 'Gold Medal' 
      });
      
      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { name: 'Gold Medal' },
      });
      
      await CollectiblesController.create(req, res);
      
      expect(CollectiblesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ 
          name: 'Gold Medal',
          description: null,
          imageUrl: null
        }),
        mockSupabaseClient
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Gold Medal' });
    });

    it('creates collectible with all fields', async () => {
      CollectiblesModel.create.mockResolvedValue({ 
        id: 2, 
        name: 'Silver Medal',
        description: 'A shiny silver medal',
        imageUrl: 'https://example.com/silver.jpg'
      });
      
      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { 
          name: 'Silver Medal',
          description: 'A shiny silver medal',
          imageUrl: 'https://example.com/silver.jpg',
          createdAt: '2023-01-01T00:00:00Z'
        },
      });
      
      await CollectiblesController.create(req, res);
      
      expect(CollectiblesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ 
          name: 'Silver Medal',
          description: 'A shiny silver medal',
          imageUrl: 'https://example.com/silver.jpg',
          createdAt: '2023-01-01T00:00:00Z'
        }),
        mockSupabaseClient
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('trims whitespace from name', async () => {
      CollectiblesModel.create.mockResolvedValue({ 
        id: 1, 
        name: 'Trimmed Name' 
      });
      
      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { name: '  Trimmed Name  ' },
      });
      
      await CollectiblesController.create(req, res);
      
      expect(CollectiblesModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Trimmed Name' }),
        mockSupabaseClient
      );
    });

    it('handles database errors', async () => {
      CollectiblesModel.create.mockRejectedValue(new Error('DB Error'));
      
      const { req, res } = mockReqRes({
        headers: { authorization: 'Bearer token' },
        body: { name: 'Test' },
      });
      
      await CollectiblesController.create(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
    });
  });

  describe('update', () => {
    it('returns 401 if no token', async () => {
      const { req, res } = mockReqRes({ 
        params: { id: '1' }, 
        body: { name: 'Updated' } 
      });
      
      await CollectiblesController.update(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing bearer token' });
    });

    it('returns 400 for invalid id', async () => {
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' },
        params: { id: 'invalid' }, 
        body: { name: 'Updated' } 
      });
      
      await CollectiblesController.update(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('updates collectible successfully', async () => {
      CollectiblesModel.update.mockResolvedValue({ 
        id: 1, 
        name: 'Updated Medal' 
      });
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' },
        params: { id: '1' }, 
        body: { name: 'Updated Medal', description: 'New description' } 
      });
      
      await CollectiblesController.update(req, res);
      
      expect(CollectiblesModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Updated Medal',
          description: 'New description'
        }),
        mockSupabaseClient
      );
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Updated Medal' });
    });

    it('returns 403 on RLS violation', async () => {
      CollectiblesModel.update.mockRejectedValue(
        new Error('violates row-level security')
      );
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        params: { id: '1' }, 
        body: { name: 'Updated' } 
      });
      
      await CollectiblesController.update(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'violates row-level security' });
    });

    it('returns 500 on other database errors', async () => {
      CollectiblesModel.update.mockRejectedValue(new Error('Connection timeout'));
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        params: { id: '1' }, 
        body: { name: 'Updated' } 
      });
      
      await CollectiblesController.update(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Connection timeout' });
    });
  });

  describe('remove', () => {
    it('returns 401 if no token', async () => {
      const { req, res } = mockReqRes({ params: { id: '1' } });
      
      await CollectiblesController.remove(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Missing bearer token' });
    });

    it('returns 400 for invalid id', async () => {
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' },
        params: { id: 'invalid' } 
      });
      
      await CollectiblesController.remove(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
    });

    it('removes collectible successfully', async () => {
      CollectiblesModel.remove.mockResolvedValue({ success: true });
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' },
        params: { id: '1' } 
      });
      
      await CollectiblesController.remove(req, res);
      
      expect(CollectiblesModel.remove).toHaveBeenCalledWith(1, mockSupabaseClient);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    it('returns 403 on RLS violation', async () => {
      CollectiblesModel.remove.mockRejectedValue(
        new Error('violates row-level security')
      );
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        params: { id: '1' } 
      });
      
      await CollectiblesController.remove(req, res);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'violates row-level security' });
    });

    it('returns 500 on database error', async () => {
      CollectiblesModel.remove.mockRejectedValue(new Error('db crash'));
      
      const { req, res } = mockReqRes({ 
        headers: { authorization: 'Bearer token' }, 
        params: { id: '1' } 
      });
      
      await CollectiblesController.remove(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'db crash' });
    });
  });
});