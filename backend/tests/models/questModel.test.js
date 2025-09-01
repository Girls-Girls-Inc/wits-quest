// backend/tests/models/questModel.test.js
jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn(() => ({
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: 1, name: "Quest 1" }], error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
  };
});

const QuestModel = require("../../models/questModel");

describe("QuestModel", () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: 1, name: "Quest 1" }], error: null }),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe("createQuest", () => {
    it("inserts quest data into quests table", async () => {
      await QuestModel.createQuest({ name: "Quest 1" }, mockSupabase);
      expect(mockSupabase.from).toHaveBeenCalledWith("quests");
      expect(mockSupabase.insert).toHaveBeenCalledWith([{ name: "Quest 1" }]);
      expect(mockSupabase.select).toHaveBeenCalled();
    });
  });

  describe("getQuests", () => {
    it("fetches quests without filters", async () => {
      await QuestModel.getQuests({}, mockSupabase);
      expect(mockSupabase.from).toHaveBeenCalledWith("quests");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
    });

    it("applies filters when provided", async () => {
      const filter = { id: 1, createdBy: "user1", isActive: true };
      await QuestModel.getQuests(filter, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("quests");
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("createdBy", "user1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("isActive", true);
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
    });
  });

  describe("addForUser", () => {
    it("inserts a user quest", async () => {
      const payload = { userId: "user1", questId: "q1" };
      await QuestModel.addForUser(payload, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("userQuests");
      expect(mockSupabase.insert).toHaveBeenCalledWith([payload]);
      expect(mockSupabase.select).toHaveBeenCalled();
    });
  });

  describe("listForUser", () => {
    it("lists quests for a given user", async () => {
      await QuestModel.listForUser("user1", mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("userQuests");
      expect(mockSupabase.select).toHaveBeenCalledWith(
        "id, userId, questId, step, isComplete, completedAt, quests(*)"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("userId", "user1");
      expect(mockSupabase.order).toHaveBeenCalledWith("id", { ascending: true });
    });
  });

  describe("getUserQuestById", () => {
    it("fetches a user quest by id", async () => {
      await QuestModel.getUserQuestById(1, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("userQuests");
      expect(mockSupabase.select).toHaveBeenCalledWith(
        "id, userId, questId, step, isComplete, completedAt"
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });

  describe("setCompleteById", () => {
    it("marks a user quest complete", async () => {
      await QuestModel.setCompleteById(1, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("userQuests");
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ isComplete: true })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", 1);
      expect(mockSupabase.eq).toHaveBeenCalledWith("isComplete", false);
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });

  describe("getQuestById", () => {
    it("selects a quest by id", async () => {
      await QuestModel.getQuestById("q1", mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith("quests");
      expect(mockSupabase.select).toHaveBeenCalledWith("*");
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "q1");
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });
});
