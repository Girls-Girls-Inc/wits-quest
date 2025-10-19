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
  Promise.resolve({ data: { session: { access_token: "token-123" } } })
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

const originalEnv = { ...process.env };

describe("AddQuest page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VITE_WEB_URL = "http://localhost:3000";

    global.fetch = jest.fn((url, options) => {
      if (options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ quest: { id: 1 } }),
          text: async () => "",
        });
      }
      return Promise.resolve({
        ok: true,
        text: async () => "[]",
        json: async () => [],
      });
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    delete global.fetch;
  });

  it("submits quest details and routes back to admin dashboard", async () => {
    const { default: AddQuest } = await import("../../pages/addQuest");

    render(<AddQuest />);

    const user = userEvent.setup();

    await user.type(
      await screen.findByPlaceholderText("Quest Name"),
      "Test Quest"
    );
    await user.type(
      await screen.findByPlaceholderText("Quest Description"),
      "Quest description"
    );
    await user.type(
      await screen.findByPlaceholderText("Points Achievable"),
      "50"
    );

    await user.click(await screen.findByRole("button", { name: /create quest/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/quests"),
        expect.objectContaining({ method: "POST" })
      )
    );

    const postCall = global.fetch.mock.calls.find(
      ([, options]) => options?.method === "POST"
    );
    expect(postCall).toBeDefined();
    expect(postCall[1].headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer token-123",
    });

    const body = JSON.parse(postCall[1].body);
    expect(body.name).toBe("Test Quest");
    expect(body.pointsAchievable).toBe(50);
    expect(body.createdBy).toBe("user-1");

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard")
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      "Quest created successfully!",
      { id: "toast-id" }
    );
  });
});
