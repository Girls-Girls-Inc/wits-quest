// backend/tests/controllers/privateLeaderboardController.test.js
const PrivateLeaderboardController = require('../../controllers/privateLeaderboardController');
const PrivateLeaderboardModel = require('../../models/privateLeaderboardModel');

jest.mock('../../models/privateLeaderboardModel');

describe('PrivateLeaderboardController (extended)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { user: { id: 'owner-1' }, body: {}, params: {}, query: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  describe('create', () => {
    it('returns 401 when no user', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when name missing', async () => {
      req.user = { id: 'u1' };
      req.body = { description: 'no name' };
      await PrivateLeaderboardController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'name is required' }));
    });

    it('logs non-fatal addMember error but still returns created data (201)', async () => {
      // create returns data
      req.user = { id: 'owner-1' };
      req.body = { name: 'LB' };
      PrivateLeaderboardModel.create.mockResolvedValue({ data: { id: 'lb-1', name: 'LB' }, error: null });
      // addMember returns an error (non-fatal path)
      PrivateLeaderboardModel.addMember.mockResolvedValue({ data: null, error: new Error('unique') });

      // spy console.warn to ensure non-fatal branch executed
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      await PrivateLeaderboardController.create(req, res);

      expect(PrivateLeaderboardModel.create).toHaveBeenCalled();
      expect(PrivateLeaderboardModel.addMember).toHaveBeenCalledWith(expect.objectContaining({
        leaderboardId: 'lb-1', userId: 'owner-1', role: 'owner'
      }));
      expect(warnSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'lb-1' }));

      warnSpy.mockRestore();
    });

    it('returns 400 when model.create returns error', async () => {
      req.user = { id: 'owner-1' };
      req.body = { name: 'LB' };
      PrivateLeaderboardModel.create.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.anything() }));
    });

    it('returns 500 when create throws unexpected exception', async () => {
      req.user = { id: 'owner-1' };
      req.body = { name: 'LB' };
      PrivateLeaderboardModel.create.mockRejectedValue(new Error('boom'));

      await PrivateLeaderboardController.create(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });
  });

  describe('list', () => {
    it('returns single leaderboard when id in query', async () => {
      req.query.id = 'lb-1';
      PrivateLeaderboardModel.findById.mockResolvedValue({ data: { id: 'lb-1' }, error: null });

      await PrivateLeaderboardController.list(req, res);
      expect(PrivateLeaderboardModel.findById).toHaveBeenCalledWith('lb-1');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'lb-1' }));
    });

    it('returns single leaderboard when id in params', async () => {
      req.params.id = 'lb-2';
      PrivateLeaderboardModel.findById.mockResolvedValue({ data: { id: 'lb-2' }, error: null });

      await PrivateLeaderboardController.list(req, res);
      expect(PrivateLeaderboardModel.findById).toHaveBeenCalledWith('lb-2');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'lb-2' }));
    });

    it('returns 400 when findById returns error', async () => {
      req.params.id = 'x';
      PrivateLeaderboardModel.findById.mockResolvedValue({ data: null, error: new Error('db') });

      await PrivateLeaderboardController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when id not found', async () => {
      req.params.id = 'notfound';
      PrivateLeaderboardModel.findById.mockResolvedValue({ data: null, error: null });

      await PrivateLeaderboardController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    it('returns listForUser when no id and user exists', async () => {
      req.user = { id: 'owner-1' };
      PrivateLeaderboardModel.listForUser.mockResolvedValue({ data: [{ id: 'a' }], error: null });

      await PrivateLeaderboardController.list(req, res);
      expect(PrivateLeaderboardModel.listForUser).toHaveBeenCalledWith('owner-1');
      expect(res.json).toHaveBeenCalledWith([{ id: 'a' }]);
    });

    it('returns 400 when listForUser returns error', async () => {
      req.user = { id: 'owner-1' };
      PrivateLeaderboardModel.listForUser.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 401 when no user and no id', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles unexpected exception with 500', async () => {
      req.user = { id: 'owner-1' };
      PrivateLeaderboardModel.listForUser.mockRejectedValue(new Error('boom'));
      await PrivateLeaderboardController.list(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('standings', () => {
    it('returns 401 when no user', async () => {
      req.user = undefined;
      req.params.id = 'lb-1';
      await PrivateLeaderboardController.standings(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when listMembers returns error', async () => {
      req.user = { id: 'u1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.standings(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 when not member and not owner', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: [{ userId: 'u3' }], error: null });
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');

      await PrivateLeaderboardController.standings(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Not a member' }));
    });

    it('returns standings when allowed (member)', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: [{ userId: 'u2' }], error: null });
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.getStandings.mockResolvedValue({ data: [{ rank: 1 }], error: null });

      await PrivateLeaderboardController.standings(req, res);
      expect(PrivateLeaderboardModel.getStandings).toHaveBeenCalledWith('lb-1');
      expect(res.json).toHaveBeenCalledWith([{ rank: 1 }]);
    });

    it('returns 400 when getStandings returns error', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: [{ userId: 'owner-1' }], error: null });
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.getStandings.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.standings(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles unexpected exception with 500', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.listMembers.mockRejectedValue(new Error('boom'));
      await PrivateLeaderboardController.standings(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('joinByCode', () => {
    it('returns 401 when no user', async () => {
      req.user = undefined;
      req.body = { code: 'ABC' };
      await PrivateLeaderboardController.joinByCode(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when code missing', async () => {
      req.user = { id: 'u1' };
      req.body = {};
      await PrivateLeaderboardController.joinByCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when addMemberByInviteCode errors', async () => {
      req.user = { id: 'u1' };
      req.body = { code: 'ABC' };
      PrivateLeaderboardModel.addMemberByInviteCode.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.joinByCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('joins successfully', async () => {
      req.user = { id: 'u1' };
      req.body = { code: 'ABC' };
      PrivateLeaderboardModel.addMemberByInviteCode.mockResolvedValue({ data: { id: 'm1' }, error: null });

      await PrivateLeaderboardController.joinByCode(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Joined', member: { id: 'm1' } }));
    });
  });

  describe('inviteMember', () => {
    it('requires auth', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('requires userId in body', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = {};
      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 if caller not owner', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      req.body = { userId: 'u3' };
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');

      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('invites successfully when owner', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = { userId: 'u3', role: 'member' };
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.addMember.mockResolvedValue({ data: { id: 'm1' }, error: null });

      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    });

    it('returns 400 if addMember errors', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = { userId: 'u3' };
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.addMember.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles unexpected exception with 500', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = { userId: 'u3' };
      PrivateLeaderboardModel.getOwnerUserId.mockRejectedValue(new Error('boom'));
      await PrivateLeaderboardController.inviteMember(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('listMembers', () => {
    it('requires auth', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.listMembers(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 if not owner', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      await PrivateLeaderboardController.listMembers(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('lists members successfully for owner', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: [{ userId: 'u1' }], error: null });

      await PrivateLeaderboardController.listMembers(req, res);
      expect(res.json).toHaveBeenCalledWith([{ userId: 'u1' }]);
    });

    it('returns 400 when listMembers returns error', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.listMembers.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.listMembers(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeMember', () => {
    it('requires auth', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 if caller not owner and not self', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      req.params.userId = 'u3';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');

      await PrivateLeaderboardController.removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows owner to remove member', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.params.userId = 'u3';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.removeMember.mockResolvedValue({ error: null });

      await PrivateLeaderboardController.removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('returns 400 when removeMember returns error', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.params.userId = 'u3';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.removeMember.mockResolvedValue({ error: new Error('bad') });

      await PrivateLeaderboardController.removeMember(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('update', () => {
    it('requires auth', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 if not owner', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');

      await PrivateLeaderboardController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('updates successfully when owner', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = { name: 'new' };
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.updateById.mockResolvedValue({ data: { id: 'lb-1', name: 'new' }, error: null });

      await PrivateLeaderboardController.update(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'lb-1', name: 'new' }));
    });

    it('returns 400 when updateById returns error', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      req.body = { name: 'new' };
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.updateById.mockResolvedValue({ data: null, error: new Error('bad') });

      await PrivateLeaderboardController.update(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('delete', () => {
    it('requires auth', async () => {
      req.user = undefined;
      await PrivateLeaderboardController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 403 if not owner', async () => {
      req.user = { id: 'u2' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      await PrivateLeaderboardController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deletes successfully when owner', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.deleteById.mockResolvedValue({ error: null });

      await PrivateLeaderboardController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('returns 400 when deleteById returns error', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockResolvedValue('owner-1');
      PrivateLeaderboardModel.deleteById.mockResolvedValue({ error: new Error('bad') });

      await PrivateLeaderboardController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles unexpected exception with 500', async () => {
      req.user = { id: 'owner-1' };
      req.params.id = 'lb-1';
      PrivateLeaderboardModel.getOwnerUserId.mockRejectedValue(new Error('boom'));

      await PrivateLeaderboardController.delete(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
