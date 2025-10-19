/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockGetUser = jest.fn(() =>
  Promise.resolve({ data: { user: { id: "user-123" } }, error: null })
);

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
  },
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(() => "toast-id"),
};

jest.mock("react-hot-toast", () => ({
  Toaster: () => <div data-testid="toast-mock" />,
  toast: mockToast,
}));

describe("AddHunt page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => [{ id: 1, name: "Golden Trophy" }],
      })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("loads collectibles and renders hunt creation form", async () => {
    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    expect(await screen.findByRole("heading", { name: /create hunt/i })).toBeVisible();
    expect(
      screen.getByPlaceholderText("Hunt Name")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Question")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Answer")
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/collectibles"),
        expect.objectContaining({ credentials: "include" })
      )
    );
    expect(mockGetUser).toHaveBeenCalled();
  });

  it("navigates back to admin dashboard when back button is clicked", async () => {
    const { default: AddHunt } = await import("../../pages/addHunt");
    render(<AddHunt />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /back to admin/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });
});
