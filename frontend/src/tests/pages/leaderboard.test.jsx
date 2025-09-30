import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Leaderboard from "../../pages/leaderboard";
import { addRoute, jsonRes } from "../testUtils";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

beforeAll(() => {
  // Provide a fake clipboard for JSDOM
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: jest.fn().mockResolvedValue(),
    },
    writable: true,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("Leaderboard page", () => {
  it("loads the public yearly board on mount and displays rows", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([
      { userId: "u1", username: "Zed", points: 100, rank: 1 },
    ]));
    render(<Leaderboard />);
    expect(await screen.findByText(/zed/i)).toBeInTheDocument();
  });

  it("switches to Private scope and opens details", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute("GET", "/private-leaderboards/p1/members", jsonRes([{ userId: "u1" }, { userId: "u2" }]));
    addRoute("GET", "/private-leaderboards/p1", jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" }));
    addRoute(/standings\?period=year/, jsonRes([
      { userId: "u1", username: "Alice", points: 10, rank: 1 },
      { userId: "u2", username: "Bob", points: 5, rank: 2 },
    ]));

    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /private/i }));
    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));

    await screen.findByRole("heading", { name: /club a/i });

    expect(await screen.findByText(/alice/i)).toBeInTheDocument();
    expect(await screen.findByText(/bob/i)).toBeInTheDocument();
  });

  it("changes period inside private details and reloads standings", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute("GET", "/private-leaderboards/p1/members", jsonRes([{ userId: "u1" }]));
    addRoute("GET", "/private-leaderboards/p1", jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" }));
    addRoute(/standings\?period=year/, jsonRes([{ userId: "u1", username: "Alice", points: 10, rank: 1 }]));
    addRoute(/standings\?period=month/, jsonRes([{ userId: "u1", username: "Alice", points: 7, rank: 1 }]));

    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /private/i }));
    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));
    await userEvent.click(screen.getByRole("button", { name: /yearly/i }));
    await userEvent.click(screen.getByRole("button", { name: /monthly/i }));

    expect(await screen.findByRole("heading", { name: /monthly/i })).toBeInTheDocument();

    const sevens = await screen.findAllByText(/7/);
    expect(sevens.length).toBeGreaterThan(0);
  });

  it("shows invite code and copies it", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute("GET", "/private-leaderboards/p1/members", jsonRes([{ userId: "u1" }]));
    addRoute("GET", "/private-leaderboards/p1", jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" }));
    addRoute(/standings\?period=year/, jsonRes([{ userId: "u1", username: "Alice", points: 10, rank: 1 }]));

    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /private/i }));
    await userEvent.click(await screen.findByRole("button", { name: /view details/i }));

    expect(await screen.findByText(/invite code/i)).toBeInTheDocument();
    expect(await screen.findByText(/inv-123/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("INV-123");
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it("refreshes correctly", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
  });

  it("Join flow works", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /^join$/i }));
    expect(await screen.findByRole("heading", { level: 3, name: /join a leaderboard/i })).toBeInTheDocument();
  });

  it("Create flow works", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    render(<Leaderboard />);
    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByRole("heading", { level: 3, name: /create a leaderboard/i })).toBeInTheDocument();
  });

  it("shows Unauthorized toast", async () => {
    const toast = (await import("react-hot-toast")).default;
    addRoute("GET", "/leaderboard?id=12345", () => new Response("Unauthorized", { status: 401 }));
    render(<Leaderboard />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
