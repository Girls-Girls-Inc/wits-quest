/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuestDetail from "../../pages/questDetail";

const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Global stubs ========================= */
beforeAll(() => {
    global.navigator.geolocation = {
        watchPosition: (success) => {
            success({ coords: { latitude: 0, longitude: 0, accuracy: 5 } });
            return 1;
        },
        clearWatch: jest.fn(),
    };

    global.window.google = {
        maps: {
            SymbolPath: { CIRCLE: "CIRCLE" },
        },
    };
});

/* ========================= Mocks ========================= */

// Toasts — no outside reference!
jest.mock("react-hot-toast", () => {
    return {
        __esModule: true,
        default: {
            success: jest.fn(),
            error: jest.fn(),
            loading: jest.fn(),
            dismiss: jest.fn(),
        },
        success: jest.fn(),
        error: jest.fn(),
        loading: jest.fn(),
        dismiss: jest.fn(),
        Toaster: () => null,
    };
});
import toast from "react-hot-toast";

// Router
jest.mock("react-router-dom", () => {
    const React = require("react");
    return {
        useParams: () => ({ questId: "q1" }),
        useSearchParams: () => [
            { get: (k) => (k === "uq" ? "uq1" : null) },
            jest.fn(),
        ],
        useNavigate: () => jest.fn(),
        Link: ({ to, children }) => React.createElement("a", { href: to }, children),
    };
});

// Google Maps API
jest.mock("@react-google-maps/api", () => {
    const React = require("react");
    return {
        useLoadScript: () => ({ isLoaded: true }),
        GoogleMap: ({ children }) => (
            React.createElement("div", { "data-testid": "google-map" }, children)
        ),
        Marker: () => React.createElement("div", { "data-testid": "marker" }),
        Circle: () => React.createElement("div", { "data-testid": "circle" }),
        DirectionsService: () => null,
        DirectionsRenderer: () => null,
    };
});

// Supabase
jest.mock("../../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: { getSession: jest.fn() },
    },
}));
import supabase from "../../supabase/supabaseClient";

/* ========================= Helpers ========================= */
const setup = async (quest = {}) => {
    // Map provided test values into the component's API shape
    const defaultQuest = {
        id: "q1",
        name: "Test Quest",
        pointsAchievable: 50,
        locationId: "loc1",
        collectibleId: quest.collectibleId ?? null,
    };
    const defaultLocation = {
        id: "loc1",
        name: quest.location ?? "Test Location",
        lat: quest.lat ?? 0,
        lng: quest.lng ?? 0,
        radius: quest.radius ?? 100,
    };

    // Auth/session available
    supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "token", user: { id: "user1" } } },
    });

    const mockFetch = (global.fetch = jest.fn());
    // First call: quests
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
            {
                ...defaultQuest,
                ...(quest.points != null ? { pointsAchievable: quest.points } : {}),
            },
        ],
    });
    // Second call: location
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...defaultLocation }),
    });

    render(<QuestDetail />);
};

/* ========================= Tests ========================= */
describe("QuestDetail page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders quest details and location", async () => {
        await setup();

        expect(
            await screen.findByRole("heading", { name: /test quest/i })
        ).toBeInTheDocument();
        expect(
            screen.getByText(/points:/i).closest("span")
        ).toHaveTextContent(/50/);
        expect(
            screen.getByText(/location:/i).closest("span")
        ).toHaveTextContent(/Test Location/);
        expect(screen.getByTestId("google-map")).toBeInTheDocument();
        expect(screen.getAllByTestId("marker").length).toBeGreaterThanOrEqual(2);
    });

    it("disables complete button when outside radius", async () => {
        await setup({ lat: 90, lng: 0 });
        await screen.findByRole("heading", { name: /test quest/i });
        expect(
            screen.getByRole("button", { name: /check-in & complete/i })
        ).toBeDisabled();
    });

    it("completes quest when inside radius", async () => {
        await setup();
        await screen.findByRole("heading", { name: /test quest/i });

        // Complete quest endpoint
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await userEvent.click(
            screen.getByRole("button", { name: /check-in & complete/i })
        );

        await waitFor(() =>
            expect(toast.success).toHaveBeenCalledWith(
                "Quest completed! Points awarded."
            )
        );
    });

    it("shows error toast if quest not found", async () => {
        global.fetch = jest.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => [], // No quest => not found branch
        });
        render(<QuestDetail />);
        expect(await screen.findByText(/Quest not found/i)).toBeInTheDocument();
    });

    it("awards collectible if quest has collectibleId", async () => {
        await setup({ collectibleId: "c1" });
        await screen.findByRole("heading", { name: /test quest/i });

        // Complete quest, then award collectible
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
        global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

        await userEvent.click(
            screen.getByRole("button", { name: /check-in & complete/i })
        );

        await waitFor(() =>
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringContaining("Collectible")
            )
        );
    });
});
