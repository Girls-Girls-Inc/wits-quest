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
  describe('create (more branches)', () => {
  it('403 when RLS error bubbles from model', async () => {
    CollectiblesModel.create.mockRejectedValueOnce(
      new Error('violates row-level security on table "collectibles"')
    );
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      body: { name: 'X' },
    });
    await CollectiblesController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringMatching(/row-level security/i) })
    );
  });

  it('500 on unexpected model error', async () => {
    CollectiblesModel.create.mockRejectedValueOnce(new Error('weird'));
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      body: { name: 'X' },
    });
    await CollectiblesController.create(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'weird' });
  });

  it('passes optional fields and sets default createdAt', async () => {
    CollectiblesModel.create.mockResolvedValueOnce({ id: 9, name: 'N' });
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      body: {
        id: 9,
        name: '  N  ',
        description: 'desc',
        imageUrl: 'https://x/y.png',
      },
    });
    await CollectiblesController.create(req, res);
    expect(CollectiblesModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        name: 'N',
        description: 'desc',
        imageUrl: 'https://x/y.png',
        createdAt: expect.any(String), // defaulted
      }),
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('update (more branches)', () => {
  it('400 invalid id', async () => {
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '-1' },
      body: { name: 'X' },
    });
    await CollectiblesController.update(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
  });

  it('200 success with allowed fields only', async () => {
    CollectiblesModel.update.mockResolvedValueOnce({ id: 1, name: 'OK', imageUrl: null });
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '1' },
      body: { name: 'OK', description: null, imageUrl: null, ignored: 'nope' },
    });
    await CollectiblesController.update(req, res);
    expect(CollectiblesModel.update).toHaveBeenCalledWith(
      1,
      { name: 'OK', description: null, imageUrl: null },
      expect.any(Object)
    );
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'OK', imageUrl: null });
  });

  it('500 generic error', async () => {
    CollectiblesModel.update.mockRejectedValueOnce(new Error('boom'));
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '2' },
      body: { name: 'X' },
    });
    await CollectiblesController.update(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
  });
});

describe('remove (more branches)', () => {
  it('401 when no token', async () => {
    const { req, res } = mockReqRes({ params: { id: '1' } });
    await CollectiblesController.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('400 invalid id', async () => {
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '1.5' },
    });
    await CollectiblesController.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid id' });
  });

  it('403 on RLS violation', async () => {
    CollectiblesModel.remove.mockRejectedValueOnce(new Error('row-level security'));
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '3' },
    });
    await CollectiblesController.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'row-level security' });
  });

  it('204 success', async () => {
    CollectiblesModel.remove.mockResolvedValueOnce(undefined);
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { id: '4' },
    });
    await CollectiblesController.remove(req, res);
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('earnForUser', () => {
  it('401 when no token', async () => {
    const { req, res } = mockReqRes({ params: { userId: 'u1', collectibleId: '1' } });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('401 when unauthenticated', async () => {
    // make this client return null user
    const client = createClient();
    client.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'u1', collectibleId: '1' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthenticated' });
  });

  it('400 invalid collectibleId', async () => {
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'u1', collectibleId: 'x' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid collectibleId' });
  });

  it('403 not permitted when caller != user and not moderator', async () => {
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'someone-else', collectibleId: '5' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not permitted' });
  });

  it('201 success when awarding self', async () => {
    CollectiblesModel.addToInventory.mockResolvedValueOnce({ ok: true });
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'u1', collectibleId: '7' },
      body: { earnedAt: '2024-01-01T00:00:00Z' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(CollectiblesModel.addToInventory).toHaveBeenCalledWith(
      'u1',
      7,
      '2024-01-01T00:00:00Z',
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('201 success when moderator awarding others', async () => {
    // Override isModerator to return true for this request
    const client = createClient();
    client.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: { isModerator: true }, error: null }),
        })),
      })),
    });
    CollectiblesModel.addToInventory.mockResolvedValueOnce({ ok: true });

    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'someone-else', collectibleId: '9' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('500 when model throws', async () => {
    CollectiblesModel.addToInventory.mockRejectedValueOnce(new Error('db add fail'));
    const { req, res } = mockReqRes({
      headers: { authorization: 'Bearer token' },
      params: { userId: 'u1', collectibleId: '1' },
    });
    await CollectiblesController.earnForUser(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'db add fail' });
  });
});

describe('getCollectibles (simple list)', () => {
  it('returns [] when model returns non-array', async () => {
    CollectiblesModel.getCollectibles.mockResolvedValueOnce(null);
    const { req, res } = mockReqRes({ query: { name: 'ab' } });
    await CollectiblesController.getCollectibles(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('500 when model errors', async () => {
    CollectiblesModel.getCollectibles.mockRejectedValueOnce(new Error('fail'));
    const { req, res } = mockReqRes({ query: {} });
    await CollectiblesController.getCollectibles(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });
});

describe('getOne (extra invalid id branches)', () => {
  it('400 when id is negative', async () => {
    const { req, res } = mockReqRes({ params: { id: '-5' } });
    await CollectiblesController.getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
  it('400 when id is float', async () => {
    const { req, res } = mockReqRes({ params: { id: '3.14' } });
    await CollectiblesController.getOne(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('listUserCollectibles – isModerator error path returns false', () => {
  it('treats moderator check error as non-mod and blocks other user', async () => {
    // Force maybeSingle to return an error for the isModerator query
    const client = createClient();
    client.from.mockReturnValueOnce({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'oops' } }),
        })),
      })),
    });

    const { req, res } = mockReqRes({
      params: { userId: 'another' },
      headers: { authorization: 'Bearer token' },
    });
    await CollectiblesController.listUserCollectibles(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not permitted' });
  });
});

});