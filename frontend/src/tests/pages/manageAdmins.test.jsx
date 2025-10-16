/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockGetSession = jest.fn(() =>
  Promise.resolve({ data: { session: { access_token: "admin-token" } } })
);

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
    },
  },
}));

const mockToast = {
  loading: jest.fn(() => "toast-id"),
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toast-mock" />,
  toast: mockToast,
}));

const usersPayload = [
  { userId: 1, email: "admin@wits.com", isModerator: true },
  { userId: 2, email: "user@wits.com", isModerator: false },
];

describe("ManageAdmins page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url, options) => {
      if (!options || options.method === undefined) {
        return Promise.resolve({
          ok: true,
          json: async () => usersPayload,
        });
      }
      if (options.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ userId: 1, isModerator: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("lists users and toggles moderator status", async () => {
    const { default: ManageAdmins } = await import("../../pages/manageAdmins");
    render(<ManageAdmins />);

    expect(await screen.findByText("admin@wits.com")).toBeInTheDocument();
    expect(await screen.findByText("user@wits.com")).toBeInTheDocument();

    const toggleButton = await screen.findByRole("button", {
      name: /remove admin/i,
    });

    await userEvent.click(toggleButton);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/users/1"),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            Authorization: "Bearer admin-token",
          }),
        })
      )
    );
    expect(mockToast.success).toHaveBeenCalledWith("User updated");
  });

  it("navigates back to the admin page", async () => {
    const { default: ManageAdmins } = await import("../../pages/manageAdmins");
    render(<ManageAdmins />);

    expect(await screen.findByText("admin@wits.com")).toBeInTheDocument();

    const backButton = screen.getByRole("button", { name: /back to admin/i });
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/admin");
  });
});
