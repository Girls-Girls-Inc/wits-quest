/** @jest-environment jsdom */

import React from "react";
import {
    render,
    screen,
    waitFor,
    fireEvent,
    within,
    act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// Mock environment variable
process.env.VITE_WEB_URL = "http://localhost:3000";
const API_BASE = process.env.VITE_WEB_URL;

/* ========================= Mocks ========================= */

// --- Mock supabase (define first) ---
const mockGetSession = jest.fn();
const mockGetUser = jest.fn();

jest.mock("../../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            getSession: (...args) => mockGetSession(...args),
            getUser: (...args) => mockGetUser(...args),
        },
    },
}));

// Mock navigation
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => mockNavigate,
}));

// Mock toast
jest.mock("react-hot-toast", () => {
    const mockToast = {
        success: jest.fn(),
        error: jest.fn(),
        loading: jest.fn(() => "toast-id"),
        dismiss: jest.fn(),
    };
    return {
        __esModule: true,
        default: mockToast,
        toast: mockToast,
        Toaster: () => <div data-testid="toaster" />,
    };
});

// Mock components
jest.mock("../../components/InputField", () => (props) => {
    const { id, name, placeholder, value, onChange, required, type, icon, step, readOnly } = props;
    return (
        <input
            id={id}
            data-testid={name || `input-${placeholder?.toLowerCase().replace(/\s+/g, '-')}`}
            name={name}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            required={required}
            type={type}
            step={step}
            readOnly={readOnly}
            data-icon={icon}
        />
    );
});

jest.mock("../../components/IconButton", () => (props) => (
    <button 
        data-testid={`icon-btn-${props.label?.toLowerCase().replace(/\s+/g, '-')}`}
        {...props}
    >
        {props.label || "Button"}
    </button>
));

jest.mock("../../components/LocationMapPicker", () => (props) => (
    <div
        data-testid="location-map-picker"
        onClick={() => props.onChange?.({ lat: -26.190166, lng: 28.030172 })}
    >
        Map Picker
    </div>
));

// CSS imports
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

// Import component after mocks
import AdminDashboard from "../../pages/AdminDashboard";

// Sample data
const sampleCollectibles = [
    { id: 1, name: "Gold Coin" },
    { id: 2, name: "Silver Badge" },
];

const sampleLocations = [
    { id: 1, name: "Library" },
    { id: 2, name: "Park" },
];

const sampleHunts = [
    { id: 1, name: "Treasure Hunt" },
    { id: 2, name: "Photo Hunt" },
];

const sampleQuizzes = [
    { id: 1, questionText: "What is 2+2?" },
    { id: 2, questionText: "Capital of France?" },
];

const sampleUsers = [
    { userId: "u1", email: "user@example.com", isModerator: false },
    { userId: "u2", email: "admin@example.com", isModerator: true },
];

