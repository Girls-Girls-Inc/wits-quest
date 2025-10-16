/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { act } from "react-dom/test-utils";

/* Router stub */
const mockNavigate = jest.fn();
let mockPathname = "/dashboard";
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    Link: ({ to, children, ...rest }) =>
      React.createElement("a", { href: to, ...rest }, children),
    useLocation: () => ({ pathname: mockPathname }),
    useNavigate: () => mockNavigate,
  };
});

import Navbar from "../../components/NavBar";

describe("Navbar", () => {
  afterEach(() => {
    delete window.__IS_MODERATOR__;
    mockPathname = "/dashboard";
    jest.clearAllMocks();
  });

  it("renders all nav items with links", () => {
    render(<Navbar />);
    // drawer (5) + bottom (4) = 9
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(9);

    const homeLink = screen.getAllByRole("link", { name: /home/i })[0];
    expect(homeLink).toHaveAttribute("href", "/dashboard");
  });

  it('marks "/dashboard" as active via useLocation stub', () => {
    render(<Navbar />);
    const homeNodes = screen.getAllByText(/home/i);
    const activeEls = homeNodes.map((node) => node.closest(".nav-button"));
    activeEls.forEach((el) => expect(el).toHaveClass("active"));
  });

  it("does not mark unrelated routes as active", () => {
    render(<Navbar />);
    const questLink = screen.getAllByRole("link", { name: /quests/i })[0];
    expect(questLink.closest(".nav-button")).not.toHaveClass("active");
  });

  it("shows admin item when __IS_MODERATOR__ is true", () => {
    window.__IS_MODERATOR__ = true;
    render(<Navbar />);
    expect(screen.getAllByRole("link", { name: /admin/i }).length).toBeGreaterThan(0);
  });

  it("does not show admin item when __IS_MODERATOR__ is false", () => {
    window.__IS_MODERATOR__ = false;
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /admin/i })).toBeNull();
  });

  it("renders logo image and title", () => {
    render(<Navbar />);
    const logo = screen.getByAltText("");
    expect(logo).toHaveClass("logo-img");
    expect(screen.getByText(/Campus Quest/i)).toBeInTheDocument();
  });

  it("renders Board in mobile navbar instead of Leaderboard", () => {
    render(<Navbar />);
    expect(screen.getByRole("link", { name: /\bLeaderboard\b/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /\bBoard\b/i })).toBeInTheDocument();
  });

  it("hides leaderboard links on admin pages", () => {
    mockPathname = "/adminDashboard";
    render(<Navbar />);
    expect(screen.queryByRole("link", { name: /\bLeaderboard\b/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /\bBoard\b/i })).toBeNull();
  });


  it("responds to role:change event by re-rendering", () => {
    render(<Navbar />);
    act(() => {
      window.dispatchEvent(new Event("role:change"));
    });
    expect(screen.getByText(/Campus Quest/i)).toBeInTheDocument();
  });
});
