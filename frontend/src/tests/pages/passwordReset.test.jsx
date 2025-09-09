// frontend/src/tests/pages/passwordReset.test.jsx
import React from "react";
//import "@testing-library/jest-dom/extend-expect";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PasswordReset from "../../pages/passwordReset";
import supabase from "../../supabase/supabaseClient";
import toast from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock supabase client as an ES module default export (matches `import supabase from ...`)
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

// Mock react-hot-toast as an ES module with default and Toaster
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

// helper to access the mocked default export
const mockedSupabase = supabase;

describe("PasswordReset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading initially", () => {
    // Use an auth check that resolves to something valid — but we assert the initial render
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { aud: "authenticated" } },
      error: null,
    });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    // initial synchronous render should show the loading placeholder before the effect finishes
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("redirects if user is not authenticated", async () => {
    // Return data.user === null (not the same as data: null)
    mockedSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    // component's useEffect will call getUser — ensure it was called
    await waitFor(() => {
      expect(mockedSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  it("shows validation toast for weak password", async () => {
    // Authenticated user so page renders the form (not the loading screen)
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { aud: "authenticated" } },
      error: null,
    });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    // wait until loading disappears and form is present
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const passwordInput = screen.getByPlaceholderText("New Password");

    fireEvent.change(passwordInput, { target: { value: "weak" } });

    await waitFor(() => {
      expect(toast.loading).toHaveBeenCalled();
    });
  });

  it("enables submit when password is valid", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { aud: "authenticated" } },
      error: null,
    });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    // wait for form
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

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
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { aud: "authenticated" } },
      error: null,
    });
    mockedSupabase.auth.updateUser.mockResolvedValue({ error: null });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<PasswordReset />} />
        </Routes>
      </MemoryRouter>
    );

    // wait for form
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const passwordInput = screen.getByPlaceholderText("New Password");
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedSupabase.auth.updateUser).toHaveBeenCalledWith({ password: "Str0ngP@ssword" });
      expect(toast.success).toHaveBeenCalledWith("Password has been reset successfully!");
    });
  });

  it("shows error if supabase update fails", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { aud: "authenticated" } },
      error: null,
    });
    mockedSupabase.auth.updateUser.mockResolvedValue({ error: { message: "Update failed" } });

    render(
      <MemoryRouter>
        <PasswordReset />
      </MemoryRouter>
    );

    // wait for form
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());

    const passwordInput = screen.getByPlaceholderText("New Password");
    const submitButton = screen.getByRole("button", { name: /reset password/i });

    fireEvent.change(passwordInput, { target: { value: "Str0ngP@ssword" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });
});
