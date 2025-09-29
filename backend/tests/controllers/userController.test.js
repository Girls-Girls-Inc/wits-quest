
const UserController = require('../../controllers/userController');
const UserModel = require('../../models/userModel');

// Mock the response object
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

jest.mock('../../models/userModel');

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /* ================= getAllUsers ================= */
  describe('getAllUsers', () => {
    it('returns users when model resolves (with Authorization token)', async () => {
      const req = {
        headers: { authorization: 'Bearer tok-123' },
        query: { email: 'ignored@by.controller' }, // controller does not parse filters
      };
      const res = mockResponse();

      const fakeUsers = [{ userId: '1', email: 'a@b.com', isModerator: true }];
      UserModel.getAllUsers.mockResolvedValue(fakeUsers);

      await UserController.getAllUsers(req, res);

      // Controller passes ONLY the token to the model
      expect(UserModel.getAllUsers).toHaveBeenCalledWith('tok-123');
      expect(res.json).toHaveBeenCalledWith(fakeUsers);
    });

    it('still calls model with undefined token when header missing', async () => {
      const req = { headers: {}, query: {} };
      const res = mockResponse();

      UserModel.getAllUsers.mockResolvedValue([]);

      await UserController.getAllUsers(req, res);

      expect(UserModel.getAllUsers).toHaveBeenCalledWith(undefined);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('handles model error with 500', async () => {
      const req = { headers: { authorization: 'Bearer tok' }, query: {} };
      const res = mockResponse();

      UserModel.getAllUsers.mockRejectedValue(new Error('DB fail'));

      await UserController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });
  });

  /* ================= getUserById ================= */
  describe('getUserById', () => {
    it('200 when user found', async () => {
      const req = { params: { id: 'u1' } };
      const res = mockResponse();

      const fake = { userId: 'u1', email: 'u@e.com' };
      UserModel.getById.mockResolvedValue(fake);

      await UserController.getUserById(req, res);

      expect(UserModel.getById).toHaveBeenCalledWith('u1');
      expect(res.json).toHaveBeenCalledWith(fake);
    });

    it('404 when user missing', async () => {
      const req = { params: { id: 'u-missing' } };
      const res = mockResponse();

      UserModel.getById.mockResolvedValue(null);

      await UserController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('500 on model throw', async () => {
      const req = { params: { id: 'bad' } };
      const res = mockResponse();

      UserModel.getById.mockRejectedValue(new Error('boom'));

      await UserController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'boom' });
    });
  });

  /* ================= patchUser ================= */
  describe('patchUser', () => {
    it('updates user and returns updated (token present)', async () => {
      const req = {
        params: { id: 'u2' },
        body: { isModerator: true },
        headers: { authorization: 'Bearer tok-999' },
      };
      const res = mockResponse();

      const updated = { userId: 'u2', isModerator: true };
      UserModel.updateById.mockResolvedValue(updated);

      await UserController.patchUser(req, res);

      // Controller passes (id, updates, token)
      expect(UserModel.updateById).toHaveBeenCalledWith('u2', { isModerator: true }, 'tok-999');
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('passes undefined token when header absent', async () => {
      const req = {
        params: { id: 'u2' },
        body: { isModerator: false },
        headers: {},
      };
      const res = mockResponse();

      const updated = { userId: 'u2', isModerator: false };
      UserModel.updateById.mockResolvedValue(updated);

      await UserController.patchUser(req, res);

      expect(UserModel.updateById).toHaveBeenCalledWith('u2', { isModerator: false }, undefined);
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('falls back to request echo when model returns null', async () => {
      const req = {
        params: { id: 'u3' },
        body: { isModerator: false },
        headers: { authorization: 'Bearer tok' },
      };
      const res = mockResponse();

      UserModel.updateById.mockResolvedValue(null);

      await UserController.patchUser(req, res);

      expect(UserModel.updateById).toHaveBeenCalledWith('u3', { isModerator: false }, 'tok');
      expect(res.json).toHaveBeenCalledWith({ userId: 'u3', isModerator: false });
    });

    it('500 when model throws', async () => {
      const req = {
        params: { id: 'u4' },
        body: { isModerator: true },
        headers: { authorization: 'Bearer tok' },
      };
      const res = mockResponse();

      UserModel.updateById.mockRejectedValue(new Error('DB fail'));

      await UserController.patchUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });

    it('handles thrown error (explicit branch)', async () => {
      const req = {
        params: { id: 'u5' },
        body: { isModerator: true },
      };
      const res = mockResponse();

      UserModel.updateById.mockRejectedValue(new Error('Forced failure'));

      await UserController.patchUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forced failure' });
    });
  });
});
