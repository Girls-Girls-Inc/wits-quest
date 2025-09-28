/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

// stub CSS
jest.mock("../../styles/button.css", () => ({}));

const IconButton = require("../../components/IconButton").default;

describe("IconButton", () => {
  it("renders a Link when no onClick", () => {
    render(<IconButton label="Go Home" route="/home" />);
    const link = screen.getByRole("link", { name: /go home/i });
    expect(link).toHaveAttribute("href", "/home");
    expect(link).toHaveClass("icon-button");
  });

  it("renders a button with type submit and triggers onClick", async () => {
    const onClick = jest.fn();
    render(<IconButton label="Submit" type="submit" onClick={onClick} />);
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn).toHaveAttribute("type", "submit");
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders icon when provided", () => {
    render(<IconButton label="With Icon" icon="star" />);
    expect(screen.getByText("star")).toBeInTheDocument();
    expect(screen.getByText(/with icon/i)).toBeInTheDocument();
  });

  it("renders Link with target when provided", () => {
    render(<IconButton label="New Tab" route="/about" target="_blank" />);
    const link = screen.getByRole("link", { name: /new tab/i });
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders disabled button correctly", () => {
    render(<IconButton label="Disabled Btn" onClick={() => { }} disabled />);
    const btn = screen.getByRole("button", { name: /disabled btn/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle("pointer-events: none");
  });

  it("renders disabled Link and prevents navigation", () => {
    render(<IconButton label="Disabled Link" route="/blocked" disabled />);
    const link = screen.getByRole("link", { name: /disabled link/i });

    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
    expect(link).toHaveStyle("pointer-events: none");

    const spy = jest.spyOn(Event.prototype, "preventDefault");
    fireEvent.click(link);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

});
