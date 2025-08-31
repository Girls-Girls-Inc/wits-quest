/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React from "react";
import { render, screen } from "@testing-library/react";

/* router stub (same as original) */
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

/* stub CSS & assets */
jest.mock("../styles/button.css", () => ({}));
jest.mock("../styles/navbar.css", () => ({}));
jest.mock("../assets/logo.png", () => "logo.png");

/* import component under test (after mocks) */
const Navbar = require("../../components/NavBar").default;

describe("Navbar", () => {
  it("renders all nav items with links", () => {
    render(<Navbar />);
    // You defined 5 nav items (drawer) + 5 (bottom)
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(10);
    expect(screen.getAllByRole("link", { name: /home/i })[0]).toHaveAttribute("href", "/dashboard");
  });

  it('marks "/dashboard" as active (via useLocation stub)', () => {
    render(<Navbar />);
    const activeEls = screen.getAllByText(/home/i).map((node) => node.closest(".nav-button"));
    activeEls.forEach((el) => expect(el).toHaveClass("active"));
  });
});
