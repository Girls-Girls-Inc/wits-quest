/** @jest-environment jsdom */
import "@testing-library/jest-dom";

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/* ====== Mocks ====== */

// Simple, callable toast with methods
jest.mock("react-hot-toast", () => {
    const fn = jest.fn(); // this handles plain toast("...")
    fn.success = jest.fn();
    fn.error = jest.fn();
    fn.loading = jest.fn(() => "tid-1");
    fn.dismiss = jest.fn();
    return {
        __esModule: true,
        default: fn,
        success: fn.success,
        error: fn.error,
        loading: fn.loading,
        dismiss: fn.dismiss,
        Toaster: () => null,
    };
});

// Mock minimal UI primitives used in the page
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
    const { id, placeholder, value, name, onChange, required } = props;
    return (
        <input
            data-testid={id}
            type="password"
            placeholder={placeholder}
            value={value}
            name={name}
            onChange={onChange}
            required={required}
        />
    );
});

// Assets & CSS
jest.mock("../styles/login-signup.css", () => ({}));
jest.mock("../index.css", () => ({}));
jest.mock("../assets/signup.png", () => "signup.png");

// Supabase
jest.mock("../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            getUser: jest.fn(),
            updateUser: jest.fn(),
        },
    },
}));

import supabase from "../supabase/supabaseClient";
import Profile from "../pages/profile";

const toast = require("react-hot-toast").default;

const seedUser = ({
    email = "user@test.com",
    displayName = "User One",
} = {}) => ({
    data: {
        user: {
            email,
            user_metadata: { displayName },
        },
    },
    error: null,
});

describe("Profile page", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default both getUser calls (initial load + inside save handler)
        supabase.auth.getUser.mockResolvedValue(seedUser());
    });

    it("loads current user and populates the form", async () => {
        render(<Profile />);
        // Wait until loading finishes (heading appears)
        expect(await screen.findByRole("heading", { name: /my profile/i })).toBeInTheDocument();

        expect(screen.getByTestId("displayName")).toHaveValue("User One");
        expect(screen.getByTestId("email")).toHaveValue("user@test.com");
        expect(screen.getByTestId("password")).toHaveValue("");
        expect(screen.getByTestId("confirmPassword")).toHaveValue("");
    });

    it("shows toast when initial fetch fails", async () => {
        supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "x" } });
        render(<Profile />);

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Error fetching user");
        });
    });

    it("blocks save on password mismatch", async () => {
        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.type(screen.getByTestId("password"), "NewPass1!");
        await userEvent.type(screen.getByTestId("confirmPassword"), "Different1!");

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        expect(toast.error).toHaveBeenCalledWith("Passwords do not match");
        expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it('shows "No changes to update" when nothing changed', async () => {
        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        expect(toast).toHaveBeenCalledWith("No changes to update");
        expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    });

    it("updates email and shows pending email toast; form email updates", async () => {
        supabase.auth.updateUser.mockResolvedValueOnce({
            data: { user: { new_email: "new@test.com" } },
            error: null,
        });

        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.clear(screen.getByTestId("email"));
        await userEvent.type(screen.getByTestId("email"), "new@test.com");

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({ email: "new@test.com" });
        });

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(
                expect.stringMatching(/^Check new@test\.com for a confirmation link/)
            );
        });

        expect(screen.getByTestId("email")).toHaveValue("new@test.com");
    });

    it("updates display name only and shows success toast", async () => {
        supabase.auth.updateUser.mockResolvedValueOnce({ data: {}, error: null });

        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.clear(screen.getByTestId("displayName"));
        await userEvent.type(screen.getByTestId("displayName"), "New Name");

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({
                data: { displayName: "New Name" },
            });
        });

        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
    });

    it("updates password only, shows success toasts, and clears fields", async () => {
        supabase.auth.updateUser.mockResolvedValueOnce({ data: {}, error: null });

        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.type(screen.getByTestId("password"), "StrongPass1!");
        await userEvent.type(screen.getByTestId("confirmPassword"), "StrongPass1!");

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "StrongPass1!" });
        });

        expect(toast.success).toHaveBeenCalledWith("Profile updated successfully!");
        expect(toast.success).toHaveBeenCalledWith("Password changed successfully!");
        expect(screen.getByTestId("password")).toHaveValue("");
        expect(screen.getByTestId("confirmPassword")).toHaveValue("");
    });

    it("shows error toast when update fails", async () => {
        supabase.auth.updateUser.mockResolvedValueOnce({
            data: null,
            error: { message: "nope" },
        });

        render(<Profile />);
        await screen.findByRole("heading", { name: /my profile/i });

        await userEvent.type(screen.getByTestId("password"), "StrongPass1!");
        await userEvent.type(screen.getByTestId("confirmPassword"), "StrongPass1!");

        await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to update profile: nope");
        });
    });
});
