import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Adjust this import to where your Settings file actually lives:
import Settings from "../../pages/Settings";

// --- Mocks --- //
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock supabase auth (no TS types!)
const signOutMock = jest.fn();
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      signOut: (...args) => signOutMock(...args),
    },
  },
}));

// Mock IconButton to be a simple button
jest.mock("../../components/IconButton", () => ({
  __esModule: true,
  default: ({ label, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {label}
    </button>
  ),
}));

// If you want to stub Profile, mock by the *resolved* path:
jest.mock("../../pages/editProfile", () => ({
  __esModule: true,
  default: () => <div data-testid="profile-placeholder">ProfileComponent</div>,
}));

// Mock toast
const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toaster" />,
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
  },
}));

// Spy on window.open
const openSpy = jest.spyOn(window, "open").mockImplementation(() => null);

describe("Settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders heading and Profile component", () => {
    render(<Settings />);
    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByTestId("profile-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("toaster")).toBeInTheDocument();
  });

  it("opens Google Form in a new tab when 'Give Feedback' is clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /give feedback/i }));
    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("https://docs.google.com/forms/");
    expect(openSpy.mock.calls[0][1]).toBe("_blank");
  });

  it("shows the logout confirmation modal when 'Logout' is clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(screen.getByRole("heading", { name: /confirm logout/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to log out/i)).toBeInTheDocument();
  });

  it("closes the logout modal when the close (✕) button is clicked", () => {
    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    fireEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByRole("heading", { name: /confirm logout/i })).not.toBeInTheDocument();
  });

  it("logs out successfully", async () => {
    signOutMock.mockResolvedValueOnce({ error: null });

    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalledWith({ scope: "global" }));
    expect(toastSuccess).toHaveBeenCalledWith("Logged out!");
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: /confirm logout/i })).not.toBeInTheDocument()
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
  });

  it("handles logout error", async () => {
    signOutMock.mockResolvedValueOnce({ error: { message: "boom" } });

    render(<Settings />);
    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    fireEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(toastError).toHaveBeenCalledWith("Failed to log out. Please try again.");
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /confirm logout/i })).toBeInTheDocument();
  });
});

