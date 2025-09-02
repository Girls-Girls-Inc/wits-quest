/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React, { useState } from "react";
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
jest.mock("../../assets/logo.png", () => "logo.png");

/* import component under test (after mocks) */
const PasswordInputField = require("../../components/PasswordInputField").default;

describe("PasswordInputField", () => {
  function Controlled({ initial = "", passThrough = {} }) {
    const [pwd, setPwd] = useState(initial);
    return (
      <PasswordInputField
        id="password"
        placeholder="Password"
        value={pwd}
        onChange={(e) => setPwd(e.target.value)}
        required
        {...passThrough}
      />
    );
  }

  it("renders a password input", () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/^password$/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();
  });

  it("accepts text (controlled)", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/^password$/i);
    await userEvent.type(input, "Secret123!");
    expect(input).toHaveValue("Secret123!");
  });
});
