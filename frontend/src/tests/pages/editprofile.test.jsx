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

// Supabase client
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockUpsert = jest.fn();

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn(),
      updateUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: mockSelect.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
      upsert: mockUpsert,
    })),
    storage: {
      from: jest.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
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

const mockProfileData = (profileUrl = null) => {
  mockSingle.mockResolvedValue({
    data: profileUrl ? { profileUrl } : null,
    error: profileUrl ? null : { message: "No profile found" },
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
    mockProfileData(null); // Default: no custom profile image
  });

  it("loads user profile and shows display info (then toggles edit)", async () => {
    mockGetUser();

    render(<Profile />);

    // Wait for profile view
    expect(
      await screen.findByRole("heading", { level: 2, name: /ada lovelace/i })
    ).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByText(/joined:/i)).toBeInTheDocument();

    // Verify avatar is displayed
    const avatar = screen.getAllByAltText("avatar")[0];
    expect(avatar).toHaveAttribute("src", "https://avatar.test/ada.png");

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

  it("uses custom profile image from userData when available", async () => {
    mockGetUser();
    mockProfileData("https://custom.avatar.com/user.png");

    render(<Profile />);

    await screen.findByRole("heading", { level: 2, name: /ada lovelace/i });

    const avatar = screen.getAllByAltText("avatar")[0];
    expect(avatar).toHaveAttribute("src", "https://custom.avatar.com/user.png");
  });

  it("falls back to generated avatar when no avatar_url in metadata", async () => {
    mockGetUser({
      user_metadata: {
        displayName: "Test User",
        avatar_url: null,
      },
    });

    render(<Profile />);

    await screen.findByRole("heading", { level: 2, name: /test user/i });

    const avatar = screen.getAllByAltText("avatar")[0];
    expect(avatar.getAttribute("src")).toContain("ui-avatars.com");
  });

  it("uses fallback display name from full_name or name", async () => {
    mockGetUser({
      user_metadata: {
        displayName: null,
        full_name: "Full Name User",
      },
    });

    render(<Profile />);

    expect(
      await screen.findByRole("heading", { level: 2, name: /full name user/i })
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
        data: { displayName: "Grace Hopper" },
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");

    // Form closes after save
    expect(screen.queryByTestId("displayName")).not.toBeInTheDocument();
  });

  it("saves email change and shows success", async () => {
    mockGetUser();
    mockUpdateUser();

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
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
  });

  it("saves password change and clears password fields", async () => {
    mockGetUser();
    mockUpdateUser();

    render(<Profile />);

    await openEditMode();

    await userEvent.type(screen.getByTestId("password"), "newsecret");
    await userEvent.type(screen.getByTestId("confirmPassword"), "newsecret");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "newsecret",
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");

    // Password fields should be cleared
    expect(screen.queryByTestId("password")).not.toBeInTheDocument();
    expect(screen.queryByTestId("confirmPassword")).not.toBeInTheDocument();
  });

  it("saves multiple changes at once", async () => {
    mockGetUser();
    mockUpdateUser();

    render(<Profile />);

    await openEditMode();

    const dn = screen.getByTestId("displayName");
    await userEvent.clear(dn);
    await userEvent.type(dn, "New Name");

    const email = screen.getByTestId("email");
    await userEvent.clear(email);
    await userEvent.type(email, "newemail@test.com");

    await userEvent.type(screen.getByTestId("password"), "pass123");
    await userEvent.type(screen.getByTestId("confirmPassword"), "pass123");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        email: "newemail@test.com",
        data: { displayName: "New Name" },
        password: "pass123",
      });
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
  });

  it("does not call updateUser when no changes are made", async () => {
    mockGetUser();

    render(<Profile />);

    await openEditMode();

    // Don't change anything
    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
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

    const dn = screen.getByTestId("displayName");
    await userEvent.clear(dn);
    await userEvent.type(dn, "Changed");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error fetching user data");
    });
  });

  it("shows update error message when updateUser fails", async () => {
    mockGetUser();
    mockUpdateUserError("update failed");

    render(<Profile />);

    await openEditMode();

    const dn = screen.getByTestId("displayName");
    await userEvent.clear(dn);
    await userEvent.type(dn, "New Name");

    await userEvent.click(screen.getByTestId("icon-btn-save-changes"));

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to update profile: update failed"
      );
    });
  });

  it("handles avatar upload successfully", async () => {
    mockGetUser();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.test/new-avatar.png" },
    });
    mockUpsert.mockResolvedValue({ error: null });

    render(<Profile />);

    await openEditMode();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/change profile image/i);

    await userEvent.upload(input, file);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          userId: "u_1",
          profileUrl: "https://storage.test/new-avatar.png",
        },
        { onConflict: "userId" }
      );
    });

    const toast = require("react-hot-toast").default;
    expect(toast.success).toHaveBeenCalledWith("Profile image updated!");
  });

  it("shows error when avatar upload fails", async () => {
    mockGetUser();
    mockUpload.mockResolvedValue({ error: { message: "Upload failed" } });

    render(<Profile />);

    await openEditMode();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/change profile image/i);

    await userEvent.upload(input, file);

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to upload image");
    });
  });

  it("shows error when getting public URL fails after upload", async () => {
    mockGetUser();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: null } });

    render(<Profile />);

    await openEditMode();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/change profile image/i);

    await userEvent.upload(input, file);

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to upload image");
    });
  });

  it("shows error when saving avatar URL to userData fails", async () => {
    mockGetUser();
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: "https://storage.test/avatar.png" },
    });
    mockUpsert.mockResolvedValue({ error: { message: "DB error" } });

    render(<Profile />);

    await openEditMode();

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText(/change profile image/i);

    await userEvent.upload(input, file);

    const toast = require("react-hot-toast").default;
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to upload image");
    });
  });

  it("does not upload avatar when no file is selected", async () => {
    mockGetUser();

    render(<Profile />);

    await openEditMode();

    const input = screen.getByLabelText(/change profile image/i);

    // Trigger change event with no files
    await userEvent.click(input);

    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("shows loading state initially", () => {
    mockGetUser();

    render(<Profile />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("handles unexpected errors during initial fetch", async () => {
    supabase.auth.getUser.mockRejectedValue(new Error("Network error"));

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<Profile />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Unexpected error fetching user:",
        expect.any(Error)
      );
    });

    const toast = require("react-hot-toast").default;
    expect(toast.error).toHaveBeenCalledWith("Failed to fetch user");

    consoleSpy.mockRestore();
  });

  it("warns when profile image query fails", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    mockGetUser();
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    render(<Profile />);

    await screen.findByRole("heading", { level: 2, name: /ada lovelace/i });

    expect(consoleSpy).toHaveBeenCalledWith(
      "No profile image found yet:",
      expect.any(Object)
    );

    consoleSpy.mockRestore();
  });
});
