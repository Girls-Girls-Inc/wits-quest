/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills for libs that expect them
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

// Router: useNavigate only
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => React.createElement("a", { href: to }, children),
  };
});

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

// IconButton as a simple button
jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));

// Style imports noop
jest.mock("../../styles/quests.css", () => ({}));

// Supabase client mock with chainable from().select().order()
const makeFromChain = (data, error = null) => ({
  select: () => ({
    order: () => Promise.resolve({ data, error }),
  }),
});

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
  },
}));
import supabase from "../../supabase/supabaseClient";

// Import the real component (jest.setup mocked pages, so unmock explicitly)
const path = require("path");
const questsAbsPath = path.resolve(__dirname, "../../pages/quests.jsx");
jest.unmock(questsAbsPath);
// Use require to avoid ESM import hoisting and ensure unmock takes effect
const Quests = require(questsAbsPath).default;

/* ========================= Test Data ========================= */

const QUEST_A = {
  id: 1,
  name: "Quest Alpha",
  location: "Main Campus",
  pointsAchievable: 100,
  imageUrl: "",
  locationId: "loc-1",
};
const QUEST_B = { id: 2, name: "Quest Beta", location: "East Campus", pointsAchievable: 50 };

/* ========================= Setup Helpers ========================= */

const setupHappyLoad = async (quests = [QUEST_A]) => {
  // Ensure clean mocks between tests
  if (typeof supabase.from.mockReset === "function") supabase.from.mockReset();
  if (typeof supabase.auth.getSession.mockReset === "function") supabase.auth.getSession.mockReset();
  // Supabase session for JWT fetches inside component
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: "token-123" } },
    error: null,
  });

  // Initial load (and any subsequent) return the provided quests
  supabase.from.mockImplementation(() => makeFromChain(quests, null));

  // Default fetch mock per-test; tests can override sequence as needed
  global.fetch = jest.fn();

  render(<Quests />);

  // Wait for initial render to finish (header always present)
  expect(
    await screen.findByRole("heading", { level: 1, name: /quest/i })
  ).toBeInTheDocument();
};

/* ========================= Tests ========================= */

describe("Quests page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockReset();
  });

  it("renders list of quests and opens modal with details", async () => {
    await setupHappyLoad([QUEST_A]);

    // Card content rendered
    expect(
      await screen.findByRole("heading", { level: 2, name: /quest alpha/i })
    ).toBeInTheDocument();

    // First location fetch when opening modal
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "loc-1", name: "Library", address: "1 University Rd" }),
    });

    await userEvent.click(screen.getByRole("button", { name: /view details/i }));

    // Modal shows quest title and location block (after fetch resolves)
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { level: 2, name: /quest alpha/i })
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Location/i)).toBeInTheDocument();
    // Add button visible inside modal
    expect(
      within(dialog).getByRole("button", { name: /add to my quests/i })
    ).toBeInTheDocument();
  });

  it("adds a quest to My Quests via API calls", async () => {
    await setupHappyLoad([QUEST_A]);

    // Open modal triggers location fetch
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) }) // location
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // GET user-quests (empty)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "uq-1" }) }); // POST add

    // Wait for card to render, then open modal
    await screen.findByRole("button", { name: /view details/i });
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /add to my quests/i })
    );

    await waitFor(() => {
      const toast = require("react-hot-toast").default;
      expect(toast.success).toHaveBeenCalledWith("Added to your quests!", { id: "tid-1" });
    });
  });

  it("refresh button reloads quests from Supabase", async () => {
    // First load has A, second load has B
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "t" } } });
    supabase.from
      .mockImplementationOnce(() => makeFromChain([QUEST_A], null))
      .mockImplementationOnce(() => makeFromChain([QUEST_B], null));

    global.fetch = jest.fn();

    render(<Quests />);
    expect(
      await screen.findByRole("heading", { level: 2, name: /quest alpha/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    // After refresh, Beta should appear
    expect(
      await screen.findByRole("heading", { level: 2, name: /quest beta/i })
    ).toBeInTheDocument();
  });

  it("shows a toast error when Supabase query fails", async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    supabase.from.mockImplementationOnce(() => makeFromChain(null, new Error("boom")));

    const toast = (await import("react-hot-toast")).default;

    global.fetch = jest.fn();
    render(<Quests />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
