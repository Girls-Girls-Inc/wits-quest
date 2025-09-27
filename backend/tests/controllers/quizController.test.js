// backend/tests/controllers/quizController.test.js

// -----------------------------
// 1. Mock supabase BEFORE import
// -----------------------------
const mockAuth = {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
};
const mockFrom = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { isModerator: true } }),
};

jest.mock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => ({
        auth: mockAuth,
        from: jest.fn(() => mockFrom),
    })),
}));

// -----------------------------
// 2. Now import controller + model
// -----------------------------
const QuizController = require("../../controllers/quizController");
const QuizModel = require("../../models/quizModel");

// -----------------------------
// 3. Mock QuizModel
// -----------------------------
jest.mock("../../models/quizModel");

// -----------------------------
// Helpers
// -----------------------------
function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
}

describe("QuizController", () => {
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = mockRes();

        // Default: user is moderator
        mockFrom.maybeSingle.mockResolvedValue({ data: { isModerator: true }, error: null });
    });

    // -----------------------------
    // CREATE
    // -----------------------------
    describe("create", () => {
        it("400 if questionText or questionType missing", async () => {
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if unsupported type", async () => {
            const req = {
                headers: { authorization: "Bearer token" },
                body: { questionText: "Q", questionType: "weird", correctAnswer: "A" },
            };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if MCQ but too few options", async () => {
            const req = {
                headers: { authorization: "Bearer token" },
                body: { questionText: "Q", questionType: "mcq", options: ["A"], correctAnswer: "A" },
            };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if MCQ but answer not in options", async () => {
            const req = {
                headers: { authorization: "Bearer token" },
                body: { questionText: "Q", questionType: "mcq", options: ["A", "B"], correctAnswer: "C" },
            };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("201 on success", async () => {
            QuizModel.create.mockResolvedValue({ data: { id: 1 }, error: null });
            const req = {
                headers: { authorization: "Bearer token" },
                body: { questionText: "Q", questionType: "text", correctAnswer: "A" },
            };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ quiz: { id: 1 } }));
        });

        it("500 if model returns error", async () => {
            QuizModel.create.mockResolvedValue({ data: null, error: new Error("db fail") });
            const req = {
                headers: { authorization: "Bearer token" },
                body: { questionText: "Q", questionType: "text", correctAnswer: "A" },
            };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "db fail" });
        });
    });

    // -----------------------------
    // UPDATE
    // -----------------------------
    describe("update", () => {
        it("400 if no id", async () => {
            const req = { headers: { authorization: "Bearer token" }, params: {}, body: {} };
            await QuizController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("200 on success", async () => {
            QuizModel.update.mockResolvedValue({ data: { id: 1, questionText: "New" }, error: null });
            const req = {
                headers: { authorization: "Bearer token" },
                params: { id: "1" },
                body: { questionText: "New", questionType: "text", correctAnswer: "A" },
            };
            await QuizController.update(req, res);
            expect(res.json).toHaveBeenCalledWith({
                message: "Quiz updated successfully",
                quiz: { id: 1, questionText: "New" },
            });
        });

        it("500 if model returns error", async () => {
            QuizModel.update.mockResolvedValue({ data: null, error: new Error("db fail") });
            const req = {
                headers: { authorization: "Bearer token" },
                params: { id: "1" },
                body: { questionText: "Q", questionType: "text", correctAnswer: "A" },
            };
            await QuizController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "db fail" });
        });

        it("404 if model returns no data", async () => {
            QuizModel.update.mockResolvedValue({ data: null, error: null });
            const req = {
                headers: { authorization: "Bearer token" },
                params: { id: "1" },
                body: { questionText: "Q", questionType: "text", correctAnswer: "A" },
            };
            await QuizController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ message: "Quiz not found" });
        });
    });

    // -----------------------------
    // REMOVE
    // -----------------------------
    describe("remove", () => {
        it("400 if no id provided", async () => {
            const req = { headers: { authorization: "Bearer token" }, params: {} };
            await QuizController.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "Quiz id is required" });
        });

        it("404 if not found", async () => {
            QuizModel.remove.mockResolvedValue({ data: null, error: null });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("200 if deleted", async () => {
            QuizModel.remove.mockResolvedValue({ data: { id: 1 }, error: null });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.remove(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ quiz: { id: 1 } }));
        });

        it("500 if model returns error", async () => {
            QuizModel.remove.mockResolvedValue({ data: null, error: new Error("remove fail") });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "remove fail" });
        });
    });

    // -----------------------------
    // GET BY ID
    // -----------------------------
    describe("getById", () => {
        it("400 if no id", async () => {
            const req = { headers: { authorization: "Bearer token" }, params: {} };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("401 if missing bearer token", async () => {
            const req = { headers: {}, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ message: "Missing bearer token" });
        });

        it("404 if not found", async () => {
            QuizModel.getById.mockResolvedValue({ data: null, error: null });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it("200 if found", async () => {
            QuizModel.getById.mockResolvedValue({ data: { id: 1 }, error: null });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });

        it("500 if model returns error", async () => {
            QuizModel.getById.mockResolvedValue({ data: null, error: new Error("bad select") });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "bad select" });
        });

        it("500 if model throws unexpected error", async () => {
            QuizModel.getById.mockRejectedValue(new Error("unexpected"));
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "unexpected" });
        });
    });

    // -----------------------------
    // LIST
    // -----------------------------
    describe("list", () => {
        it("200 with quizzes", async () => {
            QuizModel.list.mockResolvedValue({
                data: [
                    { id: 1, questionText: "Q1" },
                    { id: 2, questionText: "Q2" },
                ],
                error: null,
            });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.json).toHaveBeenCalledWith([
                { id: 1, questionText: "Q1" },
                { id: 2, questionText: "Q2" },
            ]);
        });

        it("200 with [] if data is null", async () => {
            QuizModel.list.mockResolvedValue({ data: null, error: null });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("200 with [] if data is truthy but not an array", async () => {
            QuizModel.list.mockResolvedValue({ data: "not-an-array", error: null });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("500 if model returns error", async () => {
            QuizModel.list.mockResolvedValue({ data: null, error: new Error("db fail") });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "db fail" });
        });

        it("500 if model throws unexpectedly", async () => {
            QuizModel.list.mockRejectedValue(new Error("boom"));
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "boom" });
        });

        it("403 if user is not a moderator", async () => {
            mockFrom.maybeSingle.mockResolvedValueOnce({ data: { isModerator: false }, error: null });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
        });
    });

});
