// frontend/src/tests/pages/huntDetail.test.jsx
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HuntDetail from "../../pages/huntDetail";

// Mock supabase
jest.mock("../../supabase/supabaseClient", () => ({
    auth: {
        getSession: jest.fn().mockResolvedValue({
            data: { session: { access_token: "tok123" } },
        }),
    },
}));

// Mock useSearchParams
jest.mock("react-router-dom", () => {
    const actual = jest.requireActual("react-router-dom");
    return {
        ...actual,
        useSearchParams: () => [new URLSearchParams({ uh: "uh1" })],
    };
});

describe("HuntDetail page", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("shows loading initially", () => {
        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );
        expect(screen.getByText(/Loading hunt details/i)).toBeInTheDocument();
    });

    it("shows hunt not found when API fails", async () => {
        fetch.mockRejectedValueOnce(new Error("fail"));

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        await waitFor(() =>
            expect(screen.getByText(/Hunt not found/i)).toBeInTheDocument()
        );
    });

    it("renders hunt details when loaded", async () => {
        const closing = new Date(Date.now() + 60000); // 1 min later
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: "uh1",
                hunts: { name: "Test Hunt", description: "Desc", question: "2+2?" },
                closingAt: closing.toISOString(),
                isComplete: false,
                isActive: true,
            }),
        });

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        expect(await screen.findByText("Test Hunt")).toBeInTheDocument();

        const descPara = screen.getByText(/Description:/).closest("p");
        expect(descPara).toHaveTextContent("Desc");

        expect(screen.getByText(/2\+2/)).toBeInTheDocument();
        expect(screen.getByText(/Time Remaining/)).toBeInTheDocument();
    });

    it("updates countdown and shows Expired", async () => {
        const closing = new Date(Date.now() + 2000); // 2 sec later
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: "uh2",
                hunts: { name: "Countdown Hunt" },
                closingAt: closing.toISOString(),
                isComplete: false,
                isActive: true,
            }),
        });

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        expect(await screen.findByText(/Countdown Hunt/)).toBeInTheDocument();

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(screen.getByText(/Expired/)).toBeInTheDocument();
        });
    });

    it("submits correct answer", async () => {
        const closing = new Date(Date.now() + 60000);
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: "uh3",
                hunts: { name: "Answer Hunt", question: "?" },
                closingAt: closing.toISOString(),
                isComplete: false,
                isActive: true,
            }),
        });
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ correct: true }),
        });

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        expect(await screen.findByText("Answer Hunt")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Your answer/i), {
            target: { value: "4" },
        });
        fireEvent.click(screen.getByText(/Check/i));

        await waitFor(() =>
            expect(
                screen.getByText(/✅ This hunt is completed or expired/i)
            ).toBeInTheDocument()
        );
    });

    it("submits incorrect answer", async () => {
        const closing = new Date(Date.now() + 60000);
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: "uh4",
                hunts: { name: "Wrong Hunt", question: "?" },
                closingAt: closing.toISOString(),
                isComplete: false,
                isActive: true,
            }),
        });
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ correct: false }),
        });

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        expect(await screen.findByText("Wrong Hunt")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Your answer/i), {
            target: { value: "x" },
        });
        fireEvent.click(screen.getByText(/Check/i));

        await waitFor(() =>
            expect(screen.getByText(/❌ Incorrect answer/i)).toBeInTheDocument()
        );
    });

    it("handles check answer error", async () => {
        const closing = new Date(Date.now() + 60000);
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                id: "uh5",
                hunts: { name: "Error Hunt", question: "?" },
                closingAt: closing.toISOString(),
                isComplete: false,
                isActive: true,
            }),
        });
        fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: "fail" }),
        });

        render(
            <MemoryRouter>
                <HuntDetail />
            </MemoryRouter>
        );

        expect(await screen.findByText("Error Hunt")).toBeInTheDocument();

        fireEvent.change(screen.getByPlaceholderText(/Your answer/i), {
            target: { value: "err" },
        });
        fireEvent.click(screen.getByText(/Check/i));

        await waitFor(() =>
            expect(
                screen.getByText(/Error checking answer/i)
            ).toBeInTheDocument()
        );
    });
});
