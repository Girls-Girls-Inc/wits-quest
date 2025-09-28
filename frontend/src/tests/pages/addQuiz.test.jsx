/** @jest-environment jsdom */

const API_BASE = process.env.VITE_WEB_URL || "http://localhost:3000";

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
    toast: mockToast,
    default: mockToast,
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => <div data-testid="toaster" />,
  };
});

// Supabase auth
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// UI components
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
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

import supabase from "../../supabase/supabaseClient";
import AddQuiz from "../../pages/addQuiz";

/* ================= Helpers ================= */

const mockFetch = (
  response,
  status = 200,
  headers = { "content-type": "application/json" }
) => {
  global.fetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: jest
      .fn()
      .mockResolvedValue(
        typeof response === "string" ? JSON.parse(response) : response
      ),
    text: jest
      .fn()
      .mockResolvedValue(
        typeof response === "string" ? response : JSON.stringify(response)
      ),
    headers: { get: (k) => headers[k?.toLowerCase()] ?? headers[k] ?? null },
  });
};

const mockFetchError = (status = 400, body = { message: "Bad request" }) => {
  const asText = typeof body === "string" ? body : JSON.stringify(body);
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: jest
      .fn()
      .mockResolvedValue(
        typeof body === "string" ? { message: body } : body
      ),
    text: jest.fn().mockResolvedValue(asText),
    headers: { get: () => "application/json" },
  });
};

/* ================= Tests ================= */

