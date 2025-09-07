/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";

/*
  Local router stub:
  - We keep this here because NavBar uses useLocation/useNavigate and Link.
  - The global setup already handles page modules and static assets,
    so we don't need to mock pages or CSS here.
*/
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    Link: ({ to, children, ...rest }) =>
      React.createElement("a", { href: to, ...rest }, children),
    useLocation: () => ({ pathname: "/dashboard" }),
    useNavigate: () => mockNavigate,
  };
});

// import after the router mock so hooks/useLocation behave as expected
import Navbar from "../../components/NavBar";

describe("Navbar", () => {
  afterEach(() => {
    // in case any test toggles globals like window.__IS_MODERATOR__
    delete window.__IS_MODERATOR__;
    jest.clearAllMocks();
  });

  it("renders all nav items with links", () => {
    render(<Navbar />);

    // drawer (5) + bottom (5) => 10 links
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(10);

    // ensure Home (dashboard) link target exists and points to /dashboard
    const homeLink = screen.getAllByRole("link", { name: /home/i })[0];
    expect(homeLink).toHaveAttribute("href", "/dashboard");
  });

  it('marks "/dashboard" as active (via useLocation stub)', () => {
    render(<Navbar />);

    // The label "Home" should be rendered in nav buttons; find its button container(s)
    const homeNodes = screen.getAllByText(/home/i);
    expect(homeNodes.length).toBeGreaterThan(0);

    const activeEls = homeNodes.map((node) => node.closest(".nav-button"));
    activeEls.forEach((el) => expect(el).toHaveClass("active"));
  });

  it("shows admin item when window.__IS_MODERATOR__ is true", () => {
    // example extra test: set the global that NavBar reads
    window.__IS_MODERATOR__ = true;
    render(<Navbar />);

    // when moderator, there should be an Admin link present
    const admin = screen.queryAllByRole("link", { name: /admin/i });
    expect(admin.length).toBeGreaterThanOrEqual(1);
  });
});

