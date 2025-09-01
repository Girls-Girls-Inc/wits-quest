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
jest.mock("../styles/button.css", () => ({}));
jest.mock("../styles/navbar.css", () => ({}));
jest.mock("../assets/logo.png", () => "logo.png");

/* import component under test (after mocks) */
const InputField = require("../../components/InputField").default;

describe("InputField", () => {
  function Controlled({ initial = "", passThrough = {} }) {
    const [val, setVal] = useState(initial);
    return (
      <InputField
        id="email"
        name="email"
        placeholder="Email Address"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        required
        {...passThrough}
      />
    );
  }

  it("renders with placeholder, id, name, required", () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/email address/i);
    expect(input).toBeInTheDocument();
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("id", "email");
    expect(input).toHaveAttribute("name", "email");
  });

  it("updates value on typing (controlled)", async () => {
    render(<Controlled />);
    const input = screen.getByPlaceholderText(/email address/i);
    await userEvent.type(input, "user@test.com");
    expect(input).toHaveValue("user@test.com");
  });
});
