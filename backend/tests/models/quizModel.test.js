// backend/tests/models/quizModel.test.js
const {
    normalizeQuizRow,
    prepareWritePayload,
    create,
    list,
    update,
    remove,
    getById,
} = require("../../models/quizModel"); // correct relative path

// backend/tests/models/quizModel.test.js
function makeSupabase(overrides = {}) {
    return {
        from: jest.fn(() => ({
            insert: () => ({
                select: () => overrides.create || { data: [{ id: 1 }], error: null },
            }),

            // select() → chainable with .order() or .eq().maybeSingle()
            select: () => ({
                order: () =>
                    overrides.list || {
                        data: [{ id: 1, options: '["A"]', questionType: "MCQ" }],
                        error: null,
                    },
                eq: () => ({
                    maybeSingle: () =>
                        overrides.getById || { data: { id: 1 }, error: null },
                }),
            }),

            update: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: () =>
                            overrides.update || { data: { id: 1 }, error: null },
                    }),
                }),
            }),

            delete: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: () =>
                            overrides.remove || { data: { id: 1 }, error: null },
                    }),
                }),
            }),
        })),
    };
}


describe("quizModel helpers", () => {
    it("normalizeQuizRow parses JSON options", () => {
        const row = {
            questionText: "Q",
            questionType: "MCQ",
            options: '["A","B"]',
        };
        const norm = normalizeQuizRow(row);
        expect(norm.options).toEqual(["A", "B"]);
        expect(norm.questionType).toBe("mcq");
    });

    it("normalizeQuizRow falls back to line-split options", () => {
        const row = { questionText: "Q", questionType: "MCQ", options: "A\nB\n" };
        const norm = normalizeQuizRow(row);
        expect(norm.options).toEqual(["A", "B"]);
    });

    it("prepareWritePayload stringifies arrays and strips unknowns", () => {
        const out = prepareWritePayload({
            options: ["A"],
            foo: "x",
            questionText: "Q",
            questionType: "TEXT",
            correctAnswer: "A",
        });
        expect(out.options).toBe('[\"A\"]');
        expect(out.foo).toBeUndefined();
        expect(out.questionType).toBe("text");
    });
});

describe("quizModel methods", () => {
    it("create returns normalized data", async () => {
        const sb = makeSupabase();
        const { data, error } = await create(
            { questionText: "Q", questionType: "text", correctAnswer: "A" },
            sb
        );
        expect(error).toBeNull();
        expect(data.id).toBe(1);
    });

    it("list returns rows", async () => {
        const sb = makeSupabase();
        const { data } = await list(sb);
        expect(Array.isArray(data)).toBe(true);
        expect(data[0].id).toBe(1);
    });

    it("update returns normalized row", async () => {
        const sb = makeSupabase();
        const { data } = await update(
            1,
            { questionText: "Q", questionType: "text", correctAnswer: "A" },
            sb
        );
        expect(data.id).toBe(1);
    });

    it("remove returns normalized row", async () => {
        const sb = makeSupabase();
        const { data } = await remove(1, sb);
        expect(data.id).toBe(1);
    });

    it("getById returns normalized row", async () => {
        const sb = makeSupabase();
        const { data } = await getById(1, sb);
        expect(data.id).toBe(1);
    });

    it("handles error case in create", async () => {
        const sb = makeSupabase({
            create: { data: null, error: new Error("fail") },
        });
        const { error } = await create(
            { questionText: "Q", questionType: "text", correctAnswer: "A" },
            sb
        );
        expect(error).toBeInstanceOf(Error);
    });
    describe("quizModel helpers edge cases", () => {
        it("normalizeQuizRow handles empty string options", () => {
            const row = { questionText: "Q", questionType: "MCQ", options: "" };
            const norm = normalizeQuizRow(row);
            expect(norm.options).toEqual([]);
        });

        it("normalizeQuizRow handles non-array JSON", () => {
            const row = { questionText: "Q", questionType: "MCQ", options: '{"options":["X","Y"]}' };
            const norm = normalizeQuizRow(row);
            expect(norm.options).toEqual(["X", "Y"]);
        });

        it("normalizeQuizRow wraps non-array, non-string option", () => {
            const row = { questionText: "Q", questionType: "MCQ", options: 123 };
            const norm = normalizeQuizRow(row);
            expect(norm.options).toEqual([123]);
        });

        it("normalizeQuizRow handles null row", () => {
            const norm = normalizeQuizRow(null);
            expect(norm).toBeNull();
        });

        it("prepareWritePayload converts object options to JSON", () => {
            const out = prepareWritePayload({
                questionText: "Q",
                questionType: "MCQ",
                options: { a: 1, b: 2 },
                correctAnswer: "a",
            });
            expect(out.options).toBe(JSON.stringify({ a: 1, b: 2 }));
        });

        it("prepareWritePayload handles null options", () => {
            const out = prepareWritePayload({
                questionText: "Q",
                questionType: "MCQ",
                options: null,
                correctAnswer: "a",
            });
            expect(out.options).toBeNull();
        });

        it("prepareWritePayload converts string options", () => {
            const out = prepareWritePayload({
                questionText: "Q",
                questionType: "MCQ",
                options: "rawstring",
                correctAnswer: "a",
            });
            expect(out.options).toBe("rawstring");
        });
    });

    describe("quizModel methods edge cases", () => {
        it("list handles error", async () => {
            const sb = makeSupabase({
                list: { data: null, error: new Error("fail") },
            });
            const { data, error } = await list(sb);
            expect(data).toBeNull();
            expect(error).toBeInstanceOf(Error);
        });

        it("update handles error", async () => {
            const sb = makeSupabase({
                update: { data: null, error: new Error("fail") },
            });
            const { data, error } = await update(1, {}, sb);
            expect(data).toBeNull();
            expect(error).toBeInstanceOf(Error);
        });

        it("remove handles error", async () => {
            const sb = makeSupabase({
                remove: { data: null, error: new Error("fail") },
            });
            const { data, error } = await remove(1, sb);
            expect(data).toBeNull();
            expect(error).toBeInstanceOf(Error);
        });

        it("getById handles error", async () => {
            const sb = makeSupabase({
                getById: { data: null, error: new Error("fail") },
            });
            const { data, error } = await getById(1, sb);
            expect(data).toBeNull();
            expect(error).toBeInstanceOf(Error);
        });

        it("getById normalizes string id", async () => {
            const sb = makeSupabase({
                getById: { data: { id: 2, options: "A\nB" }, error: null },
            });
            const { data } = await getById("2", sb);
            expect(data.id).toBe(2);
            expect(data.options).toEqual(["A", "B"]);
        });
    });
});
