// backend/tests/routes/quizRoutes.test.js
const request = require("supertest");
const express = require("express");

jest.mock("../../controllers/quizController", () => ({
    create: jest.fn((req, res) => res.status(201).json({ quiz: { id: 1 } })),
    list: jest.fn((req, res) => res.json([{ id: 1, questionText: "Q1" }])),
    update: jest.fn((req, res) => res.json({ quiz: { id: 1, questionText: "Updated" } })),
    remove: jest.fn((req, res) => res.json({ quiz: { id: 1 } })),
    getById: jest.fn((req, res) => res.json({ id: 1, questionText: "Q1" })),
}));

const quizRoutes = require("../../routes/quizRoutes");

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/", quizRoutes);
    return app;
}

describe("Quiz Routes (wiring)", () => {
    let app;
    beforeEach(() => {
        app = makeApp();
    });

    it("POST /quiz", async () => {
        const res = await request(app)
            .post("/quiz")
            .send({ questionText: "Q1", questionType: "text", correctAnswer: "A" });
        expect(res.statusCode).toBe(201);
        expect(res.body.quiz.id).toBe(1);
    });

    it("GET /quizzes", async () => {
        const res = await request(app).get("/quizzes");
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("PUT /quiz/:id", async () => {
        const res = await request(app)
            .put("/quiz/1")
            .send({ questionText: "Updated", questionType: "text", correctAnswer: "A" });
        expect(res.statusCode).toBe(200);
        expect(res.body.quiz.questionText).toBe("Updated");
    });

    it("DELETE /quiz/:id", async () => {
        const res = await request(app).delete("/quiz/1");
        expect(res.statusCode).toBe(200);
        expect(res.body.quiz.id).toBe(1);
    });

    it("GET /quiz/:id", async () => {
        const res = await request(app).get("/quiz/1");
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(1);
    });
});