describe("AddQuiz page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
    mockNavigate.mockReset();
    // Default: authenticated
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-123" } },
    });
  });

  it("renders initial form (Text type) and basic controls", () => {
    render(<AddQuiz />);
    expect(
      screen.getByRole("heading", { level: 1, name: /create quiz/i })
    ).toBeInTheDocument();

    // Text mode has plain correct answer input
    expect(screen.getByPlaceholderText(/question text/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/correct answer/i)).toBeInTheDocument();

    // Question type select default is 'text'
    const qType = screen.getByRole("combobox", { name: /question type/i });
    expect(qType).toHaveValue("text");
  });

  it("navigates Back to Admin", async () => {
    render(<AddQuiz />);
    await userEvent.click(screen.getByTestId("icon-btn-back-to-admin"));
    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("switches to MCQ → ensures at least two options shown, can add/remove", async () => {
    render(<AddQuiz />);

    // Switch to MCQ
    const typeSel = screen.getByRole("combobox", { name: /question type/i });
    await userEvent.selectOptions(typeSel, "mcq");

    // Two option inputs exist
    expect(screen.getByPlaceholderText(/option 1/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/option 2/i)).toBeInTheDocument();

    // Add an option
    await userEvent.click(screen.getByTestId("icon-btn-add-option"));
    expect(screen.getByPlaceholderText(/option 3/i)).toBeInTheDocument();

    // Delete (only when > 2)
    const deletes = screen.getAllByText("delete");
    expect(deletes.length).toBeGreaterThan(0);
    await userEvent.click(deletes[0]);

    // After one delete, still at least 2 remain
    expect(screen.getByPlaceholderText(/option 1/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/option 2/i)).toBeInTheDocument();
  });

  it("MCQ: available answers reflect unique, trimmed options and clearing invalidates selection", async () => {
    render(<AddQuiz />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /question type/i }),
      "mcq"
    );

    const opt1 = screen.getByPlaceholderText(/option 1/i);
    const opt2 = screen.getByPlaceholderText(/option 2/i);
    await userEvent.clear(opt1);
    await userEvent.type(opt1, " Red ");
    await userEvent.clear(opt2);
    await userEvent.type(opt2, "Blue");

    // Choose "Red" as correct
    const ansSel = screen.getByRole("combobox", { name: /correct answer/i });
    await userEvent.selectOptions(ansSel, "Red");
    expect(ansSel).toHaveValue("Red");

    // Change option to break the answer selection; answer should reset to ""
    await userEvent.clear(opt1);
    await userEvent.type(opt1, "Green");

    // The component syncs and clears selection
    expect(screen.getByRole("combobox", { name: /correct answer/i })).toHaveValue("");
  });

  it("validation: question text required", async () => {
    const toast = (await import("react-hot-toast")).default;
    render(<AddQuiz />);

    // Leave question empty
    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    expect(toast.error).toHaveBeenCalledWith("Question text is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("validation: correct answer required (text type)", async () => {
    const toast = (await import("react-hot-toast")).default;
    render(<AddQuiz />);

    await userEvent.type(
      screen.getByPlaceholderText(/question text/i),
      "What is 2+2?"
    );
    // leave correct answer blank
    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    expect(toast.error).toHaveBeenCalledWith("Correct answer is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("validation: MCQ needs >= 2 options and answer must match one", async () => {
    const toast = (await import("react-hot-toast")).default;
    render(<AddQuiz />);

    await userEvent.type(
      screen.getByPlaceholderText(/question text/i),
      "Pick a primary color"
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /question type/i }),
      "mcq"
    );

    // Two blank options → not valid
    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));
    expect(toast.error).toHaveBeenCalledWith("Provide at least two options");

    // Fill both, but leave correct empty
    const opt1 = screen.getByPlaceholderText(/option 1/i);
    const opt2 = screen.getByPlaceholderText(/option 2/i);
    await userEvent.type(opt1, "Red");
    await userEvent.type(opt2, "Blue");

    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));
    expect(toast.error).toHaveBeenCalledWith("Correct answer is required");

    // Select valid answer then change options to invalidate
    const ansSel = screen.getByRole("combobox", { name: /correct answer/i });
    await userEvent.selectOptions(ansSel, "Red");
    expect(ansSel).toHaveValue("Red");

    // Change option 1 so 'Red' disappears
    await userEvent.clear(opt1);
    await userEvent.type(opt1, "Green");

    // Submit: selection should have been cleared by sync → error again
    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));
    expect(toast.error).toHaveBeenCalledWith("Correct answer is required");
  });

  it("submits Text quiz successfully with token", async () => {
    render(<AddQuiz />);

    await userEvent.type(
      screen.getByPlaceholderText(/question text/i),
      "What is 2+2?"
    );
    await userEvent.type(
      screen.getByPlaceholderText(/correct answer/i),
      "4"
    );

    mockFetch({ id: 10, questionText: "What is 2+2?" }, 200);

    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/quiz`,
        expect.objectContaining({
          method: "POST",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer tok-123",
          }),
          body: JSON.stringify({
            questionText: "What is 2+2?",
            questionType: "text",
            correctAnswer: "4",
          }),
        })
      );
    });

    const toast = (await import("react-hot-toast")).default;
    expect(toast.success).toHaveBeenCalledWith("Quiz created successfully");
    // Form reset
    expect(screen.getByPlaceholderText(/question text/i)).toHaveValue("");
  });

  it("submits MCQ quiz successfully with options payload", async () => {
    render(<AddQuiz />);

    await userEvent.type(
      screen.getByPlaceholderText(/question text/i),
      "Pick red"
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /question type/i }),
      "mcq"
    );
    await userEvent.type(screen.getByPlaceholderText(/option 1/i), "Red");
    await userEvent.type(screen.getByPlaceholderText(/option 2/i), "Blue");

    const ansSel = screen.getByRole("combobox", { name: /correct answer/i });
    await userEvent.selectOptions(ansSel, "Red");

    mockFetch({ id: 11, questionText: "Pick red" }, 200);

    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/quiz`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            questionText: "Pick red",
            questionType: "mcq",
            correctAnswer: "Red",
            options: ["Red", "Blue"],
          }),
        })
      );
    });
  });

  it("shows session expired and aborts when no token", async () => {
    const toast = (await import("react-hot-toast")).default;
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
    });

    render(<AddQuiz />);

    await userEvent.type(screen.getByPlaceholderText(/question text/i), "Q?");
    await userEvent.type(screen.getByPlaceholderText(/correct answer/i), "A");

    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    expect(toast.error).toHaveBeenCalledWith(
      "Session expired. Please sign in again."
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles server error on submit", async () => {
    const toast = (await import("react-hot-toast")).default;

    render(<AddQuiz />);

    await userEvent.type(screen.getByPlaceholderText(/question text/i), "Q?");
    await userEvent.type(screen.getByPlaceholderText(/correct answer/i), "A");

    mockFetchError(400, { message: "Failed to create quiz" });

    await userEvent.click(screen.getByTestId("icon-btn-create-quiz"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create quiz");
    });
  });

  it("Reset button clears the form and returns to Text defaults", async () => {
    render(<AddQuiz />);

    // switch to MCQ and fill
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /question type/i }),
      "mcq"
    );
    await userEvent.type(screen.getByPlaceholderText(/option 1/i), "A");
    await userEvent.type(screen.getByPlaceholderText(/option 2/i), "B");

    await userEvent.click(screen.getByTestId("icon-btn-reset"));

    // Back to defaults
    expect(
      screen.getByRole("combobox", { name: /question type/i })
    ).toHaveValue("text");
    expect(screen.getByPlaceholderText(/question text/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/correct answer/i)).toHaveValue("");
  });
});