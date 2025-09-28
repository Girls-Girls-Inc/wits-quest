/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
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

// Toasts
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
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useParams: () => ({ questId: "q1" }),
    useSearchParams: () => [
      { get: (k) => (k === "uq" ? "uq1" : null) },
      jest.fn(),
    ],
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => React.createElement("a", { href: to }, children),
  };
});

// Google Maps API
jest.mock("@react-google-maps/api", () => {
  const React = require("react");
  return {
    useLoadScript: () => ({ isLoaded: true }),
    GoogleMap: ({ children }) =>
      React.createElement("div", { "data-testid": "google-map" }, children),
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

  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: "token", user: { id: "user1" } } },
  });

  const mockFetch = (global.fetch = jest.fn());
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [
      { ...defaultQuest, ...(quest.points != null ? { pointsAchievable: quest.points } : {}) },
    ],
  });
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ...defaultLocation }),
  });

  await act(async () => {
    render(<QuestDetail />);
  });
};

/* ========================= Tests ========================= */
describe("QuestDetail page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders quest details and location", async () => {
    await setup();

    expect(await screen.findByRole("heading", { name: /test quest/i })).toBeInTheDocument();
    expect(screen.getByText(/points:/i).closest("span")).toHaveTextContent(/50/);
    expect(screen.getByText(/location:/i).closest("span")).toHaveTextContent(/Test Location/);
    expect(screen.getByTestId("google-map")).toBeInTheDocument();
    expect(screen.getAllByTestId("marker").length).toBeGreaterThanOrEqual(2);
  });

  it("disables complete button when outside radius", async () => {
    await setup({ lat: 90, lng: 0 });
    await screen.findByRole("heading", { name: /test quest/i });
    expect(screen.getByRole("button", { name: /check-in & complete/i })).toBeDisabled();
  });

  it("completes quest when inside radius", async () => {
    await setup();
    await screen.findByRole("heading", { name: /test quest/i });

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Quest completed! Points awarded.")
    );
  });

  it("shows error toast if quest not found", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    render(<QuestDetail />);
    expect(await screen.findByText(/Quest not found/i)).toBeInTheDocument();
  });

  it("awards collectible if quest has collectibleId", async () => {
    await setup({ collectibleId: "c1" });
    await screen.findByRole("heading", { name: /test quest/i });

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Collectible"))
    );
  });

  it("falls back to 'Unknown' location when location fetch fails (no toast)", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "q1", name: "Q", pointsAchievable: 10, locationId: "loc1" }],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Location broken" }),
        text: async () => "Location broken",
      });

    render(<QuestDetail />);

    expect(await screen.findByRole("heading", { name: /^q$/i })).toBeInTheDocument();
    expect(screen.getByText(/location:/i).closest("span")).toHaveTextContent(/unknown/i);
    expect(screen.getByText(/radius \(m\):/i).parentElement).toHaveTextContent(/0/);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not load quests when no auth token", async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await act(async () => {
      render(<QuestDetail />);
    });

    expect(await screen.findByText(/loading quest/i)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows error toast when complete quest API returns non-ok", async () => {
    await setup();
    await screen.findByRole("heading", { name: /test quest/i });

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
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "q1", name: "Q", pointsAchievable: 10, locationId: "loc1", collectibleId: "c1" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "loc1", name: "L", lat: 0, lng: 0, radius: 100 }),
      });

    render(<QuestDetail />);
    await screen.findByRole("heading", { name: /^q$/i });

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "No award" }),
      text: async () => "No award",
    });

    await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Quest done, but collectible could not be awarded."
      )
    );
  });

  it("shows error toast when quiz answer is incorrect", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: "q1", name: "Quest Q", pointsAchievable: 10, locationId: "loc1", quizId: "quiz1" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "loc1", name: "L", lat: 0, lng: 0, radius: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionText: "Q?", questionType: "text", correctAnswer: "42" }),
      });

    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token", user: { id: "user1" } } },
    });

    await act(async () => {
      render(<QuestDetail />);
    });
    await screen.findByText(/Q\?/i);

    await userEvent.type(screen.getByPlaceholderText(/your answer/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /check-in & complete/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Incorrect answer. Try again!");
    });
  });

  it("shows error toast if geolocation callback errors", async () => {
    global.navigator.geolocation = {
      watchPosition: (_s, e) => {
        e({ message: "Position unavailable" });
        return 1;
      },
      clearWatch: jest.fn(),
    };

    await act(async () => {
      render(<QuestDetail />);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Position unavailable");
    });
  });

  it("navigates back when Back button clicked", async () => {
    await setup();
    await screen.findByRole("heading", { name: /test quest/i });

    await userEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
