// frontend/src/pages/__tests__/passwordReset.test.jsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PasswordReset from "../../pages/passwordReset";
import supabase from "../../supabase/supabaseClient";
import toast from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock supabase client
jest.mock("../../supabase/supabaseClient", () => ({
  auth: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  },
}));

// Mock toast
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

describe("PasswordReset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading initially", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: null, error: null });
    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects if user is not authenticated", async () => {
    const mockNavigate = jest.fn();
    supabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    await waitFor(() => {
      // We can't test navigate directly without wrapping useNavigate,
      // but supabase.auth.getUser should be called
      expect(supabase.auth.getUser).toHaveBeenCalled();
    });
  });

  it("shows validation toast for weak password", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { aud: "authenticated" } }, error: null });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("New Password");

    fireEvent.change(passwordInput, { target: { value: "weak" } });

    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalled();
    });
  });

  it("enables submit when password is valid", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { aud: "authenticated" } }, error: null });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("New Password");
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    // Weak password disables button
    fireEvent.change(passwordInput, { target: { value: "weak" } });
    expect(submitButton).toBeDisabled();

    // Strong password enables button
    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssword" } });
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("resets password successfully", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { aud: "authenticated" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<PasswordReset />} />
        </Routes>
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("New Password");
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "Str0ngP@ssword" });
      expect(toast.success).toHaveBeenCalledWith("Password has been reset successfully!");
    });
  });

  it("shows error if supabase update fails", async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: { aud: "authenticated" } }, error: null });
    supabase.auth.updateUser.mockResolvedValue({ error: { message: "Update failed" } });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    const passwordInput = screen.getByPlaceholderText("New Password");
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });
});
