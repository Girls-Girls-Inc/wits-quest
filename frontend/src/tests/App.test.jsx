// frontend/src/tests/App.test.jsx
import React from "react";
<<<<<<< Updated upstream
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

// (you can add more mocks for other pages if needed)

// Import AFTER mocks
import App from "../App";

describe("App routing", () => {
  it("renders login page on /login", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText("Login Page")).toBeInTheDocument());
  });

  it("renders dashboard on /", async () => {
=======
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

describe("App", () => {
  it("renders without crashing", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    // At least ensure the Toaster or a known route element renders
    expect(document.querySelector(".react-hot-toast")).toBeInTheDocument();
  });

  it("renders the login page by default at /", () => {
>>>>>>> Stashed changes
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
<<<<<<< Updated upstream
    await waitFor(() => expect(screen.getByText("Dashboard Page")).toBeInTheDocument());
=======
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the password reset page at /reset", () => {
    render(
      <MemoryRouter initialEntries={["/reset"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("renders the dashboard at /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
>>>>>>> Stashed changes
  });
});
