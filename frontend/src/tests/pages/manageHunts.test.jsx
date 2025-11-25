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

// Mock supabase
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {},
}));

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

jest.mock("../../components/ComboBox", () => (props) => {
  const { value, onChange, options, placeholder } = props;
  return (
    <select
      data-testid="collectible-combo"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder || "Select"}</option>
      {options?.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
});

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

const COLLECTIBLES = [
  { id: 1, name: "Gold Badge" },
  { id: 2, name: "Silver Badge" },
];

const HUNTS = [
  {
    id: 1,
    name: "Campus Hunt",
    description: "Find clues around campus",
    question: "Where is the library?",
    answer: "Main Library",
    timeLimit: 120,
    collectibleId: 1,
    pointsAchievable: 10,
  },
  {
    id: 2,
    name: "Museum Hunt",
    description: "Discover artifacts",
    question: "What year was it built?",
    answer: "1920",
    timeLimit: 300,
    collectibleId: 2,
    pointsAchievable: 20,
  },
];

/* ================================ Tests ================================= */

describe("ManageHunts page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads hunts on mount and renders cards", async () => {
    mockFetch(HUNTS); // GET /hunts
    mockFetch(COLLECTIBLES); // GET /collectibles

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
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch hunts", { id: "toast-id" });
    });

    // Should render empty list (no cards)
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("handles collectibles load failure gracefully", async () => {
    mockFetch(HUNTS);
    mockFetchError(500, "Failed to fetch collectibles");

    render(<ManageHunts />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /manage hunts/i })
    ).toBeInTheDocument();

    // Should still render hunts
    expect(await screen.findByRole("heading", { level: 2, name: /campus hunt/i })).toBeInTheDocument();
  });

  it("refresh button reloads hunts", async () => {
    mockFetch([HUNTS[0]]); // initial hunts
    mockFetch(COLLECTIBLES); // initial collectibles
    mockFetch(HUNTS); // after refresh

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
    mockFetch([HUNTS[0]]); // load hunts
    mockFetch(COLLECTIBLES); // load collectibles

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
      collectibleId: 1,
      pointsAchievable: 10,
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
            collectibleId: 1,
            pointsAchievable: 10,
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
    mockFetch(COLLECTIBLES);

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

  it("opens delete confirmation modal instead of using window.confirm", async () => {
    mockFetch([HUNTS[0]]); // load
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    // Modal appears
    expect(await screen.findByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText(/campus hunt/i)).toBeInTheDocument();
  });

  it("cancels delete from confirmation modal", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    expect(await screen.findByText(/are you sure you want to delete/i)).toBeInTheDocument();

    const cancelButton = screen.getByText(/^cancel$/i);
    await userEvent.click(cancelButton);

    // Modal closed
    await waitFor(() => {
      expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument();
    });

    // Hunt still exists
    expect(screen.getByRole("heading", { level: 2, name: /campus hunt/i })).toBeInTheDocument();
  });

  it("confirms delete from modal and removes hunt", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    expect(await screen.findByText(/are you sure you want to delete/i)).toBeInTheDocument();

    mockFetch("", 200); // DELETE reply

    const confirmButton = screen.getByText(/confirm/i);
    await userEvent.click(confirmButton);

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

  it("delete error shows toast", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const cardRoot = card.closest(".quest-card");

    await userEvent.click(within(cardRoot).getByText(/delete/i));

    mockFetchError(500, "Failed to delete hunt");

    await userEvent.click(screen.getByText(/confirm/i));

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete hunt", { id: "toast-id" });
    });
  });

  it("navigates back to admin dashboard", async () => {
    mockFetch([]); // load empty
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    await userEvent.click(screen.getByText(/back to admin/i));
    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("treats non-array /hunts payload as empty but still toasts success", async () => {
    mockFetch({ ok: true, message: "not-an-array" });
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /manage hunts/i })
    ).toBeInTheDocument();

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();

    const toast = (await import("react-hot-toast")).default;
    expect(toast.success).toHaveBeenCalledWith("Hunts loaded", { id: "toast-id" });
  });

  it("clicking Edit on a hunt without id shows toast error and does not open form", async () => {
    mockFetch([{ name: "No ID Hunt", description: "x" }]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /no id hunt/i });
    const toast = (await import("react-hot-toast")).default;

    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid hunt selected");
    });

    expect(screen.queryByPlaceholderText(/hunt name/i)).not.toBeInTheDocument();
  });

  it("save sends timeLimit: null when left blank", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    const timeInput = await screen.findByPlaceholderText(/time limit/i);
    await userEvent.clear(timeInput);

    mockFetch({ hunt: { ...HUNTS[0], timeLimit: null } });

    await userEvent.click(screen.getByText(/save hunt/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/hunts/1`,
        expect.objectContaining({
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: HUNTS[0].name,
            description: HUNTS[0].description,
            question: HUNTS[0].question,
            answer: HUNTS[0].answer,
            timeLimit: null,
            collectibleId: 1,
            pointsAchievable: 10,
          }),
        })
      );
    });
  });

  it("save sends collectibleId: null when left blank", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    const collectibleSelect = await screen.findByTestId("collectible-combo");
    await userEvent.selectOptions(collectibleSelect, "");

    mockFetch({ hunt: { ...HUNTS[0], collectibleId: null } });

    await userEvent.click(screen.getByText(/save hunt/i));

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const putCall = calls.find(c => c[0].includes("/hunts/1") && c[1]?.method === "PUT");
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall[1].body);
      expect(body.collectibleId).toBeNull();
    });
  });

  it("deleting the currently edited hunt also closes the form", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    const root = card.closest(".quest-card");

    await userEvent.click(within(root).getByText(/edit/i));
    expect(await screen.findByPlaceholderText(/hunt name/i)).toBeInTheDocument();

    await userEvent.click(within(root).getByText(/delete/i));
    
    mockFetch("", 200);
    await userEvent.click(screen.getByText(/confirm/i));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/hunts/1`,
        expect.objectContaining({ method: "DELETE", credentials: "include" })
      );
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/hunt name/i)).not.toBeInTheDocument();
    });
  });

  it("Cancel button exits edit mode without saving", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    expect(await screen.findByPlaceholderText(/hunt name/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText(/^cancel$/i));

    expect(screen.queryByPlaceholderText(/hunt name/i)).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/hunts/1"),
      expect.objectContaining({ method: "PUT" })
    );
  });

  it("Reset button restores original form values", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    const nameInput = await screen.findByPlaceholderText(/hunt name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Modified Name");

    expect(nameInput).toHaveValue("Modified Name");

    await userEvent.click(screen.getByText(/reset/i));

    expect(nameInput).toHaveValue("Campus Hunt");
  });

  it("navigates to New Hunt page when New Hunt button clicked", async () => {
    mockFetch([]);
    mockFetch(COLLECTIBLES);

    render(<ManageHunts />);

    await userEvent.click(await screen.findByText(/new hunt/i));
    expect(mockNavigate).toHaveBeenCalledWith("/addHunt");
  });

  it("handles non-array collectibles response", async () => {
    mockFetch(HUNTS);
    mockFetch({ error: "Not an array" }); // collectibles returns object

    render(<ManageHunts />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /manage hunts/i })
    ).toBeInTheDocument();

    // Should still render hunts
    expect(await screen.findByRole("heading", { level: 2, name: /campus hunt/i })).toBeInTheDocument();
  });

  it("handles pointsAchievable conversion to number (0 when empty)", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    const pointsInput = await screen.findByPlaceholderText(/points achievable/i);
    await userEvent.clear(pointsInput);

    mockFetch({ hunt: { ...HUNTS[0], pointsAchievable: 0 } });

    await userEvent.click(screen.getByText(/save hunt/i));

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const putCall = calls.find(c => c[0].includes("/hunts/1") && c[1]?.method === "PUT");
      expect(putCall).toBeDefined();
      const body = JSON.parse(putCall[1].body);
      expect(body.pointsAchievable).toBe(0);
    });
  });

  it("form inputs update formData state correctly", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

    const descInput = await screen.findByPlaceholderText(/description/i);
    await userEvent.clear(descInput);
    await userEvent.type(descInput, "New Description");

    expect(descInput).toHaveValue("New Description");
  });

  it("handles save when editingHunt has no id", async () => {
    mockFetch([HUNTS[0]]);
    mockFetch(COLLECTIBLES);
    
    render(<ManageHunts />);

    const card = await screen.findByRole("heading", { level: 2, name: /campus hunt/i });
    await userEvent.click(within(card.closest(".quest-card")).getByText(/edit/i));

  });
});
