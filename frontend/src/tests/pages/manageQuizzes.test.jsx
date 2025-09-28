/** @jest-environment jsdom */

const API_BASE = process.env.VITE_WEB_URL || "http://localhost:3000";

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfill for libs that expect them
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

// Mock fetch globally
global.fetch = jest.fn();

// Mock confirm
global.confirm = jest.fn();

// Router mock
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

// Toasts
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
        success: mockToast.success,
        error: mockToast.error,
        loading: mockToast.loading,
        dismiss: mockToast.dismiss,
        Toaster: () => <div data-testid="toaster" />,
    };
});

// Supabase client
jest.mock("../../supabase/supabaseClient", () => ({
    __esModule: true,
    default: {
        auth: {
            getSession: jest.fn(),
        },
    },
}));

// Component mocks
jest.mock("../../components/InputField", () => (props) => {
    const { name, placeholder, value, onChange, required, icon } = props;
    return (
        <input
            data-testid={name}
            name={name}
            placeholder={placeholder}
            value={value || ""}
            onChange={onChange}
            required={required}
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

// CSS imports
jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

import supabase from "../../supabase/supabaseClient";
import ManageQuizzes from "../../pages/manageQuizzes";

// Helper functions
const mockFetch = (response, status = 200) => {
    global.fetch.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        text: jest.fn().mockResolvedValue(typeof response === 'string' ? response : ''),
        json: jest.fn().mockResolvedValue(response),
    });
};

const mockFetchError = (status = 500, message = "Server error") => {
    global.fetch.mockResolvedValueOnce({
        ok: false,
        status,
        text: jest.fn().mockResolvedValue(message),
        json: jest.fn().mockRejectedValue(new Error('Not JSON')),
    });
};

const sampleQuizzes = [
    {
        id: 1,
        questionText: "What is 2 + 2?",
        questionType: "text",
        correctAnswer: "4",
        options: []
    },
    {
        id: 2,
        questionText: "Which color is red?",
        questionType: "mcq",
        correctAnswer: "Red",
        options: ["Red", "Blue", "Green"]
    }
];

describe("ManageQuizzes Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch.mockClear();
        global.confirm.mockClear();
        mockNavigate.mockClear();
        
        // Mock successful auth session by default
        supabase.auth.getSession.mockResolvedValue({
            data: { session: { access_token: "mock-token" } }
        });
    });

    /* -------------------- Loading Quizzes -------------------- */
    
    it("loads and displays quizzes on mount", async () => {
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        expect(global.fetch).toHaveBeenCalledWith(
            `${API_BASE}/quizzes`,
            expect.objectContaining({
                headers: { Authorization: "Bearer mock-token" },
                credentials: "include",
            })
        );

        const toast = (await import("react-hot-toast")).default;
        expect(toast.success).toHaveBeenCalledWith("Quizzes loaded", { id: "toast-id" });
    });

    it("shows error when failing to load quizzes", async () => {
        mockFetchError(500, "Failed to fetch quizzes");

        render(<ManageQuizzes />);

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to fetch quizzes", { id: "toast-id" });
        });
    });

    it("shows session expired error when no token", async () => {
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null }
        });

        render(<ManageQuizzes />);

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Session expired. Please sign in again.", { id: "toast-id" });
        });
    });

    it("handles non-array response gracefully", async () => {
        mockFetch({ message: "Not an array" });

        render(<ManageQuizzes />);

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith("Quizzes loaded", { id: "toast-id" });
        });

        // Should not crash, should show empty state
        expect(screen.queryByText("What is 2 + 2?")).not.toBeInTheDocument();
    });

    /* -------------------- Quiz Display -------------------- */

    it("displays text quiz correctly", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
            expect(screen.getByText((content, element) => {
                return element?.textContent === "Type: TEXT";
            })).toBeInTheDocument();
            expect(screen.getByText((content, element) => {
                return element?.textContent === "Correct Answer: 4";
            })).toBeInTheDocument();
        });
    });

    it("displays MCQ quiz correctly", async () => {
        mockFetch([sampleQuizzes[1]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
            expect(screen.getByText((content, element) => {
                return element?.textContent === "Type: MCQ";
            })).toBeInTheDocument();
            expect(screen.getByText((content, element) => {
                return element?.textContent === "Options: Red, Blue, Green";
            })).toBeInTheDocument();
            expect(screen.getByText((content, element) => {
                return element?.textContent === "Correct Answer: Red";
            })).toBeInTheDocument();
        });
    });

    /* -------------------- Edit Quiz Flow -------------------- */

    it("opens edit form when clicking edit button", async () => {
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        const editButtons = screen.getAllByText("Edit");
        await userEvent.click(editButtons[0]);

        // Form should appear with quiz data populated
        expect(screen.getByDisplayValue("What is 2 + 2?")).toBeInTheDocument();
        expect(screen.getByDisplayValue("4")).toBeInTheDocument();
        expect(screen.getByText("Save Quiz")).toBeInTheDocument();
    });

    it("populates MCQ form correctly when editing", async () => {
        mockFetch([sampleQuizzes[1]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Check form is populated
        expect(screen.getByDisplayValue("Which color is red?")).toBeInTheDocument();
        
        // Check option inputs by their test IDs
        expect(screen.getByTestId("option-0")).toHaveValue("Red");
        expect(screen.getByTestId("option-1")).toHaveValue("Blue");
        expect(screen.getByTestId("option-2")).toHaveValue("Green");
        
        // Check dropdown has correct answer selected
        const correctAnswerSelect = screen.getByRole("combobox", { name: /correct answer/i });
        expect(correctAnswerSelect).toHaveValue("Red");
    });

    it("switches question type from text to MCQ", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Switch to MCQ
        const questionTypeSelect = screen.getByRole("combobox", { name: /question type/i });
        await userEvent.selectOptions(questionTypeSelect, "mcq");

        // Should show options inputs
        expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument();
        expect(screen.getByText("Add Option")).toBeInTheDocument();
    });

    /* -------------------- MCQ Options Management -------------------- */

    it("adds and removes MCQ options", async () => {
        mockFetch([sampleQuizzes[1]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Should have 3 options initially
        expect(screen.getByTestId("option-0")).toHaveValue("Red");
        expect(screen.getByTestId("option-1")).toHaveValue("Blue");
        expect(screen.getByTestId("option-2")).toHaveValue("Green");

        // Add a new option
        await userEvent.click(screen.getByText("Add Option"));
        expect(screen.getByPlaceholderText("Option 4")).toBeInTheDocument();

        // Remove an option (delete buttons should be present when > 2 options)
        const deleteButtons = screen.getAllByText("delete");
        expect(deleteButtons.length).toBeGreaterThan(0);
        await userEvent.click(deleteButtons[0]);

        // One option should be removed
        await waitFor(() => {
            expect(screen.queryByTestId("option-0")).not.toBeInTheDocument();
        });
    });

    it("prevents removing options when only 2 remain", async () => {
        // Create quiz with exactly 2 options
        const twoOptionQuiz = {
            ...sampleQuizzes[1],
            options: ["Red", "Blue"]
        };
        mockFetch([twoOptionQuiz]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Should not show delete buttons when only 2 options
        expect(screen.queryByText("delete")).not.toBeInTheDocument();
    });

    /* -------------------- Form Validation -------------------- */

    it("validates required question text", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Clear question text
        const questionInput = screen.getByDisplayValue("What is 2 + 2?");
        await userEvent.clear(questionInput);

        // Try to save
        await userEvent.click(screen.getByText("Save Quiz"));

        const toast = (await import("react-hot-toast")).default;
        expect(toast.error).toHaveBeenCalledWith("Question text is required");
        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining("/quiz/"),
            expect.objectContaining({ method: "PUT" })
        );
    });

    it("validates MCQ has at least 2 options", async () => {
        mockFetch([sampleQuizzes[1]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Clear all options
        await userEvent.clear(screen.getByTestId("option-0"));
        await userEvent.clear(screen.getByTestId("option-1"));
        await userEvent.clear(screen.getByTestId("option-2"));

        await userEvent.click(screen.getByText("Save Quiz"));

        const toast = (await import("react-hot-toast")).default;
        expect(toast.error).toHaveBeenCalledWith("Provide at least two options");
    });

    it("validates correct answer is required", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Clear correct answer
        await userEvent.clear(screen.getByDisplayValue("4"));

        await userEvent.click(screen.getByText("Save Quiz"));

        const toast = (await import("react-hot-toast")).default;
        expect(toast.error).toHaveBeenCalledWith("Correct answer is required");
    });

    /* -------------------- Save Quiz -------------------- */

    it("saves text quiz successfully", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Modify the question
        const questionInput = screen.getByDisplayValue("What is 2 + 2?");
        await userEvent.clear(questionInput);
        await userEvent.type(questionInput, "What is 3 + 3?");

        const answerInput = screen.getByDisplayValue("4");
        await userEvent.clear(answerInput);
        await userEvent.type(answerInput, "6");

        // Mock successful save
        mockFetch({
            quiz: {
                id: 1,
                questionText: "What is 3 + 3?",
                questionType: "text",
                correctAnswer: "6",
                options: []
            }
        });

        await userEvent.click(screen.getByText("Save Quiz"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/quiz/1`,
                expect.objectContaining({
                    method: "PUT",
                    headers: expect.objectContaining({
                        "Content-Type": "application/json",
                        Authorization: "Bearer mock-token",
                    }),
                    body: JSON.stringify({
                        questionText: "What is 3 + 3?",
                        questionType: "text",
                        correctAnswer: "6",
                    }),
                })
            );
        });

        const toast = (await import("react-hot-toast")).default;
        expect(toast.success).toHaveBeenCalledWith("Quiz updated", { id: "toast-id" });

        // Form should be reset
        expect(screen.queryByDisplayValue("What is 3 + 3?")).not.toBeInTheDocument();
    });

    it("saves MCQ quiz successfully", async () => {
        mockFetch([sampleQuizzes[1]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("Which color is red?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Mock successful save
        mockFetch({
            quiz: {
                id: 2,
                questionText: "Which color is red?",
                questionType: "mcq",
                correctAnswer: "Red",
                options: ["Red", "Blue", "Green"]
            }
        });

        await userEvent.click(screen.getByText("Save Quiz"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/quiz/2`,
                expect.objectContaining({
                    method: "PUT",
                    body: JSON.stringify({
                        questionText: "Which color is red?",
                        questionType: "mcq",
                        correctAnswer: "Red",
                        options: ["Red", "Blue", "Green"],
                    }),
                })
            );
        });
    });

    it("handles save error", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Mock failed save
        mockFetch({ message: "Update failed" }, 400);

        await userEvent.click(screen.getByText("Save Quiz"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update failed", { id: "toast-id" });
        });
    });

    /* -------------------- Delete Quiz -------------------- */

    it("deletes quiz after confirmation", async () => {
        global.confirm.mockReturnValue(true);
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        // Mock successful delete
        mockFetch("", 200);

        const deleteButtons = screen.getAllByText("Delete");
        await userEvent.click(deleteButtons[0]);

        expect(global.confirm).toHaveBeenCalledWith("Delete this quiz?");

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `${API_BASE}/quiz/1`,
                expect.objectContaining({
                    method: "DELETE",
                    headers: { Authorization: "Bearer mock-token" },
                })
            );
            expect(toast.success).toHaveBeenCalledWith("Quiz deleted", { id: "toast-id" });
        });
    });

    it("cancels delete when user declines confirmation", async () => {
        global.confirm.mockReturnValue(false);
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        const deleteButtons = screen.getAllByText("Delete");
        await userEvent.click(deleteButtons[0]);

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalledWith(
            expect.stringContaining("/quiz/"),
            expect.objectContaining({ method: "DELETE" })
        );
    });

    it("handles delete error", async () => {
        global.confirm.mockReturnValue(true);
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        // Mock failed delete
        mockFetchError(500, "Failed to delete quiz");

        const deleteButtons = screen.getAllByText("Delete");
        await userEvent.click(deleteButtons[0]);

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Failed to delete quiz", { id: "toast-id" });
        });
    });

    /* -------------------- Navigation -------------------- */

    it("navigates to add quiz page", async () => {
        mockFetch([]);

        render(<ManageQuizzes />);

        await userEvent.click(screen.getByText("New Quiz"));

        expect(mockNavigate).toHaveBeenCalledWith("/addQuiz");
    });

    it("navigates back to admin dashboard", async () => {
        mockFetch([]);

        render(<ManageQuizzes />);

        await userEvent.click(screen.getByText("Back to Admin"));

        expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
    });

    it("refreshes quiz list", async () => {
        mockFetch(sampleQuizzes);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        // Mock refresh call
        mockFetch([...sampleQuizzes, { id: 3, questionText: "New quiz?", questionType: "text", correctAnswer: "answer", options: [] }]);

        await userEvent.click(screen.getByText("Refresh"));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
        });
    });

    /* -------------------- Form Reset -------------------- */

    it("cancels edit and resets form", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        await userEvent.click(screen.getByText("Edit"));

        // Form should be visible
        expect(screen.getByDisplayValue("What is 2 + 2?")).toBeInTheDocument();

        // Cancel edit
        await userEvent.click(screen.getByText("Cancel"));

        // Form should be hidden
        expect(screen.queryByDisplayValue("What is 2 + 2?")).not.toBeInTheDocument();
        expect(screen.queryByText("Save Quiz")).not.toBeInTheDocument();
    });

    /* -------------------- Edge Cases -------------------- */

    it("handles session expiry during operations", async () => {
        mockFetch([sampleQuizzes[0]]);

        render(<ManageQuizzes />);

        await waitFor(() => {
            expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
        });

        // Simulate session expiry
        supabase.auth.getSession.mockResolvedValue({
            data: { session: null }
        });

        await userEvent.click(screen.getByText("Edit"));
        await userEvent.click(screen.getByText("Save Quiz"));

        const toast = (await import("react-hot-toast")).default;
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Session expired. Please sign in again.", { id: "toast-id" });
        });
    });
});