// frontend/src/tests/pages/adminDashboard.test.jsx
import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock CSS imports FIRST (before component import)
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

// Mock IconButton
jest.mock("../../components/IconButton", () => {
  return function MockIconButton(props) {
    return (
      <button onClick={props.onClick} className={props.className}>
        {props.label}
      </button>
    );
  };
});

// Mock router
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Import AFTER all mocks are defined
import AdminDashboard from "../../pages/adminDashboard";

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AdminDashboard", () => {
  it("renders static sections", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    expect(
      await screen.findByRole("heading", { name: /admin dashboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose an area to create new content/i)
    ).toBeInTheDocument();
  });

  it("renders all dashboard action buttons", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    expect(
      await screen.findByRole("heading", { name: /admin dashboard/i })
    ).toBeInTheDocument();

    // Check for all 11 action buttons
    expect(screen.getByRole("button", { name: /create quest/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create hunt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create quiz/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create location/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create collectible/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage quests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage hunts/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage quizzes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage locations/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage collectibles/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage admins/i })).toBeInTheDocument();
  });

  it("navigates to addQuest when Create Quest clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /create quest/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/addQuest");
  });

  it("navigates to addHunt when Create Hunt clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /create hunt/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/addHunt");
  });

  it("navigates to addQuiz when Create Quiz clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /create quiz/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/addQuiz");
  });

  it("navigates to addLocation when Create Location clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /create location/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/addLocation");
  });

  it("navigates to addCollectible when Create Collectible clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /create collectible/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/addCollectible");
  });

  it("navigates to manageQuests when Manage Quests clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage quests/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageQuests");
  });

  it("navigates to manageHunts when Manage Hunts clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage hunts/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageHunts");
  });

  it("navigates to manageQuizzes when Manage Quizzes clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage quizzes/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageQuizzes");
  });

  it("navigates to manageLocations when Manage Locations clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage locations/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageLocations");
  });

  it("navigates to manageCollectibles when Manage Collectibles clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage collectibles/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageCollectibles");
  });

  it("navigates to manageAdmins when Manage Admins clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const button = await screen.findByRole("button", { name: /manage admins/i });
    fireEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith("/manageAdmins");
  });

  it("opens help modal when help button clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    // Find by aria-label instead of text content
    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);

    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();
  });

  it("closes help modal when close button clicked", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);

    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText(/for more detailed information/i)).not.toBeInTheDocument();
    });
  });

  it("closes help modal when clicking outside modal overlay", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);

    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();

    // Click the modal overlay (background)
    const modal = screen.getByText(/for more detailed information/i).closest(".modal");
    fireEvent.click(modal);

    await waitFor(() => {
      expect(screen.queryByText(/for more detailed information/i)).not.toBeInTheDocument();
    });
  });

  it("does not close modal when clicking inside modal content", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);

    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();

    // Click inside modal content
    const modalContent = screen.getByText(/for more detailed information/i).closest(".modal-content");
    fireEvent.click(modalContent);

    // Modal should still be open
    expect(screen.getByText(/for more detailed information/i)).toBeInTheDocument();
  });

  it("renders admin guide link in help modal", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);

    const link = await screen.findByRole("link", { name: /admin guide pdf/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("toggles help modal open and closed multiple times", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    // Initially closed
    expect(screen.queryByText(/for more detailed information/i)).not.toBeInTheDocument();

    // Open
    const helpButton = await screen.findByRole("button", { name: /help/i });
    fireEvent.click(helpButton);
    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();

    // Close
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    await waitFor(() => {
      expect(screen.queryByText(/for more detailed information/i)).not.toBeInTheDocument();
    });

    // Open again
    fireEvent.click(helpButton);
    expect(await screen.findByText(/for more detailed information/i)).toBeInTheDocument();
  });
});
