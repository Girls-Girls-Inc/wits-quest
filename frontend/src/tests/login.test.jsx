/** @jest-environment jsdom */

const WEB_URL = process.env.VITE_WEB_URL; // from your .env/.env.test

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfill for libs that expect them (and to avoid router/TextEncoder issues)
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

// Pure stub router (no requireActual)
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
    const React = require("react");
    return {
        useNavigate: () => mockNavigate,
        Link: ({ to, children }) => React.createElement("a", { href: to }, children),
    };
});

// Toasts – return an id string for loading so your effects (which store the id)
// can later call success/dismiss with it.
jest.mock("react-hot-toast", () => {
    const mockToast = {
        success: jest.fn(),
        error: jest.fn(),
        loading: jest.fn(() => "tid-1"),
        dismiss: jest.fn(),
    };
    return {
        __esModule: true,
        default: mockToast,
        success: mockToast.success,
        error: mockToast.error,
        loading: mockToast.loading,
        dismiss: mockToast.dismiss,
        Toaster: () => null,
    };
});

// Minimal UI component mocks
jest.mock("../components/IconButton", () => (props) => (
    <button {...props}>{props.label || "Button"}</button>
));
jest.mock("../components/InputField", () => (props) => {
    const { id, name, placeholder, value, onChange, required } = props;
    return (
        <input
            data-testid={id || name}
            id={id}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
        />
    );
});
jest.mock("../components/PasswordInputField", () => (props) => {
    const { id, placeholder, value, onChange, required } = props;
    return (
        <input
            data-testid={id}
            type="password"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
        />
    );
});

// Static assets & CSS
jest.mock("../assets/google-icon.png", () => "google.png");
jest.mock("../assets/Logo.png", () => "logo.png");
jest.mock("../assets/Signup3.png", () => "signup.png");
jest.mock("../styles/login-signup.css", () => ({}));
jest.mock("../index.css", () => ({}));

// Supabase client (all 3 methods used)
jest.mock("../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            signInWithPassword: jest.fn(),
            signUp: jest.fn(),
            signInWithOAuth: jest.fn(),
        },
    },
}));

import supabase from "../supabase/supabaseClient";
import Login from "../pages/login-signup";

const getLoginForm = () =>
    screen.getByRole("heading", { name: /login/i }).closest("form");
const getSignupForm = () =>
    screen.getByRole("heading", { name: /signup/i }).closest("form");

