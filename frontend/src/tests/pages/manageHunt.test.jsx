/** @jest-environment jsdom */

const API_BASE = process.env.VITE_WEB_URL || "http://localhost:3000";

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

// Mock fetch globally (overridden per test by helpers)
global.fetch = jest.fn();

// Mock confirm globally
global.confirm = jest.fn();

// Router mock
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Toasts
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

// Component mocks
jest.mock("../../components/InputField", () => (props) => {
  const { name, placeholder, value, onChange, required, type } = props;
  return (
    <input
      data-testid={name}
      name={name}
      placeholder={placeholder}
      value={value || ""}
      onChange={onChange}
      required={required}
      type={type || "text"}
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

// CSS imports
jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

import ManageHunts from "../../pages/manageHunts";

/* ========================= Helpers ========================= */

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
    headers: { get: (k) => headers[k.toLowerCase()] ?? headers[k] ?? null },
  });
};

const mockFetchError = (status = 500, message = "Server error") => {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    text: jest.fn().mockResolvedValue(message),
    json: jest.fn().mockRejectedValue(new Error("Not JSON")),
    headers: { get: () => "text/plain" },
  });
};

// Match split text like "<strong>Question:</strong> Foo"
const hasText = (re) => (_content, node) => {
  const text = node?.textContent || "";
  return re.test(text);
};

/* ========================= Test Data ========================= */

const HUNTS = [
  {
    id: 1,
    name: "Campus Hunt",
    description: "Find clues around campus",
    question: "Where is the library?",
    answer: "Main Library",
    timeLimit: 120,
  },
  {
    id: 2,
    name: "Museum Hunt",
    description: "Discover artifacts",
    question: "What year was it built?",
    answer: "1920",
    timeLimit: 300,
  },
];

/* ================================ Tests ================================= */

describe("ManageHunts page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads hunts on mount and renders cards", async () => {
    mockFetch(HUNTS); // GET /hunts

    render(<ManageHunts />);

    // Header
    expect(
      await screen.findByRole("heading", { level: 1, name: /manage hunts/i })
    ).toBeInTheDocument();

    // Calls API
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE}/hunts`,
      expect.objectContaining({ credentials: "include" })
    );

    // Shows rows
    expect(await screen.findByRole("heading", { level: 2, name: /campus hunt/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /museum hunt/i })).toBeInTheDocument();

    // Split label/value assertions
    const campusCard = screen.getByRole("heading", { level: 2, name: /campus hunt/i }).closest(".quest-card");
    expect(within(campusCard).getByText(hasText(/Question:\s*Where is the library\?/i))).toBeInTheDocument();
    expect(within(campusCard).getByText(hasText(/Answer:\s*Main Library/i))).toBeInTheDocument();
    expect(within(campusCard).getByText(hasText(/Time Limit:\s*120/i))).toBeInTheDocument();

    const toast = (await import("react-hot-toast")).default;
    expect(toast.success).toHaveBeenCalledWith("Hunts loaded", { id: "toast-id" });
  });

  it("shows error toast when hunts load fails", async () => {
    mockFetchError(500, "Failed to fetch hunts");

    render(<ManageHunts />);

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch hunts", { id: "toast-id" });
    });

    // Should render empty list (no cards)
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("refresh button reloads hunts", async () => {
    mockFetch([HUNTS[0]]); // initial
    mockFetch(HUNTS);      // after refresh

    render(<ManageHunts />);

    expect(
      await screen.findByRole("heading", { level: 2, name: /campus hunt/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByText(/refresh/i));

    // After refresh, second item appears
    expect(
      await screen.findByRole("heading", { level: 2, name: /museum hunt/i })
    ).toBeInTheDocument();
  });

  it("opens edit form, saves via PUT, updates state and closes form", async () => {
    mockFetch([HUNTS[0]]); // load

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");
    await userEvent.click(within(cardRoot).getByText(/edit/i));

    // Form populated
    const nameInput = await screen.findByPlaceholderText(/hunt name/i);
    const timeInput = screen.getByPlaceholderText(/time limit/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Hunt");
    await userEvent.clear(timeInput);
    await userEvent.type(timeInput, "180");

    // PUT /hunts/1
    const updated = {
      id: 1,
      name: "Updated Hunt",
      description: HUNTS[0].description,
      question: HUNTS[0].question,
      answer: HUNTS[0].answer,
      timeLimit: 180,
    };
    mockFetch({ hunt: updated }); // PUT reply

    await userEvent.click(screen.getByText(/save hunt/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/hunts/1`,
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: "Updated Hunt",
            description: "Find clues around campus",
            question: "Where is the library?",
            answer: "Main Library",
            timeLimit: 180,
          }),
        })
      );
    });

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Hunt updated", { id: "toast-id" });
      // Form closed
      expect(screen.queryByPlaceholderText(/hunt name/i)).not.toBeInTheDocument();
    });

    // Row shows updated name
    expect(
      screen.getByRole("heading", { level: 2, name: /updated hunt/i })
    ).toBeInTheDocument();
  });

  it("save error shows toast", async () => {
    mockFetch([HUNTS[0]]); // load

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");
    await userEvent.click(within(cardRoot).getByText(/edit/i));

    // Force server error on PUT
    mockFetch({ message: "Failed to update hunt" }, 400);

    await userEvent.click(screen.getByText(/save hunt/i));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update hunt", { id: "toast-id" });
    });
  });

  it("deletes a hunt after confirmation and removes card", async () => {
    global.confirm.mockReturnValue(true);
    mockFetch([HUNTS[0]]); // load

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    mockFetch("", 200); // DELETE reply

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    expect(global.confirm).toHaveBeenCalledWith("Delete this hunt?");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/hunts/1`,
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
        })
      );
    });

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Hunt deleted", { id: "toast-id" });
      expect(
        screen.queryByRole("heading", { level: 2, name: /campus hunt/i })
      ).not.toBeInTheDocument();
    });
  });

  it("cancels delete when user declines confirmation", async () => {
    global.confirm.mockReturnValue(false);
    mockFetch([HUNTS[0]]); // load

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    expect(global.confirm).toHaveBeenCalled();
    // No DELETE call
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/hunts/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("delete error shows toast", async () => {
    global.confirm.mockReturnValue(true);
    mockFetch([HUNTS[0]]); // load

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    mockFetchError(500, "Failed to delete hunt");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete hunt", { id: "toast-id" });
    });
  });

  it("navigates back to admin dashboard", async () => {
    mockFetch([]); // load empty

    render(<ManageHunts />);

    await userEvent.click(screen.getByText(/back to admin/i));
    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });
});
