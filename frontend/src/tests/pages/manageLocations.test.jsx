/** @jest-environment jsdom */

process.env.VITE_WEB_URL = process.env.VITE_WEB_URL || "http://localhost:3000";
const API_BASE = process.env.VITE_WEB_URL;

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ================= Polyfills ================= */

const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ================= Global mocks ================= */

global.fetch = jest.fn();
global.confirm = jest.fn();

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("react-hot-toast", () => {
  const mockToast = {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(() => "toast-id"),
    dismiss: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockToast,
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => <div data-testid="toaster" />,
  };
});

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("../../components/InputField", () => (props) => {
  const { id, name, placeholder, value, onChange, required, type = "text", readOnly } = props;
  return (
    <input
      id={id}
      data-testid={name || `input-${placeholder?.toLowerCase().replace(/\s+/g, "-")}`}
      name={name}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={onChange}
      required={required}
      type={type}
      readOnly={readOnly}
    />
  );
});

jest.mock("../../components/IconButton", () => (props) => (
  <button
    data-testid={`icon-btn-${(props.label || "button")
      .toLowerCase()
      .replace(/\s+/g, "-")}`}
    {...props}
  >
    {props.label || "Button"}
  </button>
));

jest.mock("../../components/LocationMapPicker", () => (props) => (
  <div
    data-testid="location-map-picker"
    onClick={() => props.onChange?.({ lat: -26.1905, lng: 28.0305 })}
  >
    Map Picker
  </div>
));

jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));

import supabase from "../../supabase/supabaseClient";
import ManageLocations from "../../pages/manageLocations";

const LOCATIONS = [
  {
    id: 1,
    name: "Great Hall",
    latitude: -26.190166,
    longitude: 28.030172,
    radius: 75,
  },
  {
    id: 2,
    name: "Library",
    latitude: -26.1895,
    longitude: 28.032,
    radius: 50,
  },
];

const setupSession = (token = "test-token") => {
  supabase.auth.getSession.mockResolvedValue({
    data: { session: token ? { access_token: token } : null },
  });
};

const mockFetchOnce = (response, { ok = true, status = 200 } = {}) => {
  global.fetch.mockResolvedValueOnce({
    ok,
    status,
    json: jest.fn().mockResolvedValue(response),
    text: jest.fn().mockResolvedValue(
      typeof response === "string" ? response : JSON.stringify(response)
    ),
  });
};

describe("ManageLocations page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSession();
  });

  it("loads locations on mount", async () => {
    mockFetchOnce(LOCATIONS);

    render(<ManageLocations />);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE}/locations`,
        expect.objectContaining({
          credentials: "include",
          headers: { Authorization: "Bearer test-token" },
        })
      )
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: /manage locations/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("heading", { level: 2, name: /great hall/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /library/i })
    ).toBeInTheDocument();

    const card = screen
      .getByRole("heading", { level: 2, name: /great hall/i })
      .closest(".quest-card");
    expect(within(card).getByText(/latitude/i)).toBeInTheDocument();
  });

  it("edits a location successfully", async () => {
    mockFetchOnce(LOCATIONS); // initial load
    mockFetchOnce({
      ...LOCATIONS[0],
      name: "Great Hall Updated",
      radius: 100,
    }); // PATCH response

    render(<ManageLocations />);

    const editBtn = (await screen.findAllByTestId("icon-btn-edit"))[0];
    await userEvent.click(editBtn);

    const nameInput = screen.getByPlaceholderText("Location Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Great Hall Updated");

    // Map click updates coordinates
    await userEvent.click(screen.getByTestId("location-map-picker"));

    const radiusInput = screen.getByPlaceholderText("Radius");
    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, "100");

    const saveBtn = screen.getByTestId("icon-btn-save-location");
    await userEvent.click(saveBtn);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${API_BASE}/locations/1`,
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify({
            name: "Great Hall Updated",
            latitude: -26.1905,
            longitude: 28.0305,
            radius: 100,
          }),
        })
      )
    );
  });

  it("deletes a location after confirmation", async () => {
    mockFetchOnce(LOCATIONS); // initial load
    mockFetchOnce({}, { ok: true, status: 204 }); // DELETE response
    global.confirm.mockReturnValue(true);

    render(<ManageLocations />);

    const deleteBtn = (await screen.findAllByTestId("icon-btn-delete"))[0];
    await userEvent.click(deleteBtn);

    await waitFor(() =>
      expect(global.fetch).toHaveBeenLastCalledWith(
        `${API_BASE}/locations/1`,
        expect.objectContaining({
          method: "DELETE",
          headers: { Authorization: "Bearer test-token" },
        })
      )
    );
  });

  it("shows error when token missing", async () => {
    setupSession(null);
    mockFetchOnce(LOCATIONS);

    render(<ManageLocations />);

    const editBtn = (await screen.findAllByTestId("icon-btn-edit"))[0];
    await userEvent.click(editBtn);

    const saveBtn = screen.getByTestId("icon-btn-save-location");
    await userEvent.click(saveBtn);

    const toast = (await import("react-hot-toast")).default;
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please sign in again."
      )
    );
  });
});
