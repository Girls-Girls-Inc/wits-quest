/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
const NavButton = require("../../components/NavButton").default;

describe("NavButton", () => {
  it("renders a link when no onClick/type=submit", () => {
    render(<NavButton route="/dashboard" iconName="logo" label="Home" />);
    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders a button and calls onClick when provided", async () => {
    const onClick = jest.fn();
    render(<NavButton iconName="logo" label="Go" onClick={onClick} />);
    const btn = screen.getByRole("button", { name: /go/i });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("adds aria-disabled and tabIndex when disabled link", () => {
    render(<NavButton route="/profile" iconName="logo" label="Profile" disabled />);
    const link = screen.getByRole("link", { name: /profile/i });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
  });
});
