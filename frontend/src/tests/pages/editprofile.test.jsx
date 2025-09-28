/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import path from "path";

/* ================= Polyfills ================= */
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ================= Mocks (defined BEFORE requiring component) ================= */

// Toast mock: callable default (toast("...")) + methods.
const mockToast = jest.fn();
mockToast.success = jest.fn();
mockToast.error = jest.fn();
mockToast.loading = jest.fn(() => "toast-id");
mockToast.dismiss = jest.fn();

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: mockToast,
  toast: mockToast,
  success: mockToast.success,
  error: mockToast.error,
  loading: mockToast.loading,
  dismiss: mockToast.dismiss,
  Toaster: () => <div data-testid="toaster" />,
}));

// Supabase client (we’ll import it after setting this mock)
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

// Lightweight UI stubs
jest.mock("../../components/IconButton", () => (props) => (
  <button
    data-testid={`icon-btn-${(props.label || props.icon || "button")
      .toLowerCase()
      .replace(/\s+/g, "-")}`}
    {...props}
  >
    {props.label || "Button"}
  </button>
));

jest.mock("../../components/InputField", () => (props) => {
  const { id, name, placeholder, value, onChange, required, type = "text" } =
    props;
  return (
    <input
      data-testid={id || name}
      id={id}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      type={type}
    />
  );
});

jest.mock("../../components/PasswordInputField", () => (props) => {
  const { id, name, placeholder, value, onChange, required } = props;
  return (
    <input
      data-testid={id || name}
      id={id}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      type="password"
    />
  );
});

// CSS
jest.mock("../../styles/profile.css", () => ({}));

/* ========= Import the mocked supabase and then the component (AFTER mocks) ========= */
const supabase = require("../../supabase/supabaseClient").default;

// Resolve the real file and unmock it to load the actual component code
const profileAbsPath = path.resolve(__dirname, "../../pages/editProfile.jsx");
jest.unmock(profileAbsPath);
const Profile = require(profileAbsPath).default;

/* ================= Helpers ================= */

const baseUser = {
  id: "u_1",
  email: "user@example.com",
  created_at: "2024-01-15T10:00:00.000Z",
  user_metadata: {
    displayName: "Ada Lovelace",
    avatar_url: "https://avatar.test/ada.png",
  },
};

const mockGetUser = (overrides = {}) => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: { ...baseUser, ...overrides } },
    error: null,
  });
};

const mockGetUserError = (message = "boom") => {
  supabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: { message },
  });
};

const mockUpdateUser = (data = { user: baseUser }) => {
  supabase.auth.updateUser.mockResolvedValue({ data, error: null });
};

const mockUpdateUserError = (message = "update failed") => {
  supabase.auth.updateUser.mockResolvedValue({
    data: null,
    error: { message },
  });
};

// Wait until the profile view is visible, then click Edit and wait for the form
const openEditMode = async () => {
  await screen.findByRole("heading", { level: 2, name: /ada lovelace/i });
  await userEvent.click(await screen.findByTestId("icon-btn-edit"));
  await screen.findByTestId("displayName");
};

/* ================= Tests ================= */

describe("Profile page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads user profile and shows display info (then toggles edit)", async () => {
    mockGetUser();

    render(<Profile />);

    // Wait for profile view (don’t assert transient Loading)
    expect(
      await screen.findByRole("heading", { level: 2, name: /ada lovelace/i })
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText(/joined:/i)).toBeInTheDocument();

    // Toggle edit and see fields prefilled
    await userEvent.click(screen.getByTestId("icon-btn-edit"));
    expect(await screen.findByDisplayValue("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByDisplayValue("user@example.com")).toBeInTheDocument();

    // Close edit
    await userEvent.click(screen.getByTestId("icon-btn-close"));
    expect(
      await screen.findByRole("heading", { level: 2, name: /ada lovelace/i })
    ).toBeInTheDocument();
  });

  it("shows error toast when initial getUser fails", async () => {
    mockGetUserError("fetch failed");

    render(<Profile />);

    await waitFor(() => {
      expect(require("react-hot-toast").default.error).toHaveBeenCalledWith(
        "Error fetching user"
      );
    });
  });

  it("prevents save if passwords do not match", async () => {
    mockGetUser();

    render(<Profile />);

    await openEditMode();

    await userEvent.type(screen.getByTestId("password"), "secret1");
    await userEvent.type(screen.getByTestId("confirmPassword"), "secret2");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows 'No changes to update' when nothing changed", async () => {
    mockGetUser();

    render(<Profile />);

    await openEditMode();

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    expect(toast).toHaveBeenCalledWith("No changes to update");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("saves display name change and shows success", async () => {
    mockGetUser();
    mockUpdateUser();

    render(<Profile />);

    await openEditMode();

    const dn = screen.getByTestId("displayName");
    await userEvent.clear(dn);
    await userEvent.type(dn, "Grace Hopper");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          displayName: "Grace Hopper",
          avatar_url: baseUser.user_metadata.avatar_url,
        },
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");

    expect(
      await screen.findByRole("heading", { level: 2, name: /grace hopper/i })
    ).toBeInTheDocument();
  });

  it("saves email change and prompts to check new email, then reflects it", async () => {
    mockGetUser();
    mockUpdateUser({ user: { new_email: "new@example.com" } });

    render(<Profile />);

    await openEditMode();

    const email = screen.getByTestId("email");
    await userEvent.clear(email);
    await userEvent.type(email, "new@example.com");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        email: "new@example.com",
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringMatching(/check new@example\.com/i)
    );

    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
  });

  it("saves password change and clears password fields with success toasts", async () => {
    mockGetUser();
    mockUpdateUser();

    render(<Profile />);

    await openEditMode();

    await userEvent.type(screen.getByTestId("password"), "secret");
    await userEvent.type(screen.getByTestId("confirmPassword"), "secret");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "secret",
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Password changed successfully!");

    expect(screen.queryByTestId("password")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirmPassword")).not.toBeInTheDocument();
  });

  it("shows error toast when getUser inside save fails", async () => {
    // First call (initial load) OK, second call (inside handleSave) fails
    supabase.auth.getUser
      .mockResolvedValueOnce({ data: { user: baseUser }, error: null })
      .mockResolvedValueOnce({ data: { user: null }, error: { message: "x" } });

    render(<Profile />);

    await screen.findByRole("heading", { level: 2, name: /ada lovelace/i });

    await userEvent.click(screen.getByTestId("icon-btn-edit"));
    await screen.findByTestId("displayName");
    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error fetching user data");
    });
  });

  it("shows update error message when updateUser fails", async () => {
    mockGetUser();
    mockUpdateUserError("nope");

    render(<Profile />);

    await openEditMode();

    const dn = screen.getByTestId("displayName");
    await userEvent.clear(dn);
    await userEvent.type(dn, "New Name");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update profile: nope"
      );
    });
  });
});