describe("AdminDashboard", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        global.fetch = jest.fn();
        
        // Default successful auth
        mockGetSession.mockResolvedValue({
            data: { 
                session: { 
                    access_token: "admin-token", 
                    user: { id: "admin1", email: "admin@example.com" } 
                } 
            },
        });

        mockGetUser.mockResolvedValue({
            data: { user: { id: "admin1", email: "admin@example.com" } },
            error: null,
        });

        // Mock successful API responses by default
        global.fetch.mockImplementation((url) => {
            if (url.includes("/collectibles")) {
                return Promise.resolve({ ok: true, json: async () => sampleCollectibles });
            }
            if (url.includes("/locations")) {
                return Promise.resolve({ ok: true, json: async () => sampleLocations });
            }
            if (url.includes("/hunts")) {
                return Promise.resolve({ ok: true, json: async () => sampleHunts });
            }
            if (url.includes("/quizzes")) {
                return Promise.resolve({ ok: true, json: async () => sampleQuizzes });
            }
            if (url.includes("/users")) {
                return Promise.resolve({ ok: true, json: async () => sampleUsers });
            }
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        jest.spyOn(console, "error").mockImplementation(() => {});
        jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    /* -------------------- Dashboard Main View -------------------- */

    it("renders admin dashboard with all buttons", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-create-quest")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-create-hunt")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-create-quiz")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-create-location")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-manage-admins")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-manage-quests")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-manage-hunts")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-manage-quizzes")).toBeInTheDocument();
        expect(screen.getByTestId("icon-btn-manage-locations")).toBeInTheDocument();
    });

    it("loads options data on mount", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/collectibles`,
                expect.objectContaining({ credentials: "include" })
            );
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/locations`,
                expect.objectContaining({ credentials: "include" })
            );
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/hunts`,
                expect.objectContaining({ 
                    credentials: "include",
                    headers: { Authorization: "Bearer admin-token" }
                })
            );
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/users`,
                expect.objectContaining({ 
                    headers: { Authorization: "Bearer admin-token" }
                })
            );
        });
    });

    it("navigates to quiz and quest management pages", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quiz"));
        expect(mockNavigate).toHaveBeenCalledWith("/addQuiz");

        fireEvent.click(screen.getByTestId("icon-btn-manage-quests"));
        expect(mockNavigate).toHaveBeenCalledWith("/manageQuests");

        fireEvent.click(screen.getByTestId("icon-btn-manage-quizzes"));
        expect(mockNavigate).toHaveBeenCalledWith("/manageQuizzes");

        fireEvent.click(screen.getByTestId("icon-btn-manage-hunts"));
        expect(mockNavigate).toHaveBeenCalledWith("/manageHunts");

        fireEvent.click(screen.getByTestId("icon-btn-manage-locations"));
        expect(mockNavigate).toHaveBeenCalledWith("/manageLocations");
    });

    /* -------------------- Quest Creation -------------------- */

    it("opens quest creation form and creates quest successfully", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Click Create Quest
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        
        expect(screen.getByText("Quest Creation")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Quest Name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Quest Description")).toBeInTheDocument();

        // Fill form
        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Test Quest");
        await userEvent.type(screen.getByPlaceholderText("Quest Description"), "A test quest");

        fireEvent.change(screen.getByDisplayValue("Select a collectible"), {
            target: { value: "1" },
        });
        fireEvent.change(screen.getByDisplayValue("Select a location"), {
            target: { value: "1" },
        });
        await userEvent.type(screen.getByPlaceholderText("Points Achievable"), "100");

        // Mock successful quest creation
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 1, name: "Test Quest" })
        });

        // Submit
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            const questCall = global.fetch.mock.calls.find(
                ([url]) => url === `${API_BASE}/quests`
            );
            expect(questCall).toBeDefined();
            const [, requestOptions] = questCall;
            expect(requestOptions).toEqual(
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                        Authorization: "Bearer admin-token",
                    }),
                })
            );
            const payload = JSON.parse(requestOptions.body);
            expect(payload).toMatchObject({
                name: "Test Quest",
                description: "A test quest",
                pointsAchievable: 100,
                isActive: true,
                createdBy: "admin1",
            });
            expect(toast.success).toHaveBeenCalledWith("Quest created successfully!");
        });

        // Should return to main view
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    it("handles quest creation failure", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Test Quest");
        await userEvent.type(screen.getByPlaceholderText("Quest Description"), "A test quest");

        // Mock failure
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: "Quest creation failed" })
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to create quest: Quest creation failed");
        });
    });

    it("prevents quest creation when not logged in", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Quest");
        await userEvent.type(screen.getByPlaceholderText("Quest Description"), "Desc");
        fireEvent.change(screen.getByDisplayValue("Select a location"), {
            target: { value: "1" },
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        const toast = (await import("react-hot-toast")).default;
        expect(toast.error).toHaveBeenCalledWith("You must be logged in");
    });

    it("handles session expiry during quest creation", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Test Quest");
        await userEvent.type(screen.getByPlaceholderText("Quest Description"), "A test quest");

        // Mock session expiry
        mockGetSession.mockResolvedValue({ data: { session: null } });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Your session expired. Please sign in again.");
        });
    });

    /* -------------------- Hunt Creation -------------------- */

    it("creates hunt successfully", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-hunt"));
        
        expect(screen.getByText("Hunt Creation")).toBeInTheDocument();

        // Fill hunt form
        await userEvent.type(screen.getByPlaceholderText("Hunt Name"), "Test Hunt");
        await userEvent.type(screen.getByPlaceholderText("Hunt Description"), "A test hunt");
        await userEvent.type(screen.getByPlaceholderText("Hunt Question"), "Find the treasure");
        await userEvent.type(screen.getByPlaceholderText("Correct Answer"), "Under the tree");
        await userEvent.type(screen.getByPlaceholderText("Time Limit (seconds, optional)"), "300");

        // Mock successful creation
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 1, name: "Test Hunt" })
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-hunt"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/hunts`,
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        name: "Test Hunt",
                        description: "A test hunt",
                        question: "Find the treasure",
                        answer: "Under the tree",
                        timeLimit: 300,
                        collectibleId: null,
                        pointsAchievable: 0,
                    }),
                })
            );
            expect(toast.success).toHaveBeenCalledWith("Hunt created successfully!");
        });
    });

    it("handles hunt creation failure", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-hunt"));

        await userEvent.type(screen.getByPlaceholderText("Hunt Name"), "Test Hunt");
        await userEvent.type(screen.getByPlaceholderText("Hunt Description"), "A test hunt");
        await userEvent.type(screen.getByPlaceholderText("Hunt Question"), "Find the treasure");
        await userEvent.type(screen.getByPlaceholderText("Correct Answer"), "Under the tree");

        // Mock failure
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: "Hunt creation failed" })
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-hunt"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to create hunt: Hunt creation failed");
        });
    });

    /* -------------------- Location Creation -------------------- */

    it("creates location successfully", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-location"));
        
        expect(screen.getByText("Location Creation")).toBeInTheDocument();

        // Fill location form
        await userEvent.type(screen.getByPlaceholderText("Location Name"), "Test Location");
        fireEvent.click(screen.getByTestId("location-map-picker"));
        await userEvent.type(screen.getByPlaceholderText("Radius"), "50");

        // Mock successful creation
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 1, name: "Test Location" })
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-location"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/locations`,
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify({
                        name: "Test Location",
                        latitude: -26.190166,
                        longitude: 28.030172,
                        radius: 50,
                    }),
                })
            );
            expect(toast.success).toHaveBeenCalledWith("Location created successfully!");
        });
    });

    it("handles location creation with error response", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-location"));

        await userEvent.type(screen.getByPlaceholderText("Location Name"), "Test Location");
        fireEvent.click(screen.getByTestId("location-map-picker"));
        await userEvent.type(screen.getByPlaceholderText("Radius"), "50");

        // Mock failure with error field
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: "Invalid coordinates" })
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-location"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to create location: Invalid coordinates");
        });
    });

    /* -------------------- Admin Privilege Management -------------------- */

    it("displays users and toggles moderator status", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-manage-admins"));
        
        expect(screen.getByText("Manage Admin Privileges")).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText("user@example.com")).toBeInTheDocument();
            expect(screen.getByText("admin@example.com")).toBeInTheDocument();
        });

        // Check initial status
        const userRow = screen.getByText("user@example.com").closest(".quest-card");
        const adminRow = screen.getByText("admin@example.com").closest(".quest-card");
        
        expect(within(userRow).getByText("(User)")).toBeInTheDocument();
        expect(within(userRow).getByText("Make Admin")).toBeInTheDocument();
        expect(within(adminRow).getByText("(Admin)")).toBeInTheDocument();
        expect(within(adminRow).getByText("Remove Admin")).toBeInTheDocument();

        // Toggle user to admin
        global.fetch.mockResolvedValueOnce({ ok: true });
        
        fireEvent.click(within(userRow).getByText("Make Admin"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/users/u1`,
                expect.objectContaining({
                    method: "PATCH",
                    body: JSON.stringify({ isModerator: true }),
                })
            );
            expect(toast.success).toHaveBeenCalledWith("User updated!");
        });
    });

    it("handles moderator toggle failure and reverts state", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-manage-admins"));

        await waitFor(() => {
            expect(screen.getByText("user@example.com")).toBeInTheDocument();
        });

        const userRow = screen.getByText("user@example.com").closest(".quest-card");
        
        // Mock failure
        global.fetch.mockResolvedValueOnce({
            ok: false,
            text: async () => "Update failed"
        });

        fireEvent.click(within(userRow).getByText("Make Admin"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to update user: Update failed");
        });

        // State should be reverted - should still show "Make Admin"
        expect(within(userRow).getByText("Make Admin")).toBeInTheDocument();
    });

    it("handles users fetch failure", async () => {
        // Mock users fetch failure
        global.fetch.mockImplementation((url) => {
            if (url.includes("/users")) {
                return Promise.reject(new Error("Network error"));
            }
            // Keep other endpoints working
            if (url.includes("/collectibles")) return Promise.resolve({ ok: true, json: async () => sampleCollectibles });
            if (url.includes("/locations")) return Promise.resolve({ ok: true, json: async () => sampleLocations });
            if (url.includes("/hunts")) return Promise.resolve({ ok: true, json: async () => sampleHunts });
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to load users: Network error");
        });
    });

    /* -------------------- Back Navigation -------------------- */

    it("navigates back to main view from forms", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Test quest creation back
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        expect(screen.getByText("Quest Creation")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("icon-btn-back-to-admin"));
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();

        // Test location creation back
        fireEvent.click(screen.getByTestId("icon-btn-create-location"));
        expect(screen.getByText("Location Creation")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("icon-btn-back-to-admin"));
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();

        // Test admin privilege back
        fireEvent.click(screen.getByTestId("icon-btn-manage-admins"));
        expect(screen.getByText("Manage Admin Privileges")).toBeInTheDocument();

        fireEvent.click(screen.getByTestId("icon-btn-back-to-admin"));
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    /* -------------------- Form State Management -------------------- */

    it("maintains form state while switching tasks", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Fill quest form
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Test Quest");

        // Go back and return
        fireEvent.click(screen.getByTestId("icon-btn-back-to-admin"));
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        // Form should be reset
        expect(screen.getByPlaceholderText("Quest Name")).toHaveValue("");
    });

    it("handles checkbox toggle in quest form", async () => {
        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        
        const checkbox = screen.getByRole("checkbox");
        expect(checkbox).toBeChecked(); // Default is true

        fireEvent.click(checkbox);
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
    });

    /* -------------------- API Error Handling -------------------- */

    it("handles API fetch errors gracefully", async () => {
        // Mock all API calls to fail
        global.fetch.mockRejectedValue(new Error("Network error"));

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Component should still render despite API failures
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();

        // Create quest should still work (just with empty dropdowns)
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        expect(screen.getByText("Quest Creation")).toBeInTheDocument();
        expect(screen.getByText("Select a collectible")).toBeInTheDocument();
    });

    it("handles non-array responses from APIs", async () => {
        // Mock APIs to return non-arrays
        global.fetch.mockImplementation((url) => {
            if (url.includes("/collectibles")) return Promise.resolve({ ok: true, json: async () => ({ error: "Not found" }) });
            if (url.includes("/locations")) return Promise.resolve({ ok: true, json: async () => null });
            if (url.includes("/users")) return Promise.resolve({ ok: true, json: async () => sampleUsers });
            return Promise.resolve({ ok: true, json: async () => [] });
        });

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Should handle gracefully
        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));
        expect(screen.getByText("Select a collectible")).toBeInTheDocument();
        expect(screen.getByText("Select a location")).toBeInTheDocument();
    });

    /* -------------------- Authorization Edge Cases -------------------- */

    it("handles quest creation without auth token", async () => {
        // Mock no session for quest creation attempt
        mockGetSession.mockResolvedValue({ data: { session: null } });

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        await userEvent.type(screen.getByPlaceholderText("Quest Name"), "Test");
        await userEvent.type(screen.getByPlaceholderText("Quest Description"), "Test");

        fireEvent.click(screen.getByTestId("icon-btn-create-quest"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Your session expired. Please sign in again.");
        });
    });

    it("loads quizzes only when token is available", async () => {
        // Mock no token scenario
        mockGetSession.mockResolvedValue({ data: { session: null } });

        await act(async () => {
            render(
                <MemoryRouter>
                    <AdminDashboard />
                </MemoryRouter>
            );
        });

        // Quiz endpoint should not be called without token
        await waitFor(() => {
            const quizCalls = global.fetch.mock.calls.filter(call => call[0].includes("/quizzes"));
            expect(quizCalls).toHaveLength(0);
        });
    });
});
