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
/* ==== EXTRA COVERAGE TESTS FOR questDetail.jsx (fixed to match UI) ==== */

it("falls back to 'Unknown' location when location fetch fails (no toast)", async () => {
  const toast = (await import("react-hot-toast")).default;

  // quests ok
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "q1", name: "Q", pointsAchievable: 10, locationId: "loc1" }],
    })
    // location fails
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Location broken" }),
      text: async () => "Location broken",
    });

  render(<QuestDetail />);

  // Page renders with fallback values
  expect(await screen.findByRole("heading", { name: /^q$/i })).toBeInTheDocument();
  expect(screen.getByText(/location:/i).closest("span")).toHaveTextContent(/unknown/i);
  expect(screen.getByText(/radius/i).closest("span")).toHaveTextContent(/0/);

  // Component doesn't toast on this path — assert no error toast
  expect(toast.error).not.toHaveBeenCalled();
});

it("guards completion when no auth token (toasts sign-in message)", async () => {
  const toast = (await import("react-hot-toast")).default;
  const sb = (await import("../../supabase/supabaseClient")).default;

  // Use the working setup to load quest + location
  await setup();
  await screen.findByRole("heading", { name: /test quest|^q$/i });

  // Next time the component asks for session (on complete), return no token
  sb.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

  const btn = screen.getByRole("button", { name: /check-in & complete/i });
  await userEvent.click(btn);

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
  });
});

it("shows error toast when complete quest API returns non-ok", async () => {
  const toast = (await import("react-hot-toast")).default;

  // Load normally
  await setup();
  await screen.findByRole("heading", { name: /test quest|^q$/i });

  // Completing fails
  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message: "Fail complete" }),
    text: async () => "Fail complete",
  });

  await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/fail complete/i));
  });
});

it("shows error toast when awarding collectible fails", async () => {
  const toast = (await import("react-hot-toast")).default;

  // First load a quest with a collectible via setup-like sequence
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{
        id: "q1",
        name: "Q",
        pointsAchievable: 10,
        locationId: "loc1",
        collectibleId: "c1",
      }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "loc1", name: "L", lat: 0, lng: 0, radius: 100 }),
    });

  render(<QuestDetail />);
  await screen.findByRole("heading", { name: /^q$/i });

  // complete quest ok
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
  // award collectible fails
  global.fetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ message: "No award" }),
    text: async () => "No award",
  });

  await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

  await waitFor(() => {
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/no award/i));
  });
});

it("exposes a 'Directions' CTA (link or button) when there is a non-zero distance", async () => {
  // Make distance non-zero to ensure the CTA shows
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "q1", name: "Q", pointsAchievable: 10, locationId: "loc1" }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "loc1", name: "L", lat: 0.001, lng: 0.001, radius: 10 }),
    });

  const winOpen = jest.spyOn(window, "open").mockImplementation(() => null);

  render(<QuestDetail />);
  await screen.findByRole("heading", { name: /^q$/i });

  // Some implementations render a link, others a button
  const link = screen.queryByRole("link", { name: /directions/i });
  const btn  = screen.queryByRole("button", { name: /directions|get directions/i });

  expect(link || btn).toBeTruthy();

  if (link) {
    expect(link).toHaveAttribute("href");
    await userEvent.click(link);
  } else if (btn) {
    await userEvent.click(btn);
  }

  expect(winOpen).toHaveBeenCalled();
  winOpen.mockRestore();
});


});
