// backend/controllers/__tests__/controllers/userController.test.js
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

  describe('getAllUsers', () => {
    it('should return users when model succeeds', async () => {
      const req = { query: { email: 'test@example.com', isModerator: 'true' } };
      const res = mockResponse();

      const fakeUsers = [{ userId: '1', email: 'test@example.com', isModerator: true }];
      UserModel.getAllUsers.mockResolvedValue(fakeUsers);

      await UserController.getAllUsers(req, res);

      expect(UserModel.getAllUsers).toHaveBeenCalledWith({
        userId: undefined,
        email: 'test@example.com',
        isModerator: true,
        createdBefore: undefined,
        createdAfter: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(fakeUsers);
    });

    it('should handle errors from model', async () => {
      const req = { query: {} };
      const res = mockResponse();

      UserModel.getAllUsers.mockRejectedValue(new Error('DB fail'));

      await UserController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'DB fail' });
    });

    it('should ignore malformed isModerator value', async () => {
      const req = { query: { isModerator: 'maybe' } };
      const res = mockResponse();

      UserModel.getAllUsers.mockResolvedValue([]);

      await UserController.getAllUsers(req, res);

      expect(UserModel.getAllUsers).toHaveBeenCalledWith({
        userId: undefined,
        email: undefined,
        isModerator: undefined, // malformed ignored
        createdBefore: undefined,
        createdAfter: undefined,
      });
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getUserById', () => {
    it('should return a user if found', async () => {
      const req = { params: { id: '1' } };
      const res = mockResponse();

      const fakeUser = { userId: '1', email: 'u@e.com' };
      UserModel.getById.mockResolvedValue(fakeUser);

      await UserController.getUserById(req, res);

      expect(UserModel.getById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(fakeUser);
    });

    it('should return 404 if not found', async () => {
      const req = { params: { id: '2' } };
      const res = mockResponse();

      UserModel.getById.mockResolvedValue(null);

      await UserController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle errors from model', async () => {
      const req = { params: { id: '3' } };
      const res = mockResponse();

      UserModel.getById.mockRejectedValue(new Error('Unexpected fail'));

      await UserController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected fail' });
    });
  });

  describe('patchUser', () => {
    it('should update user and return updated data', async () => {
      const req = { params: { id: '1' }, body: { isModerator: true } };
      const res = mockResponse();

      const updatedUser = { userId: '1', isModerator: true };
      UserModel.updateById.mockResolvedValue(updatedUser);

      await UserController.patchUser(req, res);

      expect(UserModel.updateById).toHaveBeenCalledWith('1', { isModerator: true });
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });

    it('should fall back to returning request data if updateById returns null', async () => {
      const req = { params: { id: '1' }, body: { isModerator: false } };
      const res = mockResponse();

      UserModel.updateById.mockResolvedValue(null);

      await UserController.patchUser(req, res);

      expect(res.json).toHaveBeenCalledWith({ userId: '1', isModerator: false });
    });

    it('should handle errors from model', async () => {
      const req = { params: { id: '1' }, body: { isModerator: true } };
      const res = mockResponse();

      UserModel.updateById.mockRejectedValue(new Error('DB fail'));

      await UserController.patchUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'DB fail' });
    });

    it('should handle thrown error gracefully', async () => {
      const req = { params: { id: '99' }, body: { isModerator: true } };
      const res = mockResponse();

      UserModel.updateById.mockRejectedValue(new Error('Forced failure'));

      await UserController.patchUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forced failure' });
    });
  });
});
