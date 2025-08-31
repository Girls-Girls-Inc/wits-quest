// frontend/src/pages/__tests__/passwordResetRequest.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PasswordResetRequest from "../../pages/passwordResetRequest";
import supabase from "../../supabase/supabaseClient";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";

// Mock supabase client
jest.mock("../../supabase/supabaseClient", () => ({
  auth: {
    resetPasswordForEmail: jest.fn(),
  },
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  Toaster: () => <div />,
}));

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("PasswordResetRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        expect.objectContaining({
          redirectTo: expect.stringContaining("/reset"),
        })
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Check your email for password reset instructions."
      );
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
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to send reset email. Please try again."
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("disables button while loading", async () => {
    let resolvePromise;
    supabase.auth.resetPasswordForEmail.mockReturnValue(
      new Promise((res) => (resolvePromise = res))
    );

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

    expect(button).toBeDisabled();
    resolvePromise({ error: null });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
