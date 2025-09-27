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

process.env.VITE_WEB_URL = process.env.VITE_WEB_URL || "http://localhost:3000";

/* ========================= Mocks ========================= */

// Override global Jest setup that auto-mocks the page module
jest.mock("../../pages/leaderboard.jsx", () =>
  jest.requireActual("../../pages/leaderboard.jsx")
);

// Minimal IconButton mock
jest.mock("../../components/IconButton", () => (props) => (
  <button data-testid="refresh-btn" type="button" onClick={props.onClick}>
    {props.icon || "refresh"}
  </button>
));

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

// Align with component calls
const ids = { year: "year", month: "month", week: "week" };

/** Default handler that returns per-board data by id */
function installDefaultLeaderboardFetch() {
  global.fetch.mockImplementation((url) => {
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

  it("loads Yearly on mount and renders rows", async () => {
    installDefaultLeaderboardFetch();

    render(<Leaderboard />);

    expect(await screen.findByRole("heading", { name: /leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /yearly/i })).toBeInTheDocument();

    // API called with yearly id
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/leaderboard\?id=year$/),
        expect.objectContaining({ headers: { Accept: "application/json" } })
      );
    });

    // Table rows rendered
    const rowgroups = screen.getAllByRole("rowgroup");
    const body = rowgroups[rowgroups.length - 1];
    const rows = within(body).getAllByRole("row");
    expect(rows).toHaveLength(4);

    expect(within(rows[0]).getByText("Alice")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Bob")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Cara")).toBeInTheDocument();
    expect(within(rows[3]).getByText("Dan")).toBeInTheDocument();
  });

  it("switches to Monthly via dropdown and updates header + rows", async () => {
    installDefaultLeaderboardFetch();

    render(<Leaderboard />);

    expect(await screen.findByRole("heading", { name: /yearly/i })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /yearly/i })[0]);
    await userEvent.click(screen.getByRole("button", { name: /monthly/i }));

    expect(await screen.findByRole("heading", { name: /monthly/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/leaderboard\?id=month$/),
        expect.any(Object)
      );
    });

    expect(screen.getByText("Eve")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("refresh button re-fetches the current board", async () => {
    installDefaultLeaderboardFetch();

    render(<Leaderboard />);

    await screen.findByRole("heading", { name: /yearly/i });
    expect(await screen.findByText("Alice")).toBeInTheDocument();

    // Next call returns new data
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

    await userEvent.click(screen.getByTestId("refresh-btn"));

    await waitFor(() => {
      expect(screen.getByText("Zed")).toBeInTheDocument();
      expect(screen.getByText("999")).toBeInTheDocument();
    });
  });

  it("shows empty state on HTTP error", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("", 500));

    render(<Leaderboard />);

    expect(await screen.findByText(/No entries yet\./i)).toBeInTheDocument();
  });

  it("shows empty state when API doesn't return an array", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse({ ok: true }, 200));

    render(<Leaderboard />);

    expect(await screen.findByText(/No entries yet\./i)).toBeInTheDocument();
  });
});
