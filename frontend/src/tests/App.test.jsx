// frontend/src/tests/App.test.jsx
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mock supabaseClient ---
const mockSignOut = jest.fn();
jest.mock("../supabase/supabaseClient", () => ({
  __esModule: true,
  default: { auth: { signOut: mockSignOut } },
}));

// --- Mock RequireSession ---
jest.mock("../components/RequireSession", () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>,
}));

// --- Mock lazy-loaded pages ---
jest.mock("../pages/loginSignup", () => ({
  __esModule: true,
  default: () => <div>Login Page</div>,
}));
jest.mock("../pages/dashboard", () => ({
  __esModule: true,
  default: () => <div>Dashboard Page</div>,
}));

// Import AFTER mocks
import App from "../App";

describe("App routing", () => {
  it("renders login page on /login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    );
  });

  it("renders dashboard on /", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText("Dashboard Page")).toBeInTheDocument()
    );
  });
});
