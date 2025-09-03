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
jest.mock("../../styles/button.css", () => ({}));
jest.mock("../../styles/navbar.css", () => ({}));
// jest.mock("../../assets/logo.png", () => "logo.png");

/* import component under test (after mocks) */
const IconButton = require("../../components/IconButton").default;

describe("IconButton", () => {
  it("renders an anchor-like element with the given label when no onClick", () => {
    render(<IconButton label="Do Thing" />);
    const anchor = screen.getByText(/do thing/i).closest("a");
    expect(anchor).toBeInTheDocument();
    expect(anchor).toHaveClass("icon-button");
  });

  it("renders a button and forwards props when onClick is provided", async () => {
    const onClick = jest.fn();
    render(<IconButton label="Submit" type="submit" className="my-btn" onClick={onClick} />);
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toHaveClass("my-btn");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick when clicked", async () => {
    const onClick = jest.fn();
    render(<IconButton label="Click" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: /click/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
