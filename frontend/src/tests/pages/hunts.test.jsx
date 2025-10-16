// frontend/src/tests/pages/hunts.test.jsx
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Hunts from "../../pages/hunts";

// Mock supabase
jest.mock("../../supabase/supabaseClient", () => ({
    auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { access_token: "tok", user: { id: "u1" } } } }),
        onAuthStateChange: jest.fn((_cb) => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

describe("Hunts page", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        global.fetch = jest.fn();
        mockNavigate.mockReset();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("shows loading initially", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        expect(screen.getByText(/Loading your hunts/i)).toBeInTheDocument();
    });

    it("shows empty state when no hunts", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/No hunts assigned/i)).toBeInTheDocument();
        });
    });

    it("renders hunts table when hunts exist", async () => {
        const now = new Date();
        const closing = new Date(now.getTime() + 5 * 60 * 1000); // 5 min later

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    id: "uh1",
                    huntId: "h1",
                    hunts: { name: "Treasure Hunt", description: "Find gold", question: "2+2?" },
                    isActive: true,
                    closingAt: closing.toISOString(),
                },
            ],
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        expect(await screen.findByText("Treasure Hunt")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /View/i })).toBeEnabled();
    });

    it("updates remaining time countdown", async () => {
        const closing = new Date(Date.now() + 2000); // 2 sec later

        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    id: "uh2",
                    huntId: "h2",
                    hunts: { name: "Quick Hunt", description: "Fast", question: "?" },
                    isActive: true,
                    closingAt: closing.toISOString(),
                },
            ],
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        expect(await screen.findByText("Quick Hunt")).toBeInTheDocument();

        // advance time so countdown expires
        act(() => {
            jest.advanceTimersByTime(3000);
        });

        await waitFor(() => {
            expect(screen.getByText(/Expired/)).toBeInTheDocument();
        });
    });

    it("navigates when View is clicked", async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [
                {
                    id: "uh3",
                    huntId: "h3",
                    hunts: { name: "Navigate Hunt" },
                    isActive: true,
                },
            ],
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        const btn = await screen.findByRole("button", { name: /View/i });
        fireEvent.click(btn);
        expect(mockNavigate).toHaveBeenCalledWith("/hunts/h3?uh=uh3");
    });

    it("handles fetch error gracefully", async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ message: "fail" }),
        });

        render(
            <MemoryRouter>
                <Hunts />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/No hunts assigned/i)).toBeInTheDocument();
        });
    });
});
