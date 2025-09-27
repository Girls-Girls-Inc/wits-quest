// backend/tests/controllers/quizController.test.js
const QuizController = require("../../controllers/quizController");
const QuizModel = require("../../models/quizModel");

// Mock QuizModel (all DB calls)
jest.mock("../../models/quizModel");

// Mock supabase-js client
jest.mock("@supabase/supabase-js", () => ({
    createClient: jest.fn(() => ({
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user1" } } }),
        },
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: { isModerator: true } }),
    })),
}));

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
    });

    describe("create", () => {
        it("400 if questionText or questionType missing", async () => {
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if unsupported type", async () => {
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "Q", questionType: "weird", correctAnswer: "A" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if MCQ but too few options", async () => {
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "Q", questionType: "mcq", options: ["A"], correctAnswer: "A" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("400 if MCQ but answer not in options", async () => {
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "Q", questionType: "mcq", options: ["A", "B"], correctAnswer: "C" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("201 on success", async () => {
            QuizModel.create.mockResolvedValue({ data: { id: 1 }, error: null });
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "Q", questionType: "text", correctAnswer: "A" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ quiz: { id: 1 } }));
        });

        it("500 if model returns error", async () => {
            QuizModel.create.mockResolvedValue({ data: null, error: new Error("db fail") });
            const req = { headers: { authorization: "Bearer token" }, body: { questionText: "Q", questionType: "text", correctAnswer: "A" } };
            await QuizController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("update", () => {
        it("400 if no id", async () => {
            const req = { headers: { authorization: "Bearer token" }, params: {}, body: {} };
            await QuizController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("404 if quiz not found", async () => {
            QuizModel.update.mockResolvedValue({ data: null, error: null });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" }, body: { questionText: "Q", questionType: "text", correctAnswer: "A" } };
            await QuizController.update(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

    });

    describe("remove", () => {
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
    });

    describe("getById", () => {
        it("400 if no id", async () => {
            const req = { headers: { authorization: "Bearer token" }, params: {} };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
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
    describe("list", () => {
        it("200 with quizzes", async () => {
            QuizModel.list.mockResolvedValue({
                data: [{ id: 1, questionText: "Q1" }, { id: 2, questionText: "Q2" }],
                error: null,
            });

            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);

            expect(res.json).toHaveBeenCalledWith([
                { id: 1, questionText: "Q1" },
                { id: 2, questionText: "Q2" },
            ]);
        });

        it("500 if model returns error", async () => {
            QuizModel.list.mockResolvedValue({ data: null, error: new Error("db fail") });

            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "db fail" });
        });
    });
    it("200 with empty array if data is null", async () => {
        QuizModel.list.mockResolvedValue({ data: null, error: null });
        const req = { headers: { authorization: "Bearer token" } };
        await QuizController.list(req, res);
        expect(res.json).toHaveBeenCalledWith([]);
    });
    it("400 if no id provided on remove", async () => {
        const req = { headers: { authorization: "Bearer token" }, params: {} };
        await QuizController.remove(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Quiz id is required" });
    });
    it("401 if missing bearer token on getById", async () => {
        const req = { headers: {}, params: { id: "1" } };
        await QuizController.getById(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: "Missing bearer token" });
    });
    it("500 if model throws in list", async () => {
        QuizModel.list.mockRejectedValue(new Error("unexpected fail"));
        const req = { headers: { authorization: "Bearer token" } };
        await QuizController.list(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: "unexpected fail" });
    });

    describe("list", () => {
        it("200 with [] if data is not an array but truthy", async () => {
            QuizModel.list.mockResolvedValue({ data: "not-an-array", error: null });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });

        it("500 if model throws unexpectedly", async () => {
            QuizModel.list.mockRejectedValue(new Error("boom"));
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "boom" });
        });
    });

    describe("update", () => {
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
    });

    describe("remove", () => {
        it("500 if model returns error", async () => {
            QuizModel.remove.mockResolvedValue({ data: null, error: new Error("remove fail") });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "remove fail" });
        });
    });

    describe("getById", () => {
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
    describe("list", () => {
        it("403 if user is not a moderator", async () => {
            // force isModerator to return false
            jest.spyOn(QuizController, "list"); // optional if you stub isModerator separately
            const sb = {
                auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
                from: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn().mockResolvedValue({ data: { isModerator: false }, error: null }),
            };
            jest.spyOn(require("@supabase/supabase-js"), "createClient").mockReturnValue(sb);

            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
        });

        it("200 with [] if data is truthy but not an array", async () => {
            QuizModel.list.mockResolvedValue({ data: "not-an-array", error: null });
            const req = { headers: { authorization: "Bearer token" } };
            await QuizController.list(req, res);
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe("update", () => {
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

    describe("remove", () => {
        it("500 if model returns error", async () => {
            QuizModel.remove.mockResolvedValue({ data: null, error: new Error("remove fail") });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "remove fail" });
        });
    });

    describe("getById", () => {
        it("500 if model returns error", async () => {
            QuizModel.getById.mockResolvedValue({ data: null, error: new Error("bad select") });
            const req = { headers: { authorization: "Bearer token" }, params: { id: "1" } };
            await QuizController.getById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: "bad select" });
        });
    });


});
