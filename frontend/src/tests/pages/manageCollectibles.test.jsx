/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

// Mock environment variable BEFORE importing the component
process.env.VITE_WEB_URL = "";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) => React.createElement("a", { href: to }, children),
  };
});

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

const mockGetSession = jest.fn();
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));

jest.mock("../../components/InputField", () => ({ value, onChange, placeholder, name, icon, required, type }) => (
  <input
    type={type || "text"}
    name={name}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    required={required}
    data-icon={icon}
  />
));

jest.mock("../../styles/quests.css", () => ({}));
jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));
jest.mock("../../styles/profile.css", () => ({}));

/* =============== fetch router + helpers =============== */

let routes;
const setupFetchRouter = () => {
  routes = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    const u = typeof url === "string" ? url : `${url}`;
    const method = (opts.method || "GET").toUpperCase();

    console.log(`[FETCH] ${method} ${u}`); // Debug log

    const idx = routes.findIndex((r) => {
      const mOk = !r.method || r.method === method;
      const uOk =
        typeof r.url === "string"
          ? r.url === u
          : r.url instanceof RegExp
          ? r.url.test(u)
          : false;
      return mOk && uOk;
    });

    if (idx === -1) {
      console.error(`[FETCH ERROR] No mock for ${method} ${u}`);
      throw new Error(`No mock for ${method} ${u}`);
    }

    const hit = routes[idx];
    routes.splice(idx, 1);
    const response = typeof hit.reply === "function" ? hit.reply(u, opts) : hit.reply;
    console.log(`[FETCH] Matched route, returning:`, response);
    return response;
  });
};

const addRoute = (method, url, reply) => {
  console.log(`[ADD ROUTE] ${method} ${url}`);
  routes.push({ method, url, reply });
};

const jsonRes = (obj, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: {
    get: (k) =>
      k.toLowerCase() === "content-type"
        ? headers["content-type"] || "application/json"
        : null,
  },
  json: async () => obj,
  text: async () => JSON.stringify(obj),
});

const textRes = (txt, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? null },
  text: async () => txt,
  json: async () => {
    try {
      return JSON.parse(txt);
    } catch {
      throw new Error("Invalid JSON");
    }
  },
});

/* =============== envs & globals =============== */

beforeEach(() => {
  setupFetchRouter();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "tok-xyz" } },
  });
  global.confirm = jest.fn(() => true);
  console.log("[BEFORE EACH] Test setup complete");
});

afterEach(() => {
  jest.clearAllMocks();
});

/* =============== import component =============== */

const path = require("path");
const manageCollectiblesAbsPath = path.resolve(
  __dirname,
  "../../pages/manageCollectibles.jsx"
);
jest.unmock(manageCollectiblesAbsPath);
const ManageBadges = require(manageCollectiblesAbsPath).default;

/* ================================ Tests ================================= */

