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
jest.mock("../../assets/Logo.webp", () => "Logo.webp");

/* import component under test (after mocks) */
const PasswordInputField = require("../../components/PasswordInputField").default;

describe("PasswordInputField", () => {
  // Class wrapper avoids hooks in tests
  class Controlled extends React.Component {
    constructor(props) {
      super(props);
      this.state = { pwd: props.initial || "" };
    }

    render() {
      const passThrough = this.props.passThrough || {};
      return (
        <PasswordInputField
          id="password"
          placeholder="Password"
          value={this.state.pwd}
          onChange={(e) => this.setState({ pwd: e.target.value })}
          required
          {...passThrough}
        />
      );
    }
  }

  it("renders a password input", () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/^password$/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "password");
    expect(input).toBeRequired();
  });

  it("toggles password visibility when icon is clicked", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/^password$/i);

    // initially password
    expect(input).toHaveAttribute("type", "password");

    // click the eye icon (shows 'visibility')
    const toggle = screen.getByText("visibility");
    await userEvent.click(toggle);
    expect(input).toHaveAttribute("type", "text");

    // click to hide (icon text becomes 'visibility_off')
    const hideToggle = screen.getByText("visibility_off");
    await userEvent.click(hideToggle);
    expect(input).toHaveAttribute("type", "password");
  });

  it("accepts text (controlled)", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/^password$/i);

    await userEvent.type(input, "Secret123!");
    expect(input).toHaveValue("Secret123!");
  });
});
