// backend/tests/middleware/auth.test.js
const { requireAuth } = require('../../middleware/auth');

// Provide a mocked supabase admin client with an auth.getUser function.
// Use a factory in jest.mock so tests can change the mock implementation by requiring the module.
jest.mock('../../supabase/supabaseClient', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

const admin = require('../../supabase/supabaseClient');

describe('requireAuth middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('returns 401 when Authorization header is missing', async () => {
    // no req.headers.authorization
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is malformed (not Bearer)', async () => {
    req.headers.authorization = 'Token abc';
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing or malformed Authorization header' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is missing after Bearer', async () => {
    req.headers.authorization = 'Bearer ';
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Missing token' }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when supabase returns error / no user', async () => {
    req.headers.authorization = 'Bearer sometoken';
    // simulate supabase auth.getUser returning an error
    admin.auth.getUser.mockResolvedValue({ data: null, error: new Error('invalid') });

    await requireAuth(req, res, next);
    expect(admin.auth.getUser).toHaveBeenCalledWith('sometoken');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid or expired token' }));
    expect(next).not.toHaveBeenCalled();

    // simulate supabase returning no user
    admin.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches req.user when token is valid', async () => {
    req.headers.authorization = 'Bearer validtoken';
    const fakeUser = { id: 'u1', email: 'a@b.com', user_metadata: { name: 'Ada' } };

    admin.auth.getUser.mockResolvedValue({ data: { user: fakeUser }, error: null });

    await requireAuth(req, res, next);

    expect(admin.auth.getUser).toHaveBeenCalledWith('validtoken');
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: fakeUser.id,
      email: fakeUser.email,
      user_metadata: fakeUser.user_metadata || {}
    });
    expect(req.accessToken).toBe('validtoken');
    // ensure we did not send a response
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 500 when an unexpected exception is thrown', async () => {
    req.headers.authorization = 'Bearer boom';
    admin.auth.getUser.mockRejectedValue(new Error('network down'));

    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Auth error' }));
    expect(next).not.toHaveBeenCalled();
  });
});
