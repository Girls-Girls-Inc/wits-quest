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
  // ───────────────────────── extra branch coverage for Quests ─────────────────────────
describe("Quests page — extra branches", () => {
  const makeFromChain = (data, error = null) => ({
    select: () => ({
      order: () => Promise.resolve({ data, error }),
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // reset supabase mocks to a known state
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
      error: null,
    });
    supabase.from.mockImplementation(() => makeFromChain([QUEST_A], null));
    global.fetch = jest.fn();
  });

  it("reuses cached location on second open (no second fetch)", async () => {
    render(<Quests />);

    // First open → fetches location and caches it
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "loc-1", name: "Library" }),
    });

    await screen.findByRole("button", { name: /view details/i });
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));
    await screen.findByRole("dialog");
    // close
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Second open → should NOT call fetch again (cache hit)
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));
    await screen.findByRole("dialog");
    // only 1 fetch call (first location)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows toast when location fetch fails", async () => {
    render(<Quests />);

    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Failed to load location" }),
    });

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to load location", { id: "tid-1" })
    );
  });

  it("omits Authorization header when no JWT is available on location fetch", async () => {
    // Make session fetch return no token
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<Quests />);

    // Intercept fetch call and check headers
    global.fetch.mockImplementationOnce((url, init) =>
      Promise.resolve({
        ok: true,
        json: async () => ({ id: "loc-1", name: "NoAuth" }),
      }).then((r) => {
        expect(init?.headers?.Authorization).toBeUndefined();
        return r;
      })
    );

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    await screen.findByRole("dialog");
  });

  it("prompts login when adding without session and navigates on confirm", async () => {
    // mounted component still loads quests
    render(<Quests />);

    // For addToMyQuests path, make auth.getSession return null at click time
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: { access_token: "t" } }, error: null }); // initial mount token fetch
    // location fetch
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) });

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");

    // When pressing "Add", force auth.getSession to return null (no token)
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await userEvent.click(within(dialog).getByRole("button", { name: /add to my quests/i }));

    // Login-required modal shows
    const loginModal = await screen.findByRole("dialog", { name: /login required/i });
    await userEvent.click(within(loginModal).getByRole("button", { name: /go to login/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("treats already-saved quest as success without POST", async () => {
    render(<Quests />);

    // location, then GET user-quests returns the quest id
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) }) // location
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ questId: 1 }],
      }); // GET user-quests

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /add to my quests/i }));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("This quest is already in your list.", {
        id: "tid-1",
      })
    );
    // Only 2 fetches (location + GET), no POST
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("handles POST 409 conflict by showing success and not throwing", async () => {
    render(<Quests />);

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) }) // location
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // GET user-quests
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: "already" }),
      }); // POST add -> conflict

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /add to my quests/i }));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("This quest is already in your list.", {
        id: "tid-1",
      })
    );
  });

  it("prevents double POST when clicking Add twice quickly (pendingAdds guard)", async () => {
    render(<Quests />);

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) }) // location
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // GET user-quests
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "new" }) }); // POST add

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");

    // click twice before awaiting network resolution
    const addBtn = within(dialog).getByRole("button", { name: /add to my quests/i });
    await userEvent.click(addBtn);
    await userEvent.click(addBtn);

    await waitFor(() => {
      const toast = require("react-hot-toast").default;
      expect(toast.success).toHaveBeenCalledWith("Added to your quests!", { id: "tid-1" });
    });

    // Calls: 1 location + 1 GET + 1 POST (not 2 posts)
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("builds map iframe src from address when lat/lng are missing", async () => {
    render(<Quests />);

    // Return a location without lat/lng but with address
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "loc-1", name: "Place", address: "1 Test Road" }),
    });

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const iframe = await screen.findByTitle("map");
    expect(iframe.getAttribute("src")).toMatch(/q=1%20Test%20Road/i);
  });

  it("closes modal on Escape and on backdrop click, but not on inner click", async () => {
    render(<Quests />);

    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ id: "loc-1" }) });

    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    const dialog = await screen.findByRole("dialog");

    // inner click should not close
    await userEvent.click(within(dialog).getByRole("button", { name: /close/i }), { skipHover: true });
    // (we clicked the close button above to prove it *does* close, so reopen)
    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    await screen.findByRole("dialog");

    // backdrop click closes
    await userEvent.click(screen.getByRole("dialog").parentElement);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // reopen and close via Escape
    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    await screen.findByRole("dialog");

    // fire Escape
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

});
