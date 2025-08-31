/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React, { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ---------- Stub router so we don't load the real react-router-dom ---------- */
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
    const React = require("react");
    return {
        // Minimal Link stub that renders an anchor
        Link: ({ to, children, ...rest }) =>
            React.createElement("a", { href: to, ...rest }, children),

        // Make Navbar think we're on /dashboard so it marks that item "active"
        useLocation: () => ({ pathname: "/dashboard" }),

        // Handy if any component calls it
        useNavigate: () => mockNavigate,
    };
});

/* ---------- Stub CSS & assets imported by components ---------- */
jest.mock("../styles/button.css", () => ({}));
jest.mock("../styles/navbar.css", () => ({}));
jest.mock("../assets/logo.png", () => "logo.png");

/* ---------- Import components under test (after mocks) ---------- */
const IconButton = require("../../components/IconButton").default;
const InputField = require("../../components/InputField").default;
const PasswordInputField = require("../../components/PasswordInputField").default;
const NavButton = require("../../components/NavButton").default;
const Navbar = require("../../components/NavBar").default;

/* ========================= IconButton ========================= */

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

/* ========================= InputField ========================= */

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

/* ===================== PasswordInputField ===================== */

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

/* =========================== NavButton ======================== */

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

/* ============================ Navbar ========================== */

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
