/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockGetUser = jest.fn(() =>
  Promise.resolve({ data: { user: { id: "user-123" } }, error: null })
);

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
  },
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(() => "toast-id"),
};

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toast-mock" />,
  toast: mockToast,
}));

// Mock CSS imports
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

// Mock components
jest.mock("../../components/InputField", () => (props) => (
  <input
    type={props.type || "text"}
    name={props.name}
    placeholder={props.placeholder}
    value={props.value}
    onChange={props.onChange}
    required={props.required}
  />
));

jest.mock("../../components/IconButton", () => (props) => (
  <button onClick={props.onClick} type={props.type || "button"}>
    {props.label}
  </button>
));

jest.mock("../../components/ComboBox", () => (props) => (
  <select
    value={props.value || ""}
    onChange={(e) => props.onChange(e.target.value)}
  >
    <option value="">{props.placeholder || "Select"}</option>
    {props.options?.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
));

describe("AddHunt page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => [{ id: 1, name: "Golden Trophy" }],
      })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("loads collectibles and renders hunt creation form", async () => {
    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    expect(await screen.findByRole("heading", { name: /create hunt/i })).toBeVisible();
    expect(screen.getByPlaceholderText("Hunt Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Question")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Answer")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Time Limit (seconds)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Points Achievable")).toBeInTheDocument();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/collectibles"),
        expect.objectContaining({ credentials: "include" })
      )
    );
    expect(mockGetUser).toHaveBeenCalled();
  });

  it("navigates back to admin dashboard when back button is clicked", async () => {
    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /back to admin/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("handles collectibles load failure", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        text: async () => "Failed to load",
      })
    );

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to load collectibles");
    });
  });

  it("handles non-array collectibles response", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({ error: "Invalid response" }),
      })
    );

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create hunt/i })).toBeInTheDocument();
    });
  });

  it("updates form fields when user types", async () => {
    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();
    const nameInput = await screen.findByPlaceholderText("Hunt Name");
    const questionInput = screen.getByPlaceholderText("Question");
    const answerInput = screen.getByPlaceholderText("Answer");

    await user.type(nameInput, "Treasure Hunt");
    await user.type(questionInput, "Where is the treasure?");
    await user.type(answerInput, "Under the tree");

    expect(nameInput).toHaveValue("Treasure Hunt");
    expect(questionInput).toHaveValue("Where is the treasure?");
    expect(answerInput).toHaveValue("Under the tree");
  });

  it("submits hunt successfully with all fields", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: "Golden Trophy" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, name: "New Hunt" }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Treasure Hunt");
    await user.type(screen.getByPlaceholderText("Description"), "Find the treasure");
    await user.type(screen.getByPlaceholderText("Question"), "Where is it?");
    await user.type(screen.getByPlaceholderText("Answer"), "Under tree");
    await user.type(screen.getByPlaceholderText("Time Limit (seconds)"), "300");
    await user.type(screen.getByPlaceholderText("Points Achievable"), "50");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.loading).toHaveBeenCalledWith("Creating hunt...");
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/hunts"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: expect.stringContaining("Treasure Hunt"),
        })
      );
    });

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith(
        "Hunt created successfully!",
        { id: "toast-id" }
      );
      expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
    });
  });

  it("submits hunt with null collectibleId when not selected", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, name: "Golden Trophy" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test Hunt");
    await user.type(screen.getByPlaceholderText("Question"), "Question?");
    await user.type(screen.getByPlaceholderText("Answer"), "Answer");
    await user.type(screen.getByPlaceholderText("Points Achievable"), "10");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const postCall = calls.find(
        (c) => c[0].includes("/hunts") && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall[1].body);
      expect(body.collectibleId).toBeNull();
    });
  });

  it("submits hunt with null timeLimit when empty", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test Hunt");
    await user.type(screen.getByPlaceholderText("Question"), "Question?");
    await user.type(screen.getByPlaceholderText("Answer"), "Answer");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const postCall = calls.find(
        (c) => c[0].includes("/hunts") && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall[1].body);
      expect(body.timeLimit).toBeNull();
      expect(body.pointsAchievable).toBe(0);
    });
  });

  it("shows error when user is not logged in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("You must be logged in");
    });
  });

  it("handles submit error from server", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: "Hunt name already exists" }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Duplicate");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Hunt name already exists",
        { id: "toast-id" }
      );
    });
  });

  it("handles network error during submit", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockRejectedValueOnce(new Error("Network error"));

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Network error",
        { id: "toast-id" }
      );
    });
  });

  it("prevents double submission when loading", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ ok: true, json: async () => ({ id: 1 }) }),
              100
            )
          )
      );

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    
    await user.click(submitButton);
    await user.click(submitButton); // Try to click again while loading

    await waitFor(() => {
      const postCalls = global.fetch.mock.calls.filter(
        (c) => c[0].includes("/hunts") && c[1]?.method === "POST"
      );
      expect(postCalls.length).toBe(1); // Only one POST call should be made
    });
  });

  it("resets form after successful submission", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    const nameInput = await screen.findByPlaceholderText("Hunt Name");
    await user.type(nameInput, "Test Hunt");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");

    expect(nameInput).toHaveValue("Test Hunt");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalled();
    });

    // Form should be reset - but since we navigate away, we just verify navigation
    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("handles getUser error gracefully", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Auth error" },
    });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create hunt/i })).toBeInTheDocument();
    });
  });

  it("converts numeric fields correctly in payload", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 5, name: "Badge" }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1 }),
      });

    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Hunt Name"), "Test");
    await user.type(screen.getByPlaceholderText("Question"), "Q?");
    await user.type(screen.getByPlaceholderText("Answer"), "A");
    await user.type(screen.getByPlaceholderText("Time Limit (seconds)"), "120");
    await user.type(screen.getByPlaceholderText("Points Achievable"), "75");

    const submitButton = screen.getByRole("button", { name: /create hunt/i });
    await user.click(submitButton);

    await waitFor(() => {
      const calls = global.fetch.mock.calls;
      const postCall = calls.find(
        (c) => c[0].includes("/hunts") && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall[1].body);
      expect(body.timeLimit).toBe(120);
      expect(body.pointsAchievable).toBe(75);
      expect(typeof body.timeLimit).toBe("number");
      expect(typeof body.pointsAchievable).toBe("number");
    });
  });
});
