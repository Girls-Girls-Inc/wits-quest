/** @jest-environment jsdom */

const API_BASE = process.env.VITE_WEB_URL || "http://localhost:3000";

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ================= Polyfills ================= */

const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ================= Mocks ================= */

// fetch
global.fetch = jest.fn();

// Router
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Toast
jest.mock("react-hot-toast", () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "toast-id"),
    dismiss: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockToast,
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => <div data-testid="toaster" />,
  };
});

// Supabase client: we provide jest.fn shells that tests will set up per test.
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    from: jest.fn(),
    storage: {
      from: jest.fn(),
    },
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Lightweight UI mocks
jest.mock("../../components/InputField", () => (props) => {
  const { name, placeholder, value, onChange, required, type = "text" } = props;
  return (
    <input
      data-testid={name}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      type={type}
    />
  );
});

jest.mock("../../components/IconButton", () => (props) => (
  <button
    data-testid={`icon-btn-${(props.label || "button")
      .toLowerCase()
      .replace(/\s+/g, "-")}`}
    {...props}
  >
    {props.label || "Button"}
  </button>
));

// CSS
jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

import supabase from "../../supabase/supabaseClient";
import ManageQuests from "../../pages/manageQuests";

/* ================= Helpers ================= */

// common text matcher when labels & values are split across elements
const hasText = (re) => (_c, n) => (n?.textContent ? re.test(n.textContent) : false);

const mockFetch = (response, status = 200, headers = { "content-type": "application/json" }) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(
      typeof response === "string" ? response : JSON.stringify(response)
    ),
    json: jest.fn().mockResolvedValue(
      typeof response === "string" ? JSON.parse(response) : response
    ),
    headers: { get: (k) => headers[k?.toLowerCase()] ?? headers[k] ?? null },
  });
};

const mockFetchError = (status = 500, message = "Server error") => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(message),
    json: jest.fn().mockRejectedValue(new Error("not json")),
    headers: { get: () => "text/plain" },
  });
};

// Supabase setup for loadQuests() path
const setupSupabaseForQuests = ({
  questsData = [],
  badgeData = [],
  publicUrlHost = "https://cdn.test/",
  session = { access_token: "tok-123" },
} = {}) => {
  // auth.getSession (used for /quizzes fetch + later actions)
  supabase.auth.getSession.mockResolvedValue({ data: { session } });

  // storage.from('quests').getPublicUrl(path)
  const getPublicUrl = jest.fn((path) => ({
    data: { publicUrl: `${publicUrlHost}${String(path).replace(/^\//, "")}` },
  }));
  supabase.storage.from.mockImplementation((bucket) => {
    if (bucket !== "quests") return { getPublicUrl: jest.fn(() => ({ data: { publicUrl: "" } })) };
    return { getPublicUrl };
  });

  // from('...') select/order chains
  supabase.from.mockImplementation((table) => {
    if (table === "quests") {
      return {
        select: () => ({
          order: () => Promise.resolve({ data: questsData, error: null }),
        }),
      };
    }
    if (table === "quest_with_badges") {
      return {
        select: () =>
          Promise.resolve({
            data: badgeData,
            error: null,
          }),
      };
    }
    // default: never used here
    return {
      select: () => Promise.resolve({ data: [], error: null }),
    };
  });
};

/* ================= Test Data ================= */

const QUESTS = [
  {
    id: 1,
    name: "Find the Library",
    description: "Look for the main library",
    locationId: 10,
    pointsAchievable: 25,
    collectibleId: null,
    huntId: null,
    quizId: 101,
    isActive: true,
    createdAt: "2025-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Visit the Museum",
    description: "Walk to the museum",
    locationId: 11,
    pointsAchievable: 10,
    collectibleId: 5,
    huntId: 3,
    quizId: null,
    isActive: false,
    createdAt: "2025-01-02T00:00:00Z",
  },
];

const BADGES = [
  { questId: 1, imageUrl: "folder/img1.png" },
  { questId: 2, imageUrl: "https://assets.example.com/folder/img2.png" }, // already absolute
];

const LOCATIONS = [{ id: 10, name: "Campus Library" }, { id: 11, name: "City Museum" }];
const COLLECTIBLES = [{ id: 5, name: "Gold Badge" }];
const HUNTS = [{ id: 3, name: "Starter Hunt" }];
const QUIZZES = [{ id: 101, questionText: "What is 2 + 2?" }];

/* ============================== Tests =============================== */

