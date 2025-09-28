// backend/tests/controllers/collectiblesController.test.js
const CollectiblesController = require('../../controllers/collectiblesController');
const CollectiblesModel = require('../../models/collectiblesModel');
const { createClient } = require('@supabase/supabase-js');

jest.mock('../../models/collectiblesModel');

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: jest.fn(() => ({
      select: jest.fn(() => ({ 
        eq: jest.fn(() => ({ 
          maybeSingle: jest.fn().mockResolvedValue({ data: { isModerator: false }, error: null }) 
        }))
      })),
    })),
  })),
}));

function mockReqRes({ params = {}, query = {}, body = {}, headers = {} } = {}) {
  const req = { params, query, body, headers };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
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
      // Mock the specific client instance for this test
      const mockClient = createClient();
      mockClient.auth.getUser.mockResolvedValueOnce({ 
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
        params: { userId: 'u1' }, // Match the mocked user ID
        headers: { authorization: 'Bearer token' },
        query: { limit: '10', offset: '0' }
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(CollectiblesModel.listInventoryForUser).toHaveBeenCalledWith(
        'u1',
        { limit: 10, offset: 0 },
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith([
        { id: 1, name: 'Gold Medal', earnedAt: '2023-01-01' }
      ]);
    });

    it('allows moderator to view any user collectibles', async () => {
      // Override the mock for this specific test
      const mockClient = createClient();
      mockClient.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { isModerator: true },
              error: null
            })
          }))
        }))
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
        params: { userId: 'u1' }, // Match the mocked user ID
        headers: { authorization: 'Bearer token' },
        query: { limit: '1000', offset: '-5' } // over limit, negative offset
      });
      
      await CollectiblesController.listUserCollectibles(req, res);
      
      expect(CollectiblesModel.listInventoryForUser).toHaveBeenCalledWith(
        'u1',
        { limit: 500, offset: 0 }, // clamped values
        expect.any(Object)
      );
    });

    it('handles database errors', async () => {
      CollectiblesModel.listInventoryForUser.mockRejectedValue(
        new Error('Database connection failed')
      );
      
      const { req, res } = mockReqRes({ 
        params: { userId: 'u1' },
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
    });

    it('returns 404 if not found (caught as error)', async () => {
      // Based on your controller, it seems like "not found" is handled in the catch block
      CollectiblesModel.getById.mockRejectedValue(new Error('Not found'));
      
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

    it('creates collectible successfully', async () => {
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
        expect.objectContaining({ name: 'Gold Medal' }),
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'Gold Medal' });
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
  });

  describe('remove', () => {
    it('returns 500 on db error', async () => {
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