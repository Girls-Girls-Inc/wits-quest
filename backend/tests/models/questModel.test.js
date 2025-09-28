// backend/tests/models/questModel.test.js
const mockChain = {
  insert: jest.fn(() => mockChain),
  select: jest.fn(() => mockChain),
  update: jest.fn(() => mockChain),
  delete: jest.fn(() => mockChain),
  eq: jest.fn(() => mockChain),
  order: jest.fn(() => mockChain),
  single: jest.fn(() =>
    Promise.resolve({ data: { id: 1, name: "Quest 1" }, error: null })
  ),
  maybeSingle: jest.fn(() =>
    Promise.resolve({ data: { id: 1, name: "Quest 1" }, error: null })
  ),
};

const mockFrom = jest.fn(() => mockChain);

jest.mock("@supabase/supabase-js", () => {
  return {
    createClient: jest.fn(() => ({
      from: mockFrom,
    })),
  };
});

const { createClient } = require("@supabase/supabase-js");
const QuestModel = require("../../models/questModel");

describe("QuestModel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createQuest", () => {
    it("inserts quest data into quests table", async () => {
      await QuestModel.createQuest({ name: "Quest 1" });
      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockChain.insert).toHaveBeenCalledWith([{ name: "Quest 1" }]);
      expect(mockChain.select).toHaveBeenCalled();
    });
  });

  describe("getQuests", () => {
    it("fetches quests without filters", async () => {
      await QuestModel.getQuests({});
      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockChain.select).toHaveBeenCalledWith("*");
    });

    it("applies filters when provided", async () => {
      const filter = { id: 1, createdBy: "user1", isActive: true };
      await QuestModel.getQuests(filter);

      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockChain.eq).toHaveBeenCalledWith("id", 1);
      expect(mockChain.eq).toHaveBeenCalledWith("createdBy", "user1");
      expect(mockChain.eq).toHaveBeenCalledWith("isActive", true);
    });
  });

  describe("addForUser", () => {
    it("inserts a user quest", async () => {
      const payload = { userId: "user1", questId: "q1" };
      await QuestModel.addForUser(payload);
      expect(mockFrom).toHaveBeenCalledWith("userQuests");
      expect(mockChain.insert).toHaveBeenCalledWith([payload]);
      expect(mockChain.select).toHaveBeenCalled();
    });
  });

  describe("listForUser", () => {
    it("lists quests for a given user", async () => {
      await QuestModel.listForUser("user1");
      expect(mockFrom).toHaveBeenCalledWith("userQuests");
      expect(mockChain.eq).toHaveBeenCalledWith("userId", "user1");
      expect(mockChain.order).toHaveBeenCalledWith("id", { ascending: true });
    });
  });

  describe("getUserQuestById", () => {
    it("fetches a user quest by id", async () => {
      await QuestModel.getUserQuestById(1);
      expect(mockFrom).toHaveBeenCalledWith("userQuests");
      expect(mockChain.eq).toHaveBeenCalledWith("id", 1);
      expect(mockChain.maybeSingle).toHaveBeenCalled();
    });
  });

  describe("setCompleteById", () => {
    it("marks a user quest complete", async () => {
      await QuestModel.setCompleteById(1);
      expect(mockFrom).toHaveBeenCalledWith("userQuests");
      expect(mockChain.update).toHaveBeenCalled();
      expect(mockChain.eq).toHaveBeenCalledWith("id", 1);
      expect(mockChain.eq).toHaveBeenCalledWith("isComplete", false);
      expect(mockChain.maybeSingle).toHaveBeenCalled();
    });
  });

  describe("getQuestById", () => {
    it("selects a quest by id", async () => {
      await QuestModel.getQuestById("q1");
      expect(mockFrom).toHaveBeenCalledWith("quests");
      expect(mockChain.eq).toHaveBeenCalledWith("id", "q1");
      expect(mockChain.maybeSingle).toHaveBeenCalled();
    });
  });
});