describe("ManageQuests page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    mockNavigate.mockReset();
  });

  it("loads quests, merges images, fetches related lists, and renders cards", async () => {
    setupSupabaseForQuests({
      questsData: QUESTS,
      badgeData: BADGES,
      publicUrlHost: "https://assets.example.com/",
      session: { access_token: "tok-123" },
    });

    // fetch sequence for locations, collectibles, hunts, quizzes
    mockFetch(LOCATIONS);     // GET /locations
    mockFetch(COLLECTIBLES);  // GET /collectibles
    mockFetch(HUNTS);         // GET /hunts
    mockFetch(QUIZZES);       // GET /quizzes (auth)

    render(<ManageQuests />);

    // header
    expect(
      await screen.findByRole("heading", { level: 1, name: /manage quests/i })
    ).toBeInTheDocument();

    // cards
    const card1 = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const root1 = card1.closest(".quest-card");
    expect(within(root1).getByText(hasText(/Points:\s*25/i))).toBeInTheDocument();
    expect(within(root1).getByText(hasText(/Active:\s*Yes/i))).toBeInTheDocument();
    // mapped names
    expect(within(root1).getByText(hasText(/Collectible:\s*-\s*$/i))).toBeInTheDocument();
    expect(within(root1).getByText(hasText(/Hunt:\s*-\s*$/i))).toBeInTheDocument();
    expect(within(root1).getByText(hasText(/Quiz:\s*What is 2 \+ 2\?/i))).toBeInTheDocument();

    const img1 = within(root1).getByRole("img", { name: /find the library/i });
    expect(img1).toHaveAttribute("src", "https://assets.example.com/folder/img1.png");

    const card2 = screen.getByRole("heading", { level: 2, name: /visit the museum/i });
    const root2 = card2.closest(".quest-card");
    expect(within(root2).getByText(hasText(/Points:\s*10/i))).toBeInTheDocument();
    expect(within(root2).getByText(hasText(/Active:\s*No/i))).toBeInTheDocument();
    expect(within(root2).getByText(hasText(/Collectible:\s*Gold Badge/i))).toBeInTheDocument();
    expect(within(root2).getByText(hasText(/Hunt:\s*Starter Hunt/i))).toBeInTheDocument();
    expect(within(root2).getByText(hasText(/Quiz:\s*-\s*$/i))).toBeInTheDocument();

    const img2 = within(root2).getByRole("img", { name: /visit the museum/i });
    expect(img2).toHaveAttribute("src", "https://assets.example.com/folder/img2.png");

    const toast = (await import("react-hot-toast")).default;
    expect(toast.success).toHaveBeenCalledWith("Quests loaded", { id: "toast-id" });
  });

  it("handles supabase load error and shows toast", async () => {
    // Make 'quests' call fail
    supabase.from.mockImplementation((table) => {
      if (table === "quests") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: null, error: new Error("boom") }),
          }),
        };
      }
      if (table === "quest_with_badges") {
        return { select: () => Promise.resolve({ data: [], error: null }) };
      }
      return { select: () => Promise.resolve({ data: [], error: null }) };
    });
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "tok" } } });
    supabase.storage.from.mockReturnValue({ getPublicUrl: jest.fn(() => ({ data: { publicUrl: "" } })) });

    // still attempt related fetches (component calls them anyway)
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("boom", { id: "toast-id" });
    });

    // no cards
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("does not fetch quizzes when unauthenticated and shows '-' mapping", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]], // has quizId 101, but we won't fetch quizzes
      badgeData: [BADGES[0]],
      session: null, // no token -> loadQuizzes early return
    });

    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    // no quizzes call enqueued

    render(<ManageQuests />);

    const card = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const root = card.closest(".quest-card");
    expect(within(root).getByText(hasText(/Quiz:\s*-\s*$/i))).toBeInTheDocument();

    // Ensure we didn't call /quizzes
    expect(global.fetch).not.toHaveBeenCalledWith(
      `${API_BASE}/quizzes`,
      expect.anything()
    );
  });

  it("Refresh button reloads quests", async () => {
    // initial list -> one quest
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    expect(
      await screen.findByRole("heading", { level: 2, name: /find the library/i })
    ).toBeInTheDocument();

    // Update supabase.from to now return both quests for next load
    setupSupabaseForQuests({
      questsData: QUESTS,
      badgeData: BADGES,
      session: { access_token: "tok" },
    });

    // No related fetches on refresh (they're separate buttons) — but the component's
    // "Refresh" only reloads quests; we don't re-fetch lists here. It's ok.
    // Clicking refresh triggers loadQuests() → which calls supabase only.
    await userEvent.click(screen.getByText(/refresh/i));

    // The second item should appear
    expect(
      await screen.findByRole("heading", { level: 2, name: /visit the museum/i })
    ).toBeInTheDocument();
  });

  it("opens Edit, saves via PUT (with token), updates row and closes form", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-999" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const cardRoot = heading.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/edit/i));

    // form shows with values
    const nameInput = await screen.findByPlaceholderText(/quest name/i);
    const descInput = screen.getByPlaceholderText(/quest description/i);
    const pointsInput = screen.getByPlaceholderText(/points achievable/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Quest");
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "Clue-based quest");
    await userEvent.clear(pointsInput);
    await userEvent.type(pointsInput, "30");

    // successful PUT
    mockFetch({
      quest: {
        ...QUESTS[0],
        name: "Updated Quest",
        description: "Clue-based quest",
        pointsAchievable: 30,
      },
    });

    await userEvent.click(screen.getByText(/save quest/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/quests/1`,
        expect.objectContaining({
          method: "PUT",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer tok-999",
          }),
          body: JSON.stringify({
            name: "Updated Quest",
            description: "Clue-based quest",
            locationId: 10,
            pointsAchievable: 30,
            collectibleId: null,
            huntId: null,
            quizId: 101,
            isActive: true,
          }),
        })
      );
    });

    const toast = (await import("react-hot-toast")).default;
    expect(toast.success).toHaveBeenCalledWith("Quest updated", { id: "toast-id" });

    // Form closes; heading updates
    expect(
      await screen.findByRole("heading", { level: 2, name: /updated quest/i })
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/quest name/i)).not.toBeInTheDocument();
  });

  it("save shows error toast on server error", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-1" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const cardRoot = heading.closest(".quest-card");
    await userEvent.click(within(cardRoot).getByText(/edit/i));

    mockFetch({ message: "Failed to update quest" }, 400);

    await userEvent.click(screen.getByText(/save quest/i));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update quest", { id: "toast-id" });
    });
  });

  it("delete removes the card when confirmed", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-1" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const cardRoot = heading.closest(".quest-card");

    // DELETE success
    mockFetch({}, 200);

    await userEvent.click(within(cardRoot).getByText(/delete/i));
    const dialog = await screen.findByRole("dialog", { name: /delete quest\?/i });
    await userEvent.click(within(dialog).getByText(/delete quest/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/quests/1`,
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
          headers: { Authorization: "Bearer tok-1" },
        })
      );
    });

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Quest deleted", { id: "toast-id" });
      expect(
        screen.queryByRole("heading", { level: 2, name: /find the library/i })
      ).not.toBeInTheDocument();
    });
  });

  it("does not delete if user cancels confirm", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-1" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const cardRoot = heading.closest(".quest-card");
    await userEvent.click(within(cardRoot).getByText(/delete/i));
    const dialog = await screen.findByRole("dialog", { name: /delete quest\?/i });
    await userEvent.click(within(dialog).getByText(/cancel/i));

    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/quests/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("delete shows error toast on failure", async () => {
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-1" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const cardRoot = heading.closest(".quest-card");

    mockFetchError(500, "Failed to delete quest");

    await userEvent.click(within(cardRoot).getByText(/delete/i));
    const dialog = await screen.findByRole("dialog", { name: /delete quest\?/i });
    await userEvent.click(within(dialog).getByText(/delete quest/i));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete quest", { id: "toast-id" });
    });
  });

  it("Back to Admin navigates to /adminDashboard", async () => {
    setupSupabaseForQuests({
      questsData: [],
      badgeData: [],
      session: { access_token: "tok" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    await userEvent.click(screen.getByText(/back to admin/i));
    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("shows session expired error on save/delete when no token", async () => {
    // load with a session (for initial lists)
    setupSupabaseForQuests({
      questsData: [QUESTS[0]],
      badgeData: [BADGES[0]],
      session: { access_token: "tok-initial" },
    });
    mockFetch(LOCATIONS);
    mockFetch(COLLECTIBLES);
    mockFetch(HUNTS);
    mockFetch(QUIZZES);

    render(<ManageQuests />);

    const heading = await screen.findByRole("heading", { level: 2, name: /find the library/i });
    const root = heading.closest(".quest-card");
    await userEvent.click(within(root).getByText(/edit/i));

    // Simulate later getToken() returning no session
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await userEvent.click(screen.getByText(/save quest/i));
    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Session expired. Please sign in again.");
    });

    // Delete path:
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    await userEvent.click(within(root).getByText(/delete/i));
    const dialog = await screen.findByRole("dialog", { name: /delete quest\?/i });
    await userEvent.click(within(dialog).getByText(/delete quest/i));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Session expired. Please sign in again.", { id: "toast-id" });
    });
  });
});

