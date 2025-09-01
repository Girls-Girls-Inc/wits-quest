// backend/tests/questController.test.js
const QuestController = require("../../controllers/questController");
const QuestModel = require("../../models/questModel");
const LeaderboardModel = require("../../models/leaderboardModel");
const { createClient } = require("@supabase/supabase-js");

jest.mock("../../models/questModel");
jest.mock("../../models/leaderboardModel");
jest.mock("@supabase/supabase-js");

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("QuestController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createQuest", () => {
    it("400 if missing fields", async () => {
      const req = { body: { name: "Quest" } };
      const res = mockRes();

      await QuestController.createQuest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Missing required fields" });
    });

    it("201 on success", async () => {
      const req = {
        body: {
          name: "Quest",
          collectibleId: "col1",
          locationId: "loc1",
          createdBy: "user1",
          pointsAchievable: "10",
        },
      };
      const res = mockRes();

      QuestModel.createQuest.mockResolvedValue({ data: [{ id: 1 }], error: null });

      await QuestController.createQuest(req, res);

      expect(QuestModel.createQuest).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Quest created successfully",
        quest: { id: 1 },
      });
    });
  });

  describe("getQuests", () => {
    it("returns quests", async () => {
      const req = { query: {} };
      const res = mockRes();

      QuestModel.getQuests.mockResolvedValue({ data: [{ id: 1 }], error: null });

      await QuestController.getQuests(req, res);

      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });
  });

  describe("add", () => {
    it("401 without bearer token", async () => {
      const req = { headers: {}, body: {} };
      const res = mockRes();

      await QuestController.add(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("201 when user adds quest", async () => {
      const req = {
        headers: { authorization: "Bearer abc" },
        body: { questId: "q1" },
      };
      const res = mockRes();

      const mockSb = {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }) },
      };
      createClient.mockReturnValue(mockSb);

      QuestModel.addForUser.mockResolvedValue({ data: [{ id: 123 }], error: null });

      await QuestController.add(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 123 });
    });
  });

  describe("mine", () => {
    it("returns user quests", async () => {
      const req = { headers: { authorization: "Bearer abc" } };
      const res = mockRes();

      const mockSb = {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }) },
      };
      createClient.mockReturnValue(mockSb);

      QuestModel.listForUser.mockResolvedValue({ data: [{ uq: 1 }], error: null });

      await QuestController.mine(req, res);

      expect(res.json).toHaveBeenCalledWith([{ uq: 1 }]);
    });
  });

  describe("complete", () => {
    it("404 if userQuest not found", async () => {
      const req = {
        headers: { authorization: "Bearer abc" },
        params: { id: "1" },
      };
      const res = mockRes();

      const mockSb = {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }) },
      };
      createClient.mockReturnValue(mockSb);

      QuestModel.getUserQuestById.mockResolvedValue({ data: null, error: null });

      await QuestController.complete(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("completes quest and awards points", async () => {
      const req = {
        headers: { authorization: "Bearer abc" },
        params: { id: "1" },
      };
      const res = mockRes();

      const mockSb = {
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }) },
      };
      createClient.mockReturnValue(mockSb);

      QuestModel.getUserQuestById.mockResolvedValue({
        data: { id: 1, userId: "user1", questId: "q1", isComplete: false },
        error: null,
      });
      QuestModel.getQuestById.mockResolvedValue({
        data: { id: "q1", pointsAchievable: 50 },
        error: null,
      });
      QuestModel.setCompleteById.mockResolvedValue({
        data: { id: 1, isComplete: true },
        error: null,
      });

      LeaderboardModel.addPointsAtomic.mockResolvedValue();

      await QuestController.complete(req, res);

      expect(LeaderboardModel.addPointsAtomic).toHaveBeenCalledWith({
        userId: "user1",
        points: 50,
      });
      expect(res.json).toHaveBeenCalledWith({
        ok: true,
        userQuest: { id: 1, isComplete: true },
        awarded: 50,
      });
    });
  });
});
