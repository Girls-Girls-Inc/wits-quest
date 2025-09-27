/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills (for libs that expect them)
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

// Replace IconButton with a plain button
jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));

// Replace InputField with a plain input
jest.mock("../../components/InputField", () => (props) => <input {...props} />);

// Styles no-ops
jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

/* ========================= Supabase mock ========================= */

const makeFromChain = (table, data, error = null) => {
  // For quests: .select().order() -> Promise
  // For quest_with_badges: .select() -> Promise
  const chain = {
    select: jest.fn(() => {
      if (table === "quests") {
        return {
          order: jest.fn(() => Promise.resolve({ data, error })),
        };
      }
      // quest_with_badges (no .order() used in code)
      return Promise.resolve({ data, error });
    }),
  };
  return chain;
};

// IMPORTANT: Jest allows variables prefixed with `mock` to be referenced in a mock factory.
let mockSupabaseHandlers = {};
const setMockSupabaseHandlers = (handlers) => {
  mockSupabaseHandlers = handlers || {};
};

// Full supabase client mock
jest.mock("../../supabase/supabaseClient", () => {
  const auth = { getSession: jest.fn() };
  const from = jest.fn((table) => {
    const h = mockSupabaseHandlers || {};
    if (table === "quests") {
      return makeFromChain("quests", h.questsData || [], h.questsError || null);
    }
    if (table === "quest_with_badges") {
      return makeFromChain("quest_with_badges", h.badgesData || [], h.badgesError || null);
    }
    // default no-op
    return makeFromChain(table, [], null);
  });

  const storage = {
    from: jest.fn(() => ({
      getPublicUrl: jest.fn((path) => ({
        data: {
          publicUrl: (mockSupabaseHandlers?.publicUrlBase || "https://cdn.test") + "/" + path,
        },
      })),
    })),
  };

  return {
    __esModule: true,
    default: { from, auth, storage },
  };
});

import supabase from "../../supabase/supabaseClient";

/* =============== fetch router + helpers =============== */

// Component builds `${API_BASE}/…`. In tests API_BASE may be undefined, so final URL
// might look like "undefined/locations" or just "/locations" depending on code.
// We match by regex on the tail (…/locations, …/collectibles, …/hunts, …/quizzes, …/quests/:id)
let routes;
const setupFetchRouter = () => {
  routes = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    const u = typeof url === "string" ? url : `${url}`;
    const method = (opts.method || "GET").toUpperCase();

    const idx = routes.findIndex((r) => {
      const mOk = !r.method || r.method === method;
      const uOk = r.url instanceof RegExp ? r.url.test(u) : r.url === u;
      return mOk && uOk;
    });
    if (idx === -1) throw new Error(`No mock for ${method} ${u}`);

    const hit = routes[idx];
    // consume in order
    routes.splice(idx, 1);
    return typeof hit.reply === "function" ? hit.reply(u, opts) : hit.reply;
  });
};

const addRoute = (method, url, reply) => routes.push({ method, url, reply });

const jsonRes = (obj, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (k) =>
      k && k.toLowerCase() === "content-type"
        ? headers["content-type"] || "application/json"
        : null,
  },
  text: async () => JSON.stringify(obj),
});
const textRes = (txt, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? null },
  text: async () => txt,
});

/* =============== Globals/Env =============== */

beforeEach(() => {
  jest.clearAllMocks();
  setupFetchRouter();
  // Provide a default auth token for API calls that require it
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: "tok-123" } },
    error: null,
  });
});

// Quiet unrelated act() warnings from other components imported elsewhere in the suite
beforeAll(() => {
  jest.spyOn(console, "error").mockImplementation((msg, ...rest) => {
    if (typeof msg === "string" && msg.includes("not wrapped in act")) return;
    // pass through anything else
    // eslint-disable-next-line no-console
    console.warn(msg, ...rest);
  });
});

afterAll(() => {
  // restore after suite
  console.error.mockRestore();
});

// confirm() used in delete flow
beforeAll(() => {
  jest.spyOn(window, "confirm").mockImplementation(() => true);
});
afterAll(() => {
  window.confirm.mockRestore();
});

/* =============== import component =============== */

const path = require("path");
const absPath = path.resolve(__dirname, "../../pages/manageQuests.jsx");
jest.unmock(absPath);
const ManageQuests = require(absPath).default;

/* ========================= Test Data ========================= */

const QUEST = {
  id: 1,
  name: "Find the Library",
  description: "Clue-based quest",
  locationId: 10,
  collectibleId: 100,
  huntId: 500,
  quizId: 900,
  pointsAchievable: 25,
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
};

const BADGE = { questId: 1, imageUrl: "folder/img1.png" };

const LOCATIONS = [{ id: 10, name: "Main Library" }];
const COLLECTIBLES = [{ id: 100, name: "Gold Badge" }];
const HUNTS = [{ id: 500, name: "Orientation Hunt" }];
const QUIZZES = [{ id: 900, questionText: "What is 2+2?" }];

/* ========================= Helpers ========================= */

const registerDefaultApiRoutes = () => {
  // match tail so "undefined/..." or "/..." both pass
  addRoute("GET", /\/locations$/, jsonRes(LOCATIONS));
  addRoute("GET", /\/collectibles$/, jsonRes(COLLECTIBLES));
  addRoute("GET", /\/hunts$/, jsonRes(HUNTS));
  addRoute("GET", /\/quizzes$/, jsonRes(QUIZZES));
};