describe("Login/Signup page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate.mockReset();
    });

    /* -------------------- SIGNUP: success -------------------- */
    it("signs up (email/password) and shows success", async () => {
        supabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { user_metadata: { email_verified: false } } },
            error: null,
        });

        render(<Login />);

        // open signup panel
        await userEvent.click(screen.getAllByRole("button", { name: /sign up/i })[0]);

        // fill + submit
        const form = getSignupForm();
        await userEvent.type(within(form).getByTestId("name"), "Alice");
        await userEvent.type(within(form).getByTestId("signup-email"), "alice@test.com");
        await userEvent.type(within(form).getByTestId("signup-password"), "StrongPass1!");
        await userEvent.click(within(form).getByRole("button", { name: /^sign up$/i }));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: "alice@test.com",
                password: "StrongPass1!",
                options: { data: { displayName: "Alice" } },
                redirectTo: `${WEB_URL}/profile`,
            });
        });

        const toast = (await import("react-hot-toast")).default;
        expect(toast.success).toHaveBeenCalledWith("Check your email to complete sign-up.");
    });

    /* --------- SIGNUP: duplicate email (already verified) --------- */
    it("shows duplicate email error when email already registered", async () => {
        supabase.auth.signUp.mockResolvedValueOnce({
            data: { user: { user_metadata: { email_verified: true } } },
            error: null,
        });

        render(<Login />);
        await userEvent.click(screen.getAllByRole("button", { name: /sign up/i })[0]);

        const form = getSignupForm();
        await userEvent.type(within(form).getByTestId("name"), "Alice");
        await userEvent.type(within(form).getByTestId("signup-email"), "alice@test.com");
        await userEvent.type(within(form).getByTestId("signup-password"), "StrongPass1!");
        await userEvent.click(within(form).getByRole("button", { name: /^sign up$/i }));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "This email is already registered. Please login or reset your password."
            );
        });
    });

    /* ----------------- SIGNUP: password rules gate ----------------- */
    it("blocks signup when password rules fail", async () => {
        render(<Login />);
        await userEvent.click(screen.getAllByRole("button", { name: /sign up/i })[0]);

        const form = getSignupForm();
        await userEvent.type(within(form).getByTestId("name"), "Bob");
        await userEvent.type(within(form).getByTestId("signup-email"), "bob@test.com");
        await userEvent.type(within(form).getByTestId("signup-password"), "short"); // invalid
        await userEvent.click(within(form).getByRole("button", { name: /^sign up$/i }));

        const toast = (await import("react-hot-toast")).default;
        expect(toast.error).toHaveBeenCalledWith("Password does not meet requirements");
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    /* --------------- SIGNUP: email + password toasts --------------- */
    it("shows invalid email toast then valid email toast; shows password rules then success", async () => {
        const toast = (await import("react-hot-toast")).default;

        render(<Login />);
        await userEvent.click(screen.getAllByRole("button", { name: /sign up/i })[0]);

        const form = getSignupForm();

        // invalid email triggers loading toast "✖ Invalid email format"
        await userEvent.type(within(form).getByTestId("signup-email"), "bad-email");
        await waitFor(() => {
            expect(toast.loading).toHaveBeenCalledWith("✖ Invalid email format", expect.any(Object));
        });

        // change to valid email triggers success ("✔ Valid email format")
        await userEvent.clear(within(form).getByTestId("signup-email"));
        await userEvent.type(within(form).getByTestId("signup-email"), "good@test.com");

        // Because we return an id from loading(), the success path can fire
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("✔ Valid email format", expect.any(Object));
        });

        // weak password shows rules toast (loading)
        await userEvent.type(within(form).getByTestId("signup-password"), "aaaa"); // too weak
        await waitFor(() => {
            expect(toast.loading).toHaveBeenCalledWith(expect.stringMatching(/Minimum 8 characters/), {
                duration: Infinity,
            });
        });

        // make it strong -> success toast for rules met
        await userEvent.clear(within(form).getByTestId("signup-password"));
        await userEvent.type(within(form).getByTestId("signup-password"), "Aa1!aaaa");
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                "Password meets all requirements!",
                expect.any(Object)
            );
        });
    });

    /* ---------------------- LOGIN: success ---------------------- */
    it("logs in and navigates to /dashboard", async () => {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: null });

        render(<Login />);

        const form = getLoginForm();
        await userEvent.type(within(form).getByTestId("login-email"), "user@test.com");
        await userEvent.type(within(form).getByTestId("login-password"), "StrongPass1!");
        await userEvent.click(within(form).getByRole("button", { name: /^login$/i }));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
                email: "user@test.com",
                password: "StrongPass1!",
            });
            expect(toast.success).toHaveBeenCalledWith("Login successful!");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
        });
    });

    /* ---------------------- LOGIN: error ---------------------- */
    it("shows toast when login returns error", async () => {
        supabase.auth.signInWithPassword.mockResolvedValueOnce({
            data: null,
            error: { message: "Invalid email or password" },
        });

        render(<Login />);
        const form = getLoginForm();
        await userEvent.type(within(form).getByTestId("login-email"), "user@test.com");
        await userEvent.type(within(form).getByTestId("login-password"), "wrong");
        await userEvent.click(within(form).getByRole("button", { name: /^login$/i }));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Invalid email or password");
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    /* ------------------- LOGIN: unexpected error ------------------- */
    it("shows generic toast on unexpected login error", async () => {
        // 🔇 silence console.error just for this test
        const errSpy = jest.spyOn(console, "error").mockImplementation(() => { });

        supabase.auth.signInWithPassword.mockRejectedValueOnce(new Error("boom"));

        render(<Login />);
        const form = getLoginForm();
        await userEvent.type(within(form).getByTestId("login-email"), "user@test.com");
        await userEvent.type(within(form).getByTestId("login-password"), "StrongPass1!");
        await userEvent.click(within(form).getByRole("button", { name: /^login$/i }));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "An unexpected error occurred. Please try again."
            );
        });

        errSpy.mockRestore(); // ✅ restore after assertions
    });


    /* ----------------- GOOGLE: success + error paths ---------------- */
    it("Google sign-in success", async () => {
        supabase.auth.signInWithOAuth.mockResolvedValueOnce({ error: null });

        render(<Login />);
        const loginForm = getLoginForm();
        await userEvent.click(
            within(loginForm).getByRole("button", { name: /sign in with google/i })
        );

        await waitFor(() => {
            expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
                provider: "google",
                options: { redirectTo: `${WEB_URL}/profile` },
            });
        });

        const toast = (await import("react-hot-toast")).default;
        expect(toast.success).toHaveBeenCalledWith("Signed in with Google!");
    });

    it("Google sign-in error", async () => {
        supabase.auth.signInWithOAuth.mockResolvedValueOnce({
            error: { message: "Google Sign-in failed" },
        });

        render(<Login />);
        const loginForm = getLoginForm();
        await userEvent.click(
            within(loginForm).getByRole("button", { name: /sign in with google/i })
        );

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Google Sign-in failed");
        });
    });
});
