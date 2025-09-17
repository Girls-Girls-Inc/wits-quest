const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-123' } } }),
    },
  })),
}));

jest.mock('../../models/questModel', () => ({
  createQuest: jest.fn(),
  getQuests: jest.fn(),
  addForUser: jest.fn(),
  listForUser: jest.fn(),
  getUserQuestById: jest.fn(),
  getQuestById: jest.fn(),
  setCompleteById: jest.fn(),
  updateQuest: jest.fn(),
  deleteQuest: jest.fn(),
}));

jest.mock('../../models/leaderboardModel', () => ({
  addPointsAtomic: jest.fn(),
}));

const { createClient } = require('@supabase/supabase-js');
const QuestModel = require('../../models/questModel');
const LeaderboardModel = require('../../models/leaderboardModel');
const QuestController = require('../../controllers/questController');

describe('QuestController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u-123' } } }) },
    });
  });

  // ───────────────────────────────── createQuest
  describe('createQuest', () => {
    it('401 when no bearer token', async () => {
      const req = { headers: {}, body: {} };
      const res = makeRes();
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing bearer token' });
    });

    it('401 when unauthenticated', async () => {
      createClient.mockReturnValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      });
      const req = { headers: { authorization: 'Bearer x' }, body: {} };
      const res = makeRes();
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthenticated' });
    });

    it('400 when required fields missing', async () => {
      const req = { headers: { authorization: 'Bearer x' }, body: { name: 'Q1' } };
      const res = makeRes();
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing required fields' });
    });

    it('201 on success', async () => {
      QuestModel.createQuest.mockResolvedValue({
        data: [{ id: 1, name: 'Q' }],
        error: null,
      });
      const req = {
        headers: { authorization: 'Bearer x' },
        body: { name: 'Q', collectibleId: 1, locationId: 2, pointsAchievable: 10 },
      };
      const res = makeRes();
      await QuestController.createQuest(req, res);

      expect(QuestModel.createQuest).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Quest created successfully',
        quest: { id: 1, name: 'Q' },
      });
    });

    it('500 on model error', async () => {
      QuestModel.createQuest.mockResolvedValue({ data: null, error: { message: 'db fail' } });
      const req = {
        headers: { authorization: 'Bearer x' },
        body: { name: 'Q', collectibleId: 1, locationId: 2 },
      };
      const res = makeRes();
      await QuestController.createQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'db fail' });
    });
  });

  // ───────────────────────────────── getQuests
  describe('getQuests', () => {
    it('200 returns data', async () => {
      QuestModel.getQuests.mockResolvedValue({ data: [{ id: 1 }], error: null });
      const req = { query: { createdBy: 'u-123' } };
      const res = makeRes();
      await QuestController.getQuests(req, res);
      expect(QuestModel.getQuests).toHaveBeenCalledWith({ createdBy: 'u-123' });
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('500 on error', async () => {
      QuestModel.getQuests.mockResolvedValue({ data: null, error: { message: 'oops' } });
      const req = { query: {} };
      const res = makeRes();
      await QuestController.getQuests(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'oops' });
    });
  });

  // ───────────────────────────────── add (POST /user-quests)
  describe('add', () => {
    it('401 without token', async () => {
      const req = { headers: {}, body: {} };
      const res = makeRes();
      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 when questId missing', async () => {
      const req = { headers: { authorization: 'Bearer x' }, body: {} };
      const res = makeRes();
      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'questId is required' });
    });

    it('201 on success', async () => {
      QuestModel.addForUser.mockResolvedValue({ data: [{ id: 99 }], error: null });
      const req = { headers: { authorization: 'Bearer x' }, body: { questId: 1 } };
      const res = makeRes();
      await QuestController.add(req, res);
      expect(QuestModel.addForUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 99 });
    });

    it('400 on model error', async () => {
      QuestModel.addForUser.mockResolvedValue({ data: null, error: { message: 'bad' } });
      const req = { headers: { authorization: 'Bearer x' }, body: { questId: 2 } };
      const res = makeRes();
      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'bad' });
    });
  });

  // ───────────────────────────────── mine (GET /user-quests)
  describe('mine', () => {
    it('401 no token', async () => {
      const req = { headers: {} };
      const res = makeRes();
      await QuestController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('200 list', async () => {
      QuestModel.listForUser.mockResolvedValue({ data: [{ id: 1 }], error: null });
      const req = { headers: { authorization: 'Bearer x' } };
      const res = makeRes();
      await QuestController.mine(req, res);
      expect(QuestModel.listForUser).toHaveBeenCalledWith('u-123', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    it('400 on model error', async () => {
      QuestModel.listForUser.mockResolvedValue({ data: null, error: { message: 'err' } });
      const req = { headers: { authorization: 'Bearer x' } };
      const res = makeRes();
      await QuestController.mine(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'err' });
    });
  });

  // ───────────────────────────────── complete (POST /user-quests/:id/complete)
  describe('complete', () => {
    const baseReq = () => ({ headers: { authorization: 'Bearer x' }, params: { id: '12' }, body: {} });

    it('400 invalid id', async () => {
      const req = { headers: { authorization: 'Bearer x' }, params: { id: 'abc' } };
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid userQuest id' });
    });

    it('403 when user does not own the row', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'someone-else', questId: 7, isComplete: false },
        error: null,
      });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('409 when already complete', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: true },
        error: null,
      });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Quest already completed' });
    });

    it('404 when userQuest not found', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({ data: null, error: null });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when getUserQuestById error', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({ data: null, error: { message: 'bad' } });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'bad' });
    });

    it('400 when getQuestById error', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({ data: null, error: { message: 'q-err' } });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'q-err' });
    });

    it('404 when quest not found', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({ data: null, error: null });
      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('400 when setCompleteById error', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({ data: { id: 7, pointsAchievable: 10 }, error: null });
      QuestModel.setCompleteById.mockResolvedValue({ data: null, error: { message: 'upd-err' } });

      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'upd-err' });
    });

    it('409 when nothing to update', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({ data: { id: 7, pointsAchievable: 10 }, error: null });
      QuestModel.setCompleteById.mockResolvedValue({ data: null, error: null });

      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nothing to update' });
    });

    it('200 on success; awards points', async () => {
      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 12, userId: 'u-123', questId: 7, isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({ data: { id: 7, pointsAchievable: 10 }, error: null });
      QuestModel.setCompleteById.mockResolvedValue({ data: { id: 12, isComplete: true }, error: null });
      LeaderboardModel.addPointsAtomic.mockResolvedValue({ ok: true, method: 'rpc' });

      const req = baseReq();
      const res = makeRes();
      await QuestController.complete(req, res);

      expect(LeaderboardModel.addPointsAtomic).toHaveBeenCalledWith({
        userId: 'u-123',
        points: 10,
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        userQuest: { id: 12, isComplete: true },
        awarded: 10,
      });
    });
  });

  // ───────────────────────────────── updateQuest
  describe('updateQuest', () => {
    it('401 no token', async () => {
      const req = { headers: {}, params: { id: '1' }, body: {} };
      const res = makeRes();
      await QuestController.updateQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('404 when no row updated', async () => {
      QuestModel.updateQuest.mockResolvedValue({ data: null, error: null });
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '10' },
        body: { pointsAchievable: 5 },
      };
      const res = makeRes();
      await QuestController.updateQuest(req, res);
      expect(QuestModel.updateQuest).toHaveBeenCalledWith(10, expect.any(Object), expect.any(Object));
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Quest not found' });
    });

    it('200 on success', async () => {
      const updated = { id: 10, pointsAchievable: 5 };
      QuestModel.updateQuest.mockResolvedValue({ data: updated, error: null });
      const req = {
        headers: { authorization: 'Bearer x' },
        params: { id: '10' },
        body: { pointsAchievable: 5 },
      };
      const res = makeRes();
      await QuestController.updateQuest(req, res);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Quest updated successfully',
        quest: updated,
      });
    });
  });

  // ───────────────────────────────── deleteQuest
  describe('deleteQuest', () => {
    it('401 no token', async () => {
      const req = { headers: {}, params: { id: '1' } };
      const res = makeRes();
      await QuestController.deleteQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('404 when no row deleted', async () => {
      QuestModel.deleteQuest.mockResolvedValue({ data: null, error: null });
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '55' } };
      const res = makeRes();
      await QuestController.deleteQuest(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Quest not found' });
    });

    it('200 on success', async () => {
      QuestModel.deleteQuest.mockResolvedValue({ data: { id: 55 }, error: null });
      const req = { headers: { authorization: 'Bearer x' }, params: { id: '55' } };
      const res = makeRes();
      await QuestController.deleteQuest(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Quest deleted successfully', quest: { id: 55 } });
    });
  });
});