describe("ManageBadges page", () => {
  it("loads badges on mount and displays them", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
      { id: "b2", name: "Badge 2", description: null, imageUrl: null, createdAt: "2024-01-02T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    expect(
      screen.getByRole("heading", { level: 1, name: /manage badges/i })
    ).toBeInTheDocument();

    // Wait a bit and then log the DOM
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log("[TEST] Current DOM:", document.body.innerHTML);

    expect(await screen.findByText("Badge 1", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText("First badge")).toBeInTheDocument();
    expect(screen.getByText("Badge 2")).toBeInTheDocument();
  });

  it("shows error toast when loading badges fails", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute(
      "GET",
      "/collectibles",
      textRes("Failed to fetch badges", { status: 500 })
    );

    render(<ManageBadges />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("opens edit modal when Edit button is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(await screen.findByPlaceholderText(/badge name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/image url/i)).toBeInTheDocument();
  });

  it("updates badge successfully", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", (url, opts) => {
      const body = JSON.parse(opts.body);
      return jsonRes({
        id: "b1",
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        createdAt: "2024-01-01T00:00:00Z",
      });
    });

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByPlaceholderText(/badge name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Badge");

    const saveButton = screen.getByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Badge updated", expect.any(Object));
    });

    expect(await screen.findByText("Updated Badge")).toBeInTheDocument();
  });

  it("shows error when saving badge without name", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByPlaceholderText(/badge name/i);
    await userEvent.clear(nameInput);

    const saveButton = screen.getByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    expect(toast.error).toHaveBeenCalledWith("Badge name is required");
  });

  it("handles update error with error message", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", jsonRes(
      { error: "Update failed" },
      { status: 400 }
    ));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const saveButton = await screen.findByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls
        .map((c) => c[0])
        .join(" ");
      expect(msg).toContain("Update failed");
    });
  });

  it("deletes badge successfully after confirmation", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
      { id: "b2", name: "Badge 2", description: null, imageUrl: null, createdAt: "2024-01-02T00:00:00Z" },
    ]));

    addRoute("DELETE", "/collectibles/b1", jsonRes({}, { status: 200 }));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Badge deleted", expect.any(Object));
    });

    expect(screen.queryByText("Badge 1")).not.toBeInTheDocument();
    expect(screen.getByText("Badge 2")).toBeInTheDocument();
  });

  it("does not delete badge when confirmation is cancelled", async () => {
    global.confirm = jest.fn(() => false);

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    expect(screen.getByText("Badge 1")).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/collectibles/b1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("handles delete error", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("DELETE", "/collectibles/b1", textRes("Failed to delete", { status: 500 }));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls
        .map((c) => c[0])
        .join(" ");
      expect(msg).toContain("Failed to delete");
    });

    expect(screen.getByText("Badge 1")).toBeInTheDocument();
  });

  it("closes edit modal when cancel is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(await screen.findByPlaceholderText(/badge name/i)).toBeInTheDocument();

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/badge name/i)).not.toBeInTheDocument();
    });
  });

  it("closes edit modal when X button is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(await screen.findByPlaceholderText(/badge name/i)).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: /close modal/i });
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/badge name/i)).not.toBeInTheDocument();
    });
  });

  it("refreshes badge list when Refresh button is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
      { id: "b2", name: "Badge 2", description: null, imageUrl: null, createdAt: "2024-01-02T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });
    expect(screen.queryByText("Badge 2")).not.toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    await userEvent.click(refreshButton);

    expect(await screen.findByText("Badge 2")).toBeInTheDocument();
  });

  it("navigates to addBadge page when New Badge button is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([]));

    render(<ManageBadges />);

    const newBadgeButton = await screen.findByRole("button", { name: /new badge/i });
    await userEvent.click(newBadgeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/addBadge");
  });

  it("navigates to adminDashboard when Back button is clicked", async () => {
    addRoute("GET", "/collectibles", jsonRes([]));

    render(<ManageBadges />);

    const backButton = await screen.findByRole("button", { name: /back to admin/i });
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/adminDashboard");
  });

  it("handles session expired error", async () => {
    const toast = (await import("react-hot-toast")).default;

    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<ManageBadges />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls
        .map((c) => c[0])
        .join(" ");
      expect(msg).toContain("Session expired");
    });
  });

  it("displays empty list when no badges exist", async () => {
    addRoute("GET", "/collectibles", jsonRes([]));

    render(<ManageBadges />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /manage badges/i })
    ).toBeInTheDocument();

    const badges = screen.queryAllByRole("heading", { level: 2 });
    expect(badges.length).toBe(0);
  });

  it("handles non-array response from collectibles endpoint", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes({ error: "Invalid response" }));

    render(<ManageBadges />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it("updates form fields correctly", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByPlaceholderText(/badge name/i);
    const descInput = screen.getByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    expect(nameInput).toHaveValue("Badge 1");
    expect(descInput).toHaveValue("First badge");
    expect(imageInput).toHaveValue("http://example.com/b1.png");

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "New Name");
    expect(nameInput).toHaveValue("New Name");

    await userEvent.clear(descInput);
    await userEvent.type(descInput, "New Description");
    expect(descInput).toHaveValue("New Description");

    await userEvent.clear(imageInput);
    await userEvent.type(imageInput, "http://example.com/new.png");
    expect(nameInput).toHaveValue("http://example.com/new.png");
  });

  it("submits form with Enter key", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", (url, opts) => {
      const body = JSON.parse(opts.body);
      return jsonRes({
        id: "b1",
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        createdAt: "2024-01-01T00:00:00Z",
      });
    });

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByPlaceholderText(/badge name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Enter Badge{Enter}");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Badge updated", expect.any(Object));
    });
  });

  it("closes edit modal and resets form after successful delete", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("DELETE", "/collectibles/b1", jsonRes({}, { status: 200 }));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    expect(await screen.findByPlaceholderText(/badge name/i)).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Badge deleted", expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/badge name/i)).not.toBeInTheDocument();
    });
  });

  it("handles 401 error when updating badge", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", jsonRes(
      { error: "Session expired. Please sign in again." },
      { status: 401 }
    ));

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const saveButton = await screen.findByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls
        .map((c) => c[0])
        .join(" ");
      expect(msg).toContain("Session expired");
    });
  });

  it("trims whitespace from form inputs before saving", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Trimmed Name");
      expect(body.description).toBe("Trimmed Description");
      expect(body.imageUrl).toBe("http://example.com/trimmed.png");
      return jsonRes({
        id: "b1",
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        createdAt: "2024-01-01T00:00:00Z",
      });
    });

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const nameInput = await screen.findByPlaceholderText(/badge name/i);
    const descInput = screen.getByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "  Trimmed Name  ");

    await userEvent.clear(descInput);
    await userEvent.type(descInput, "  Trimmed Description  ");

    await userEvent.clear(imageInput);
    await userEvent.type(imageInput, "  http://example.com/trimmed.png  ");

    const saveButton = screen.getByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/collectibles/b1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Trimmed Name",
            description: "Trimmed Description",
            imageUrl: "http://example.com/trimmed.png",
          }),
        })
      );
    });
  });

  it("sends null for empty description and imageUrl", async () => {
    addRoute("GET", "/collectibles", jsonRes([
      { id: "b1", name: "Badge 1", description: "First badge", imageUrl: "http://example.com/b1.png", createdAt: "2024-01-01T00:00:00Z" },
    ]));

    addRoute("PATCH", "/collectibles/b1", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.description).toBeNull();
      expect(body.imageUrl).toBeNull();
      return jsonRes({
        id: "b1",
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        createdAt: "2024-01-01T00:00:00Z",
      });
    });

    render(<ManageBadges />);

    await screen.findByText("Badge 1", {}, { timeout: 3000 });

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    const descInput = await screen.findByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    await userEvent.clear(descInput);
    await userEvent.clear(imageInput);

    const saveButton = screen.getByRole("button", { name: /save badge/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/collectibles/b1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            name: "Badge 1",
            description: null,
            imageUrl: null,
          }),
        })
      );
    });
  });
});
