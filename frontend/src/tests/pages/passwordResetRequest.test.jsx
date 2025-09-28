// frontend/src/tests/pages/passwordResetRequest.test.jsx
import "@testing-library/jest-dom"; // <-- ADD THIS
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// optional: keep test console logs tidy by silencing specific noisy console.error outputs
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // ignore the known network error log from component tests (so output is cleaner)
    if (typeof args[0] === "string" && args[0].includes("Reset password error:")) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

// ---- Mocks BEFORE importing the page component ----
jest.mock("../../components/InputField", () => (props) => {
  const React = require("react");
  return React.createElement("input", { ...props, "data-testid": props.id || "input" });
});
jest.mock("../../components/IconButton", () => (props) => {
  const React = require("react");
  return React.createElement("button", { ...props, type: props.type || "button" }, props.label || null);
});
jest.mock("../../supabase/supabaseClient", () => ({
  auth: { resetPasswordForEmail: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
  Toaster: () => {
    const React = require("react");
    return React.createElement("div", null);
  },
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// Now import the module under test (after mocks)
import PasswordResetRequest from "../../pages/passwordResetRequest";
import supabase from "../../supabase/supabaseClient";
import toast from "react-hot-toast";

describe("PasswordResetRequest", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders form correctly", () => {
    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );
    expect(screen.getByText("Reset Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email Address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it("shows error toast if email is empty", async () => {
    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Please enter your email address.");
    });
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("calls supabase and shows success toast on valid email", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("/reset") })
      );
      expect(toast.success).toHaveBeenCalledWith("Check your email for password reset instructions.");
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  it("shows error toast if supabase returns error", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "Failed" } });

    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("handles exception thrown by supabase", async () => {
    supabase.auth.resetPasswordForEmail.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Link/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to send reset email. Please try again.");
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("disables button while loading", async () => {
    let resolvePromise;
    supabase.auth.resetPasswordForEmail.mockReturnValue(new Promise((res) => (resolvePromise = res)));

    render(
      <MemoryRouter>
        <PasswordResetRequest />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Email Address"), {
      target: { value: "user@example.com" },
    });

    const button = screen.getByRole("button", { name: /Send Reset Link/i });
    fireEvent.click(button);

    // matcher now comes from jest-dom
    expect(button).toBeDisabled();

    // resolve the in-flight promise
    resolvePromise({ error: null });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});


