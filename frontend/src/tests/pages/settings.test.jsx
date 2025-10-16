/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "path";

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

// Import after mock
const toast = require("react-hot-toast").toast;

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

const supabase = require("../../supabase/supabaseClient").default;

// CSS mocks
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/profile.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

/* ========================= Load component ========================= */
const settingsAbsPath = path.resolve(__dirname, "../../pages/settings.jsx");
jest.unmock(settingsAbsPath);
const Settings = require(settingsAbsPath).default;

/* ========================= Tests ========================= */

describe("Settings page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // window.open spy for the feedback button
    global.window.open = jest.fn();
  });

  describe("Rendering", () => {
    it("renders heading, profile section, and buttons", () => {
      render(<Settings />);

      expect(screen.getByRole("heading", { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByTestId("profile-stub")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /give feedback/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /help/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });

    it("does not show modals initially", () => {
      render(<Settings />);

      expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();
    });
  });

  describe("Feedback Button", () => {
    it("opens the feedback form in a new tab", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      expect(window.open).toHaveBeenCalledTimes(1);
      const [url, target] = window.open.mock.calls[0];
      expect(url).toContain("docs.google.com/forms");
      expect(target).toBe("_blank");
    });

    it("opens correct Google Form URL", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /give feedback/i }));

      const [url] = window.open.mock.calls[0];
      expect(url).toContain("1FAIpQLSdpNVwJkldfLiQ42pFO5Ic7PHw8KhOeu2THb0UgA64tP-1z4w");
    });
  });

  describe("Help Modal", () => {
    it("opens help modal when help button is clicked", async () => {
      render(<Settings />);

      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /help/i }));

      expect(screen.getByText(/how to complete a quest/i)).toBeInTheDocument();
    });

    it("closes help modal when X button is clicked", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      expect(screen.getByText(/how to complete a quest/i)).toBeInTheDocument();

      const closeButtons = screen.getAllByRole("button", { name: "✕" });
      await userEvent.click(closeButtons[0]);

      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();
    });

    it("displays all help steps", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /help/i }));

      expect(screen.getByText(/go to the/i)).toBeInTheDocument();
      expect(screen.getByText(/browse the list/i)).toBeInTheDocument();
      expect(screen.getByText(/add to my quests/i)).toBeInTheDocument();
      expect(screen.getByText(/open your/i)).toBeInTheDocument();
      expect(screen.getByText(/travel to the quest/i)).toBeInTheDocument();
      expect(screen.getByText(/check in/i)).toBeInTheDocument();
      expect(screen.getByText(/your points will be automatically added/i)).toBeInTheDocument();
    });

    it("navigates to quests page when View Quests button is clicked", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      await userEvent.click(screen.getByRole("button", { name: /view quests/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/displayQuests");
      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();
    });

    it("closes help modal before navigating to quests", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      expect(screen.getByText(/how to complete a quest/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /view quests/i }));

      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith("/displayQuests");
    });
  });

  describe("Logout Modal", () => {
    it("opens logout modal when logout button is clicked", async () => {
      render(<Settings />);

      expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));

      expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to log out/i)).toBeInTheDocument();
    });

    it("closes logout modal when X button is clicked", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();

      const closeButtons = screen.getAllByRole("button", { name: "✕" });
      await userEvent.click(closeButtons[0]);

      expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
    });

    it("shows Yes, Logout button in modal", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));

      expect(screen.getByRole("button", { name: /yes, logout/i })).toBeInTheDocument();
    });
  });

  describe("Logout Functionality", () => {
    it("logs out successfully", async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
        expect(toast.success).toHaveBeenCalledWith("Logged out!");
        expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
      });
    });

    it("closes logout modal after successful logout", async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

      await waitFor(() => {
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

    it("does not navigate on logout failure", async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: { message: "Network error" } });

      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("calls signOut with global scope", async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

      await waitFor(() => {
        expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
      });
    });

    it("navigates with replace option to prevent back navigation", async () => {
      supabase.auth.signOut.mockResolvedValueOnce({ error: null });

      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      await userEvent.click(screen.getByRole("button", { name: /yes, logout/i }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
      });
    });
  });

  describe("Modal Interactions", () => {
    it("can open help modal while logout modal is closed", async () => {
      render(<Settings />);

      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      expect(screen.getByText(/how to complete a quest/i)).toBeInTheDocument();
      expect(screen.queryByText(/confirm logout/i)).not.toBeInTheDocument();
    });

    it("shows only one modal at a time", async () => {
      render(<Settings />);

      // Open help modal
      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      expect(screen.getByText(/how to complete a quest/i)).toBeInTheDocument();

      // Close help modal
      const closeButtons = screen.getAllByRole("button", { name: "✕" });
      await userEvent.click(closeButtons[0]);

      // Open logout modal
      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      expect(screen.getByText(/confirm logout/i)).toBeInTheDocument();
      expect(screen.queryByText(/how to complete a quest/i)).not.toBeInTheDocument();
    });
  });

  describe("Component Integration", () => {
    it("renders Profile component", () => {
      render(<Settings />);

      expect(screen.getByTestId("profile-stub")).toBeInTheDocument();
    });

    it("maintains profile section while modals are open", async () => {
      render(<Settings />);

      expect(screen.getByTestId("profile-stub")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: /help/i }));
      expect(screen.getByTestId("profile-stub")).toBeInTheDocument();

      const closeButtons = screen.getAllByRole("button", { name: "✕" });
      await userEvent.click(closeButtons[0]);

      await userEvent.click(screen.getByRole("button", { name: /logout/i }));
      expect(screen.getByTestId("profile-stub")).toBeInTheDocument();
    });
  });
});
