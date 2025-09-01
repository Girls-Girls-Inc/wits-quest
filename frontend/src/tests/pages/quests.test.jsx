/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfill for libs that expect them (and to avoid router/TextEncoder issues)
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

// --- small helper for fetch responses (Node doesn't have Response) ---
const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

/* ========================= Mocks ========================= */

// toast mock (consistent with your other tests)
jest.mock("react-hot-toast", () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "tid-1"),
    dismiss: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockToast,
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => null,
  };
});

// Supabase client mock
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
  },
}));
import supabase from "../../supabase/supabaseClient";

/* ========================= SUT Import =========================
   IMPORTANT: import after mocks are set up
=============================================================== */
import Quests from "../../pages/quests.jsx";

/* ========================= Helpers & Fixtures ========================= */

const questsData = [
  {
    id: "q1",
    name: "Quest Alpha",
    description: "Alpha desc",
    location: "East Campus",
    pointsAchievable: 150,
    imageUrl: "",
    locationId: "loc-9",
  },
  {
    id: "q2",
    name: "Quest Beta",
    description: "Beta desc",
    location: "West Campus",
    pointsAchievable: 120,
    imageUrl: "",
    // no locationId -> modal shows “Loading location…” but won’t fetch
  },
];

const locationDetail = {
  id: "loc-9",
  name: "Great Hall",
  address: "1 Jan Smuts Ave, Braamfontein",
  description: "Historic venue.",
  openingHours: "08:00–17:00",
  lat: -26.191,
  lng: 28.034,
};

const matchLocationById = (url) => /\/locations\/([^/?#]+)/.exec(String(url));
const isUserQuests = (url, init) =>
  /\/user-quests(?:\?.*)?$/.test(String(url)) && (init?.method || "GET") === "POST";

const buildFrom = (result) => ({
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(result),
});

/* ========================= Test Suite ========================= */

describe("Quests page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    // default: user is signed in (for tests that need it)
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "jwt-abc" } },
      error: null,
    });

    // default: initial Supabase query returns two quests
    supabase.from.mockReturnValue(
      buildFrom({ data: questsData, error: null })
    );
  });

  it("loads quests on mount and renders cards; shows success toast", async () => {
    const toast = (await import("react-hot-toast")).default;

    render(<Quests />);

    // page header
    expect(await screen.findByRole("heading", { name: /quest/i })).toBeInTheDocument();

    // cards render
    expect(await screen.findByRole("heading", { name: /quest alpha/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /quest beta/i })).toBeInTheDocument();

    // success toast for load
    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalledWith("Loading quests...");
      expect(toast.success).toHaveBeenCalledWith("Quests loaded", expect.any(Object));
    });

    // ensure supabase query used the correct table + order
    expect(supabase.from).toHaveBeenCalledWith("quest_with_badges");
  });

  it("shows toast error and empties list when Supabase returns an error", async () => {
    const toast = (await import("react-hot-toast")).default;

    // Make the table call return an error
    supabase.from.mockReturnValueOnce(
      buildFrom({ data: null, error: { message: "DB broken" } })
    );

    render(<Quests />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("DB broken", expect.any(Object));
    });

    // No cards should be present; the two quest headings should not exist
    expect(screen.queryByRole("heading", { name: /quest alpha/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /quest beta/i })).not.toBeInTheDocument();
  });

  it("opens modal, fetches location, renders details and map iframe", async () => {
    // fetch handler: return location for /locations/loc-9
    global.fetch.mockImplementation((url) => {
      const m = matchLocationById(url);
      if (m && decodeURIComponent(m[1]) === "loc-9") {
        return Promise.resolve(jsonResponse(locationDetail, 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    render(<Quests />);

    // open modal for Quest Alpha
    const alphaCardBtn = (await screen.findAllByRole("button", { name: /view details/i }))[0];
    await userEvent.click(alphaCardBtn);

    // Modal appears
    const modal = await screen.findByRole("dialog", { hidden: false });
    expect(within(modal).getByRole("heading", { name: /quest alpha/i })).toBeInTheDocument();

    // Location text shows after fetch
    await waitFor(() => {
      expect(within(modal).getByText(/Great Hall/i)).toBeInTheDocument();
      expect(within(modal).getByText(/Historic venue\./i)).toBeInTheDocument();
      expect(within(modal).getByText(/Hours:\s*08:00–17:00/i)).toBeInTheDocument();
    });

    // Map iframe computed from lat/lng
    const frame = within(modal).getByTitle("map");
    const src = frame.getAttribute("src");
    expect(src).toContain("google.com/maps?q=");
    expect(src).toContain("-26.191");
    expect(src).toContain("28.034");
  });

  it("adds a quest to 'my quests' (POST /user-quests) and shows success toast", async () => {
    const toast = (await import("react-hot-toast")).default;

    global.fetch.mockImplementation((url, init) => {
      const m = matchLocationById(url);
      if (m && decodeURIComponent(m[1]) === "loc-9") {
        return Promise.resolve(jsonResponse(locationDetail, 200));
      }

      if (isUserQuests(url, init)) {
        // Verify headers include Authorization with our mocked token
        expect(init.headers.Authorization).toBe("Bearer jwt-abc");
        // Verify body contains questId
        const parsed = JSON.parse(init.body);
        expect(parsed).toEqual({ questId: "q1" });
        return Promise.resolve(jsonResponse({ ok: true }, 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    render(<Quests />);

    const alphaCardBtn = (await screen.findAllByRole("button", { name: /view details/i }))[0];
    await userEvent.click(alphaCardBtn);

    // Click "Add to my quests"
    const addBtn = await screen.findByRole("button", { name: /add to my quests/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalledWith("Adding quest…");
      expect(toast.success).toHaveBeenCalledWith("Added to your quests!", expect.any(Object));
    });
  });

  it("shows 'Please sign in.' when adding without a session", async () => {
    const toast = (await import("react-hot-toast")).default;

    // Make subsequent getSession call return no session (for addToMyQuests)
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "jwt-abc" } },
      error: null,
    });
    // This next call (triggered by addToMyQuests) returns no token
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    // Still allow location fetch
    global.fetch.mockImplementation((url, init) => {
      const m = matchLocationById(url);
      if (m && decodeURIComponent(m[1]) === "loc-9") {
        return Promise.resolve(jsonResponse(locationDetail, 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    render(<Quests />);

    const alphaBtn = (await screen.findAllByRole("button", { name: /view details/i }))[0];
    await userEvent.click(alphaBtn);

    const addBtn = await screen.findByRole("button", { name: /add to my quests/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please sign in.", expect.any(Object));
    });
  });

  it("uses cached location on second open (does not refetch); ESC closes modal", async () => {
    global.fetch.mockImplementation((url) => {
      const m = matchLocationById(url);
      if (m && decodeURIComponent(m[1]) === "loc-9") {
        return Promise.resolve(jsonResponse(locationDetail, 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    render(<Quests />);

    const [alphaBtn] = await screen.findAllByRole("button", { name: /view details/i });
    await userEvent.click(alphaBtn);

    await screen.findByRole("dialog");
    await waitFor(() => {
      expect(screen.getByText(/Great Hall/i)).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    global.fetch.mockClear();

    await userEvent.click(alphaBtn);
    await screen.findByRole("dialog");
    expect(screen.getByText(/Great Hall/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
