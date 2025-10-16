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
  Promise.resolve({ data: { session: { access_token: "token-xyz" } } })
);
const mockGetUser = jest.fn(() =>
  Promise.resolve({ data: { user: { id: "user-1" } }, error: null })
);

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
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

jest.mock("../../components/LocationMapPicker", () => ({
  __esModule: true,
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange({ lat: -26.2041, lng: 28.0473 })}>
      Set Coordinates
    </button>
  ),
}));

describe("AddLocation page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url, options) =>
      Promise.resolve({
        ok: true,
        json: async () => ({ location: { id: 10 } }),
      })
    );
  });

  afterEach(() => {
    delete global.fetch;
  });

  it("submits a location after selecting coordinates", async () => {
    const { default: AddLocation } = await import("../../pages/addLocation");
    render(<AddLocation />);

    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /set coordinates/i }));

    await user.type(
      await screen.findByPlaceholderText("Location Name"),
      "Central Park"
    );
    await user.clear(await screen.findByPlaceholderText("Radius"));
    await user.type(await screen.findByPlaceholderText("Radius"), "150");

    await user.click(
      await screen.findByRole("button", { name: /create location/i })
    );

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/locations"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer token-xyz",
          }),
        })
      )
    );

    const [, options] = global.fetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.latitude).toBeCloseTo(-26.2041);
    expect(payload.longitude).toBeCloseTo(28.0473);
    expect(payload.radius).toBe(150);

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard")
    );
    expect(mockToast.success).toHaveBeenCalledWith("Location created successfully!", {
      id: "toast-id",
    });
  });
});
