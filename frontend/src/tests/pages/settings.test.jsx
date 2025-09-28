/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks (define BEFORE requiring component) ========================= */

// react-hot-toast
jest.mock("react-hot-toast", () => {
  const success = jest.fn();
  const error = jest.fn();
  const loading = jest.fn();
  const dismiss = jest.fn();
  return {
    __esModule: true,
    Toaster: () => null,
    toast: { success, error, loading, dismiss },
    default: { success, error, loading, dismiss },
  };
});
import { toast } from "react-hot-toast";

// react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => React.createElement("a", { href: to }, children),
  };
});

// IconButton — render simple native button
jest.mock("../../components/IconButton", () => {
  const React = require("react");
  return ({ label, onClick, type = "button" }) =>
    React.createElement("button", { onClick, type }, label);
});

// editProfile stub
jest.mock("../../pages/editProfile", () => {
  const React = require("react");
  return () => React.createElement("div", { "data-testid": "profile-stub" }, "ProfileStub");
});

// supabase
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: { auth: { signOut: jest.fn() } },
}));
import supabase from "../../supabase/supabaseClient";

/* ========================= Require component AFTER mocks ========================= */
let Settings;
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules(); // ensure a clean import each test
  // window.open spy for the feedback button
  Object.defineProperty(window, "open", { writable: true, value: jest.fn() });

  // Re-require after reset so it picks up mocks
  Settings = require("../../pages/Settings").default; // <-- note the capital S
});

/* ========================= Tests ========================= */

describe("Settings page", () => {
  it("renders heading, profile section, and buttons", () => {
    render(<Settings />);

    expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByTestId("profile-stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /give feedback/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
  });

  it("opens the feedback form in a new tab", async () => {
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /give feedback/i }));
    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target] = window.open.mock.calls[0];
    expect(url).toContain("docs.google.com/forms");
    expect(target).toBe("_blank");
  });

  it("opens and closes the logout modal", async () => {
    render(<Settings />);
    expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
  });

  it("logs out successfully", async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: null });
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(toast.success).toHaveBeenCalledWith("Logged out!");
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
      expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
    });
  });

  it("shows error toast and keeps modal open if signOut fails", async () => {
    supabase.auth.signOut.mockResolvedValueOnce({ error: new Error("boom") });
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /logout/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
      expect(toast.error).toHaveBeenCalledWith("Failed to log out. Please try again.");
    });

    expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});







