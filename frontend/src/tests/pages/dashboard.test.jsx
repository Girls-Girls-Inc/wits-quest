// frontend/src/tests/pages/dashboard.test.jsx
import React from "react";
import {
    render,
    screen,
    waitFor,
    fireEvent,
    within,
    act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mock supabase (define first) ---
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn((_cb) => {
    return {
        data: {
            subscription: {
                unsubscribe: jest.fn(),
            },
        },
    };
});


jest.mock("../../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            getSession: (...args) => mockGetSession(...args),
            onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
        },
    },
}));

// Import Dashboard AFTER mocks are defined
import Dashboard from "../../pages/dashboard";

beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();

    mockGetSession.mockResolvedValue({
        data: { session: { access_token: "token", user: { id: "u1", user_metadata: { username: "Me" } } } },
    });

    mockOnAuthStateChange.mockImplementation((_cb) => ({
        data: { subscription: { unsubscribe: jest.fn() } },
    }));

    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });
});


afterEach(() => {
    jest.restoreAllMocks();
});

describe("Dashboard", () => {
    it("renders static sections", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
        expect(await screen.findByRole("heading", { name: /Ongoing Quests/i })).toBeInTheDocument();
        expect(await screen.findByRole("heading", { name: /Badges Collected/i })).toBeInTheDocument();
        expect(await screen.findByRole("heading", { name: /Leaderboard/i })).toBeInTheDocument();
    });

    it("shows loading states when not logged in", async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText(/Loading quests/i)).toBeInTheDocument();
        expect(await screen.findByText(/Loading badges/i)).toBeInTheDocument();
        expect(await screen.findByText(/Loading leaderboard/i)).toBeInTheDocument();
    });


    it("renders empty states if API returns []", async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => [] });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText(/No badges yet/i)).toBeInTheDocument();
        expect(await screen.findByText(/No leaderboard data/i)).toBeInTheDocument();
    });

    it("renders badges from API", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/badges") || url.includes("collectibles")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [{ id: 1, name: "Badge One", imageUrl: "http://img/1.png" }],
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        const badgeImg = await screen.findByAltText("Badge One");
        expect(badgeImg).toBeInTheDocument();
        const badgesCard = badgeImg.closest(".badges-card");
        expect(within(badgesCard).getAllByText("Badge One").length).toBeGreaterThan(0);

    });

    it("renders leaderboard rows from API", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/leaderboard")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [{ id: 1, username: "Alice", points: 50 }],
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText("Alice")).toBeInTheDocument();
    });

    it("moves badge carousel on arrow clicks", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/badges") || url.includes("collectibles")) {
                return Promise.resolve({
                    ok: true,
                    json: async () =>
                        [1, 2, 3, 4, 5].map((i) => ({
                            id: i,
                            name: `B${i}`,
                            imageUrl: "data:image/svg+xml;base64,",
                        })),
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByLabelText(/Scroll right on badges/i));
        await waitFor(() => expect(screen.getByAltText("B5")).toBeInTheDocument());

        fireEvent.click(screen.getByLabelText(/Scroll left on badges/i));
        expect(await screen.findByAltText("B1")).toBeInTheDocument();
    });

    it("shows error fallback if fetch fails", async () => {
        global.fetch.mockRejectedValue(new Error("Network fail"));

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText(/No leaderboard data/i)).toBeInTheDocument();
    });

    it("does not crash when no accessToken is set (badges bail early)", async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        const badgeHeading = await screen.findByRole("heading", {
            name: /Badges Collected/i,
        });
        const badgeCard = badgeHeading.closest(".dashboard-card");
        expect(await within(badgeCard).findByText(/Loading badges/i)).toBeInTheDocument();

    });

    it("handles non-OK leaderboard response", async () => {
        global.fetch.mockResolvedValue({ ok: false, status: 500 });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText(/No leaderboard data/i)).toBeInTheDocument();
    });

    it("handles leaderboard returning non-array", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/leaderboard")) {
                return Promise.resolve({ ok: true, json: async () => ({ foo: "bar" }) });
            }
            if (url.includes("/collectibles")) {
                return Promise.resolve({ ok: true, json: async () => [] }); // must be an array
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        expect(await screen.findByText(/No leaderboard data/i)).toBeInTheDocument();
    });

    it("handles badges fetch with HTTP error", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/badges") || url.includes("collectibles")) {
                return Promise.resolve({ ok: false, status: 500 });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        const badgeHeading = await screen.findByRole("heading", {
            name: /Badges Collected/i,
        });
        const badgeCard = badgeHeading.closest(".dashboard-card");
        expect(within(badgeCard).getByText(/No badges yet/i)).toBeInTheDocument();
    });

    it("handles ongoing quests fetch with complete quests", async () => {
        global.fetch.mockImplementation((url) => {
            if (url.includes("/user-quests")) {
                return Promise.resolve({
                    ok: true,
                    json: async () => [
                        {
                            id: 1,
                            questId: 101,
                            userId: "u1",
                            isComplete: true,
                            completedAt: new Date().toISOString(),
                            quests: {
                                name: "Quest 1",
                                pointsAchievable: 10,
                                locations: { name: "Location 1" },
                            },
                        },
                    ],
                });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        // Quests Completed card
        const questsCompletedCard = await screen.findByRole("heading", { name: /Quests Completed/i });
        expect(within(questsCompletedCard.closest(".dashboard-card")).getByText("1")).toBeInTheDocument();

        // Points card
        const pointsCard = screen.getByRole("heading", { name: /Points/i });
        expect(within(pointsCard.closest(".dashboard-card")).getByText("10")).toBeInTheDocument();

        // Latest Location
        expect(screen.getByText("Location 1")).toBeInTheDocument();
    });



    it("prevSlide does nothing when no badges exist", async () => {
        global.fetch.mockResolvedValue({ ok: true, json: async () => [] });

        await act(async () => {
            render(
                <MemoryRouter>
                    <Dashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByLabelText(/Scroll left on badges/i));
        expect(await screen.findByText(/No badges yet/i)).toBeInTheDocument();
    });
});
