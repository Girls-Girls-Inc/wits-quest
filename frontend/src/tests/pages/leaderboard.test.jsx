/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfill for libs that expect them (and to avoid router/TextEncoder issues)
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

/* ========================= Mocks ========================= */

// Minimal IconButton mock
jest.mock("../../components/IconButton", () => (props) => (
  <button data-testid="refresh-btn" type="button" onClick={props.onClick}>
    {props.icon || "refresh"}
  </button>
));

// Toasts
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

/* ========================= Fetch Mock Helpers ========================= */

const matchLeaderboard = (url) => /\/leaderboard\?id=([^&]+)/.exec(String(url));

const yearData = [
  { id: "u1", username: "Alice", points: 300 },
  { id: "u2", username: "Bob", points: 250 },
  { id: "u3", username: "Cara", points: 200 },
  { id: "u4", username: "Dan", points: 150 },
];

const monthData = [
  { id: "m1", username: "Eve", points: 120 },
  { id: "m2", username: "Frank", points: 110 },
  { id: "m3", username: "Grace", points: 100 },
];

const weekData = [
  { id: "w1", username: "Heidi", points: 40 },
  { id: "w2", username: "Ivan", points: 30 },
];

const ids = { year: "12345", month: "1234", week: "123" };

/** Default handler that returns per-board data by id */
function installDefaultLeaderboardFetch() {
  global.fetch.mockImplementation((url, opts) => {
    const m = matchLeaderboard(url);
    if (!m) return Promise.resolve(jsonResponse("", 404));
    const id = decodeURIComponent(m[1]);
    if (id === ids.year) return Promise.resolve(jsonResponse(yearData, 200));
    if (id === ids.month) return Promise.resolve(jsonResponse(monthData, 200));
    if (id === ids.week) return Promise.resolve(jsonResponse(weekData, 200));
    return Promise.resolve(jsonResponse("", 404));
  });
}

/* ========================= SUT Import =========================
   IMPORTANT: import after mocks are set up
=============================================================== */

import Leaderboard from "../../pages/leaderboard.jsx";

/* ========================= Tests ========================= */

describe("Leaderboard page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it.skip("loads Yearly on mount, renders rows, and shows success toast", async () => {
    installDefaultLeaderboardFetch();
    const toast = (await import("react-hot-toast")).default;

    render(<Leaderboard />);

    expect(await screen.findByRole("heading", { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /yearly/i })).toBeInTheDocument();

    // We called the API with the yearly id
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/leaderboard\?id=12345$/),
        expect.objectContaining({ headers: { Accept: "application/json" } })
      );
    });

    // Success toast
    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalledWith("Loading leaderboard…");
      expect(toast.success).toHaveBeenCalledWith("Leaderboard loaded!", expect.any(Object));
    });

    // Table rows rendered; verify order, names, points, and trophies for top 3
    const body = screen.getByRole("rowgroup", { name: "" }) || screen.getAllByRole("rowgroup")[1];
    const rows = within(body).getAllByRole("row");
    // Expect 4 data rows
    expect(rows).toHaveLength(4);

    // Row 1
    expect(within(rows[0]).getByText("1")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Alice")).toBeInTheDocument();
    expect(within(rows[0]).getByText("300")).toBeInTheDocument();
    expect(within(rows[0]).getByText("emoji_events")).toBeInTheDocument();

    // Row 2
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Bob")).toBeInTheDocument();
    expect(within(rows[1]).getByText("250")).toBeInTheDocument();
    expect(within(rows[1]).getByText("emoji_events")).toBeInTheDocument();

    // Row 3
    expect(within(rows[2]).getByText("3")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Cara")).toBeInTheDocument();
    expect(within(rows[2]).getByText("200")).toBeInTheDocument();
    expect(within(rows[2]).getByText("emoji_events")).toBeInTheDocument();

    // Row 4 (no trophy)
    expect(within(rows[3]).getByText("4")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Dan")).toBeInTheDocument();
    expect(within(rows[3]).queryByText("emoji_events")).not.toBeInTheDocument();
  });

  it.skip("switches to Monthly via dropdown and updates header + rows", async () => {
    installDefaultLeaderboardFetch();

    render(<Leaderboard />);

    expect(await screen.findByRole("heading", { name: /yearly/i })).toBeInTheDocument();

    // Open dropdown then click Monthly
    await userEvent.click(screen.getByRole("button", { name: /yearly/i }));
    await userEvent.click(screen.getByRole("button", { name: /monthly/i }));

    // Header updates
    expect(await screen.findByRole("heading", { name: /monthly/i })).toBeInTheDocument();

    // API called with monthly ID
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/leaderboard\?id=1234$/),
        expect.any(Object)
      );
    });

    // Check a few Monthly entries
    expect(screen.getByText("Eve")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("refresh button re-fetches the current board", async () => {
    installDefaultLeaderboardFetch();

    render(<Leaderboard />);

    // initial load (Yearly)
    await screen.findByRole("heading", { name: /yearly/i });
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    // Next call should return a different payload for Yearly
    global.fetch.mockImplementationOnce((url) => {
      const m = matchLeaderboard(url);
      if (m && decodeURIComponent(m[1]) === ids.year) {
        return Promise.resolve(
          jsonResponse(
            [
              { id: "ny1", username: "Zed", points: 999 },
              { id: "ny2", username: "Amy", points: 500 },
            ],
            200
          )
        );
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    // Click the IconButton mock
    await userEvent.click(screen.getByTestId("refresh-btn"));

    // New data appears
    await waitFor(() => {
      expect(screen.getByText("Zed")).toBeInTheDocument();
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });

  it("shows toast and empty state on HTTP error", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("", 500));
    const toast = (await import("react-hot-toast")).default;

    render(<Leaderboard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("HTTP 500", expect.any(Object));
    });

    // Empty row shown
    expect(screen.getByText(/No entries yet\./i)).toBeInTheDocument();
  });

  it("shows toast and empty state when API doesn't return an array", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));
    const toast = (await import("react-hot-toast")).default;

    render(<Leaderboard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "API did not return an array",
        expect.any(Object)
      );
    });

    expect(screen.getByText(/No entries yet\./i)).toBeInTheDocument();
  });
});
