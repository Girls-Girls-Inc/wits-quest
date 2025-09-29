/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* router stub */
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
jest.mock("../../assets/Logo.webp", () => "Logo.webp");
jest.mock("../../assets/leaderboard.webp", () => "leaderboard.webp");
jest.mock("../../assets/home.webp", () => "home.webp");
jest.mock("../../assets/map.webp", () => "map.webp");
jest.mock("../../assets/profile.webp", () => "profile.webp");
jest.mock("../../assets/admin.webp", () => "admin.webp");

const NavButton = require("../../components/NavButton").default;

afterEach(() => cleanup());

describe("NavButton", () => {
  it("renders a link with correct icon", () => {
    render(<NavButton route="/dashboard" iconName="logo" label="UniqueHome" />);
    const link = screen.getByRole("link", { name: /uniquehome/i });
    expect(link).toHaveAttribute("href", "/dashboard");

    const img = within(link).getByRole("img", { name: /uniquehome/i });
    expect(img).toHaveAttribute("src", "Logo.webp");
  });

  it("renders a button and calls onClick", async () => {
    const onClick = jest.fn();
    render(<NavButton iconName="home" label="UniqueGo" onClick={onClick} />);
    const btn = screen.getByRole("button", { name: /uniquego/i });

    const img = within(btn).getByRole("img", { name: /uniquego/i });
    expect(img).toHaveAttribute("src", "home.webp");

    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a submit button with correct icon", () => {
    render(<NavButton iconName="profile" label="UniqueSubmit" type="submit" />);
    const btn = screen.getByRole("button", { name: /uniquesubmit/i });
    expect(btn).toHaveAttribute("type", "submit");

    const img = within(btn).getByRole("img", { name: /uniquesubmit/i });
    expect(img).toHaveAttribute("src", "profile.webp");
  });

  it("adds aria-disabled and tabIndex when disabled link", () => {
    render(<NavButton route="/profile" iconName="logo" label="UniqueProfile" disabled />);
    const link = screen.getByRole("link", { name: /uniqueprofile/i });
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("tabindex", "-1");
  });

  it("renders a disabled button correctly", () => {
    render(<NavButton iconName="map" label="UniqueMap" onClick={() => { }} disabled />);
    const btn = screen.getByRole("button", { name: /uniquemap/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle("pointer-events: none");

    const img = within(btn).getByRole("img", { name: /uniquemap/i });
    expect(img).toHaveAttribute("src", "map.webp");
  });

  it("renders with target when provided", () => {
    render(<NavButton route="/leaderboard" iconName="leaderboard" label="UniqueBoard" target="_blank" />);
    const link = screen.getByRole("link", { name: /uniqueboard/i });
    expect(link).toHaveAttribute("target", "_blank");

    const img = within(link).getByRole("img", { name: /uniqueboard/i });
    expect(img).toHaveAttribute("src", "leaderboard.webp");
  });

  it("uses custom alt when provided", () => {
    render(<NavButton route="/admin" iconName="admin" label="UniqueSecret" alt="CustomAlt" />);
    const img = screen.getByAltText("CustomAlt");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "admin.webp");
  });

  it("falls back to label as alt when no alt provided", () => {
    render(<NavButton route="/admin" iconName="admin" label="UniqueAdmin" />);
    const img = screen.getByAltText("UniqueAdmin");
    expect(img).toBeInTheDocument();
  });

  it("prevents navigation when disabled link is clicked", () => {
    render(<NavButton route="/blocked" iconName="logo" label="UniqueBlocked" disabled />);
    const link = screen.getByRole("link", { name: /uniqueblocked/i });
    const spy = jest.spyOn(Event.prototype, "preventDefault");
    fireEvent.click(link);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
