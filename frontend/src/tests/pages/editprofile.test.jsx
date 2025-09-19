/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- surface React errors during import/render
const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
afterAll(() => consoleError.mockRestore());

// ---- toast mock ----
jest.mock("react-hot-toast", () => {
  const mock = {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "tid-1"),
    dismiss: jest.fn(),
    __call: jest.fn(),
  };
  const callable = (...args) => mock.success(...args);
  Object.assign(callable, mock);
  return { __esModule: true, default: callable, toast: callable, Toaster: () => null };
});
import toast from "react-hot-toast";

// ---- component stubs ----
jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));
jest.mock("../../components/InputField", () => (props) => (
  <input data-testid={props.id || props.name} {...props} />
));
jest.mock("../../components/PasswordInputField", () => (props) => (
  <input data-testid={props.id} type="password" {...props} />
));

// ---- CSS ----
jest.mock("../../styles/profile.css", () => ({}));

// ---- supabase mock (MUST be before importing SUT) ----
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));
import supabase from "../../supabase/supabaseClient";

// ---- SUT ----
import Profile from "../../pages/editProfile";

const mockUser = ({
  id = "u-123",
  email = "user@test.com",
  created_at = "2025-01-01T12:00:00Z",
  displayName = "Alice",
  avatar_url = "https://avatar.local/a.png",
} = {}) => ({
  id,
  email,
  created_at,
  user_metadata: { displayName, avatar_url },
});

const setGetUserOnce = (user, error = null) =>
  supabase.auth.getUser.mockResolvedValueOnce({ data: { user }, error });

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Profile (editProfile)", () => {
  it("loads user and shows profile info", async () => {
    setGetUserOnce(mockUser());

    render(<Profile />);

    // sanity check: first paint should show Loading
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    const h2 = await screen.findByRole("heading", { level: 2, name: /alice/i });
    expect(h2).toBeInTheDocument();
    expect(screen.getByText("user@test.com")).toBeInTheDocument();
    expect(screen.getByText(/joined:/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /avatar/i })).toHaveAttribute(
      "src",
      "https://avatar.local/a.png"
    );
  });

  it("toggles to edit mode and renders form fields", async () => {
    setGetUserOnce(mockUser());

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
    expect(screen.getByTestId("displayName")).toBeInTheDocument();
    expect(screen.getByTestId("email")).toBeInTheDocument();
    expect(screen.getByTestId("password")).toBeInTheDocument();
    expect(screen.getByTestId("confirmPassword")).toBeInTheDocument();
  });

  it("shows toast when no changes to update", async () => {
    const user = mockUser();
    setGetUserOnce(user); // mount
    setGetUserOnce(user); // handleSave refetch

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("No changes to update");
  });

  it("blocks save when passwords do not match", async () => {
    setGetUserOnce(mockUser());

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByTestId("password"), "Passw0rd!");
    await userEvent.type(screen.getByTestId("confirmPassword"), "Different!");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates display name only and shows success toast", async () => {
    const user = mockUser({ displayName: "Alice", avatar_url: "https://avatar.local/a.png" });
    setGetUserOnce(user); // mount
    setGetUserOnce(user); // handleSave refetch
    supabase.auth.updateUser.mockResolvedValueOnce({ data: {}, error: null });

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const nameInput = screen.getByTestId("displayName");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Alice New");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: { displayName: "Alice New", avatar_url: "https://avatar.local/a.png" },
      });
    });
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });

  it("changing email triggers confirmation toast and updates visible email", async () => {
    const user = mockUser({ email: "user@test.com" });
    setGetUserOnce(user); // mount
    setGetUserOnce(user); // handleSave refetch
    supabase.auth.updateUser.mockResolvedValueOnce({
      data: { user: { new_email: "new@test.com" } },
      error: null,
    });

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const emailInput = screen.getByTestId("email");
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "new@test.com");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        email: "new@test.com",
        data: { displayName: "Alice", avatar_url: "https://avatar.local/a.png" },
      });
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Check new@test.com for a confirmation link to complete the change."
    );
    await waitFor(() => {
      expect(screen.getByText("new@test.com")).toBeInTheDocument();
    });
  });

  it("changing only password shows two success toasts and clears fields", async () => {
    const user = mockUser();
    setGetUserOnce(user); // mount
    setGetUserOnce(user); // handleSave refetch
    supabase.auth.updateUser.mockResolvedValueOnce({ data: {}, error: null });

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByTestId("password"), "Aa1!aaaa");
    await userEvent.type(screen.getByTestId("confirmPassword"), "Aa1!aaaa");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    expect(toast.success).toHaveBeenCalledWith("Password changed successfully!");

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByTestId("password")).toHaveValue("");
    expect(screen.getByTestId("confirmPassword")).toHaveValue("");
  });

  it("shows toast when initial getUser fails", async () => {
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "nope" },
    });

    render(<Profile />);

    // still should show Loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error fetching user");
    });
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it("shows toast when getUser fails during save", async () => {
    const user = mockUser();
    setGetUserOnce(user); // mount
    // save path getUser fails:
    supabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "bad" },
    });

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByTestId("displayName"), " X");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error fetching user data");
    });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows toast when updateUser returns an error", async () => {
    const user = mockUser();
    setGetUserOnce(user); // mount
    setGetUserOnce(user); // handleSave refetch
    supabase.auth.updateUser.mockResolvedValueOnce({
      data: null,
      error: { message: "db err" },
    });

    render(<Profile />);
    await screen.findByRole("heading", { level: 2, name: /alice/i });

    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.type(screen.getByTestId("displayName"), " X");
    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update profile: db err");
    });
  });
});
