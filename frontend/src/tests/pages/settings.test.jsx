import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfill (keeps router/libs happy)
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();

jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => React.createElement("a", { href: to }, children),
  };
});

jest.mock("react-hot-toast", () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "tid-1"),
    dismiss: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockToast,
    toast: mockToast,
    Toaster: () => null,
  };
});

jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));
jest.mock("../../pages/editProfile", () => () => <div data-testid="profile-stub">Profile Component</div>);

jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      signOut: mockSignOut,
    },
  },
}));

import Settings from "../../pages/settings";
import toast from "react-hot-toast";

/* ========================= Helpers ========================= */

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockReset();
  mockSignOut.mockReset();
  mockSignOut.mockResolvedValue({ error: null });
  window.open = jest.fn();
});

/* ========================= Tests ========================= */

describe("Settings page", () => {
  it("renders heading, profile and action buttons", () => {
    render(<Settings />);

    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByTestId("profile-stub")).toBeInTheDocument();

    // Two primary buttons
    expect(screen.getByRole("button", { name: /give feedback/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("opens the feedback form in a new tab when clicking 'Give Feedback'", async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: /give feedback/i }));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining("https://docs.google.com/forms/"),
      "_blank"
    );

    expect(toast.success).not.toHaveBeenCalledWith("Loading your submitted feedback...");
  });

  it("canceling logout hides confirm/cancel actions", async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm logout/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirm logout/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  it("confirming logout revokes the session, shows success toast, and navigates to login", async () => {
    render(<Settings />);

    await userEvent.click(screen.getByRole("button", { name: /logout/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /confirm logout/i })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /confirm logout/i }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "global" });
      expect(toast.success).toHaveBeenCalledWith("Logged out!");
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /confirm logout/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    });
  });
});