/* ================================ Tests ================================= */

describe("ManageQuests page", () => {
  it("loads quests and related data, merges images, and renders cards", async () => {
    setMockSupabaseHandlers({
      questsData: [QUEST],
      badgesData: [BADGE],
      publicUrlBase: "https://assets.example.com",
    });
    registerDefaultApiRoutes();

    render(<ManageQuests />);

    // Header
    expect(
      await screen.findByRole("heading", { level: 1, name: /manage quests/i })
    ).toBeInTheDocument();

    // Card shows quest name + points + active
    const card = await screen.findByRole("heading", {
      level: 2,
      name: /find the library/i,
    });
    const cardRoot = card.closest(".quest-card");
    expect(within(cardRoot).getByText(/points:\s*25/i)).toBeInTheDocument();
    expect(within(cardRoot).getByText(/active:\s*yes/i)).toBeInTheDocument();

    // Mapped names from lists
    expect(
      within(cardRoot).getByText(/collectible:\s*gold badge/i)
    ).toBeInTheDocument();
    expect(
      within(cardRoot).getByText(/hunt:\s*orientation hunt/i)
    ).toBeInTheDocument();
    expect(
      within(cardRoot).getByText(/quiz:\s*what is 2\+2\?/i)
    ).toBeInTheDocument();

    // Image URL from storage.getPublicUrl(...)
    const img = within(cardRoot).getByRole("img", { name: /find the library/i });
    expect(img).toHaveAttribute(
      "src",
      expect.stringMatching(/^https:\/\/assets\.example\.com\/folder\/img1\.png$/)
    );
  });

  it("opens Edit, saves via PUT, and updates row + shows success toast", async () => {
    const toast = (await import("react-hot-toast")).default;

    setMockSupabaseHandlers({ questsData: [QUEST], badgesData: [BADGE] });
    registerDefaultApiRoutes();

    // PUT /quests/1
    addRoute("PUT", /\/quests\/1$/, (url, opts) => {
      // Validate auth header present
      expect(opts.headers.Authorization).toMatch(/^Bearer /);
      const body = JSON.parse(opts.body);
      // echo back an updated quest
      return jsonRes({ quest: { id: 1, ...body } });
    });

    render(<ManageQuests />);

    // Open edit form
    const card = await screen.findByRole("heading", {
      level: 2,
      name: /find the library/i,
    });
    const cardRoot = card.closest(".quest-card");
    await userEvent.click(
      within(cardRoot).getByRole("button", { name: /edit/i })
    );

    // Form fields populated
    const nameInput = await screen.findByPlaceholderText(/quest name/i);
    const pointsInput = screen.getByPlaceholderText(/points achievable/i);

    // Change name and points
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Quest");
    await userEvent.clear(pointsInput);
    await userEvent.type(pointsInput, "30");

    // Save
    await userEvent.click(screen.getByRole("button", { name: /save quest/i }));

    // Row updated
    expect(
      await screen.findByRole("heading", { level: 2, name: /updated quest/i })
    ).toBeInTheDocument();
    const updatedCard = screen.getByRole("heading", {
      level: 2,
      name: /updated quest/i,
    }).closest(".quest-card");
    expect(within(updatedCard).getByText(/points:\s*30/i)).toBeInTheDocument();

    // Toast success
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Quest updated", { id: "tid-1" });
    });
  });

  it("deletes a quest via DELETE and removes the card", async () => {
    const toast = (await import("react-hot-toast")).default;

    setMockSupabaseHandlers({ questsData: [QUEST], badgesData: [BADGE] });
    registerDefaultApiRoutes();

    addRoute("DELETE", /\/quests\/1$/, jsonRes({}));

    render(<ManageQuests />);

    const card = await screen.findByRole("heading", {
      level: 2,
      name: /find the library/i,
    });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(
      within(cardRoot).getByRole("button", { name: /delete/i })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { level: 2, name: /find the library/i })
      ).not.toBeInTheDocument();
    });
    expect(toast.success).toHaveBeenCalledWith("Quest deleted", { id: "tid-1" });
  });

  it("does not fetch quizzes when unauthenticated and shows '-' for quiz mapping", async () => {
    // No session
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    // Quest with no quizId to show "-" mapping
    const QUEST_NO_QUIZ = { ...QUEST, id: 2, quizId: null };
    const BADGE2 = { questId: 2, imageUrl: "" };

    setMockSupabaseHandlers({ questsData: [QUEST_NO_QUIZ], badgesData: [BADGE2] });

    // Other lists still fetched
    addRoute("GET", /\/locations$/, jsonRes(LOCATIONS));
    addRoute("GET", /\/collectibles$/, jsonRes(COLLECTIBLES));
    addRoute("GET", /\/hunts$/, jsonRes(HUNTS));
    // No /quizzes route on purpose

    render(<ManageQuests />);

    const card = await screen.findByRole("heading", {
      level: 2,
      name: /find the library/i,
    });
    const cardRoot = card.closest(".quest-card");

    expect(within(cardRoot).getByText(/quiz:\s*-/i)).toBeInTheDocument();
  });

  it("shows a toast when supabase quest query fails", async () => {
    const toast = (await import("react-hot-toast")).default;

    setMockSupabaseHandlers({ questsData: [], questsError: { message: "boom" } });
    registerDefaultApiRoutes();

    render(<ManageQuests />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls.map((c) => c[0]).join(" ").toLowerCase();
      expect(msg).toContain("boom");
    });
  });
});
