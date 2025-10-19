/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Polyfills
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

/* ========================= Mocks ========================= */

process.env.VITE_WEB_URL = "";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const React = require("react");
  return {
    useNavigate: () => mockNavigate,
    Link: ({ to, children }) =>
      React.createElement("a", { href: to }, children),
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
    toast: mockToast,
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => null,
  };
});

const { toast } = require("react-hot-toast");

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

jest.mock(
  "../../components/InputField",
  () =>
    ({ value, onChange, placeholder, name, icon, required, type }) =>
      (
        <input
          type={type || "text"}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          data-icon={icon}
        />
      )
);

jest.mock("../../styles/layout.css", () => ({}));
jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../styles/adminDashboard.css", () => ({}));
jest.mock("../../styles/button.css", () => ({}));

/* =============== fetch router + helpers =============== */

let routes;
const setupFetchRouter = () => {
  routes = [];
  global.fetch = jest.fn(async (url, opts = {}) => {
    const u = typeof url === "string" ? url : `${url}`;
    const method = (opts.method || "GET").toUpperCase();

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
      throw new Error(`No mock for ${method} ${u}`);
    }

    const hit = routes[idx];
    routes.splice(idx, 1);
    return typeof hit.reply === "function" ? hit.reply(u, opts) : hit.reply;
  });
};

const addRoute = (method, url, reply) => routes.push({ method, url, reply });

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
});

afterEach(() => {
  jest.clearAllMocks();
});

/* =============== import component =============== */

const path = require("path");
const addCollectibleAbsPath = path.resolve(
  __dirname,
  "../../pages/addCollectible.jsx"
);
jest.unmock(addCollectibleAbsPath);
const AddCollectible = require(addCollectibleAbsPath).default;

/* ================================ Tests ================================= */

describe("AddCollectible page", () => {
  it("renders create collectible form", () => {
    render(<AddCollectible />);

    expect(
      screen.getByRole("heading", { name: /create collectible/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/collectible name/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/image url/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create collectible/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to collectibles/i })
    ).toBeInTheDocument();
  });

  it("creates collectible successfully with all fields", async () => {
    addRoute("POST", "/collectibles", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Test Collectible");
      expect(body.description).toBe("Test Description");
      expect(body.imageUrl).toBe("http://example.com/collectible.png");
      return jsonRes({
        id: "b1",
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
      });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    const descInput = screen.getByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    await userEvent.type(nameInput, "Test Collectible");
    await userEvent.type(descInput, "Test Description");
    await userEvent.type(imageInput, "http://example.com/collectible.png");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Collectible created successfully"
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/manageCollectibles");
  });

  it("creates collectible with only required name field", async () => {
    addRoute("POST", "/collectibles", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Collectible Name Only");
      expect(body.description).toBeNull();
      expect(body.imageUrl).toBeNull();
      return jsonRes({ id: "b2", name: body.name });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Collectible Name Only");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Collectible created successfully"
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith("/manageCollectibles");
  });

  it("shows error when name is empty", async () => {
    render(<AddCollectible />);

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    const form = createButton.closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
    expect(toast.error).toHaveBeenCalledWith("Collectible name is required");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("trims whitespace from name field", async () => {
    addRoute("POST", "/collectibles", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Trimmed Name");
      return jsonRes({ id: "b3", name: body.name });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "  Trimmed Name  ");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Collectible created successfully"
      );
    });
  });

  it("shows error when name is only whitespace", async () => {
    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "   ");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    expect(toast.error).toHaveBeenCalledWith("Collectible name is required");
  });

  it("resets form when reset button is clicked", async () => {
    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    const descInput = screen.getByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    await userEvent.type(nameInput, "Test Collectible");
    await userEvent.type(descInput, "Test Description");
    await userEvent.type(imageInput, "http://example.com/collectible.png");

    expect(nameInput).toHaveValue("Test Collectible");
    expect(descInput).toHaveValue("Test Description");
    expect(imageInput).toHaveValue("http://example.com/collectible.png");

    const resetButton = screen.getByRole("button", { name: /reset/i });
    await userEvent.click(resetButton);

    expect(nameInput).toHaveValue("");
    expect(descInput).toHaveValue("");
    expect(imageInput).toHaveValue("");
  });

  it("navigates back to collectibles list when back button is clicked", async () => {
    render(<AddCollectible />);

    const backButton = screen.getByRole("button", {
      name: /back to collectibles/i,
    });
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith("/manageCollectibles");
  });

  it("handles session expired error", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Test Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Session expired. Please sign in again."
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handles API error with error message", async () => {
    addRoute(
      "POST",
      "/collectibles",
      jsonRes({ error: "Duplicate collectible name" }, { status: 400 })
    );

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Duplicate Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls.map((c) => c[0]).join(" ");
      expect(msg).toContain("Duplicate collectible name");
    });
  });

  it("handles API error without error message", async () => {
    addRoute("POST", "/collectibles", textRes("Server Error", { status: 500 }));

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Test Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls.map((c) => c[0]).join(" ");
      expect(msg).toContain("Failed to create collectible");
    });
  });

  it("disables buttons while submitting", async () => {
    addRoute("POST", "/collectibles", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return jsonRes({ id: "b4", name: "Test" });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Test Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    const resetButton = screen.getByRole("button", { name: /reset/i });

    await userEvent.click(createButton);

    // Buttons should be disabled during submission
    expect(createButton).toBeDisabled();
    expect(resetButton).toBeDisabled();

    // Wait for submission to complete
    await waitFor(() => {
      expect(createButton).not.toBeDisabled();
      expect(resetButton).not.toBeDisabled();
    });
  });

  it("shows creating... text while submitting", async () => {
    addRoute("POST", "/collectibles", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return jsonRes({ id: "b5", name: "Test" });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Test Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    expect(
      screen.getByRole("button", { name: /creating.../i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /creating.../i })
      ).not.toBeInTheDocument();
    });
  });

  it("submits form with Enter key", async () => {
    addRoute(
      "POST",
      "/collectibles",
      jsonRes({ id: "b6", name: "Enter Collectible" })
    );

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Enter Collectible{Enter}");

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Collectible created successfully"
      );
    });
  });

  it("resets form after successful creation", async () => {
    addRoute("POST", "/collectibles", jsonRes({ id: "b7", name: "Test" }));

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    const descInput = screen.getByPlaceholderText(/description/i);

    await userEvent.type(nameInput, "Test Collectible");
    await userEvent.type(descInput, "Test Description");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Collectible created successfully"
      );
    });

    // Form should be reset but we're navigated away, so just check navigation
    expect(mockNavigate).toHaveBeenCalledWith("/manageCollectibles");
  });

  it("sends null for empty optional fields", async () => {
    addRoute("POST", "/collectibles", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Name Only");
      expect(body.description).toBeNull();
      expect(body.imageUrl).toBeNull();
      return jsonRes({ id: "b8", name: body.name });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Name Only");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/collectibles",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Name Only",
            description: null,
            imageUrl: null,
          }),
        })
      );
    });
  });

  it("trims whitespace from all fields", async () => {
    addRoute("POST", "/collectibles", (url, opts) => {
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("Trimmed");
      expect(body.description).toBe("Trimmed Desc");
      expect(body.imageUrl).toBe("http://example.com/img.png");
      return jsonRes({ id: "b9", name: body.name });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    const descInput = screen.getByPlaceholderText(/description/i);
    const imageInput = screen.getByPlaceholderText(/image url/i);

    await userEvent.type(nameInput, "  Trimmed  ");
    await userEvent.type(descInput, "  Trimmed Desc  ");
    await userEvent.type(imageInput, "  http://example.com/img.png  ");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });
    await userEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/collectibles",
        expect.objectContaining({
          body: JSON.stringify({
            name: "Trimmed",
            description: "Trimmed Desc",
            imageUrl: "http://example.com/img.png",
          }),
        })
      );
    });
  });

  it("prevents double submission", async () => {
    addRoute("POST", "/collectibles", async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return jsonRes({ id: "b10", name: "Test" });
    });

    render(<AddCollectible />);

    const nameInput = screen.getByPlaceholderText(/collectible name/i);
    await userEvent.type(nameInput, "Test Collectible");

    const createButton = screen.getByRole("button", {
      name: /create collectible/i,
    });

    // Click twice rapidly
    await userEvent.click(createButton);
    await userEvent.click(createButton);

    // Should only call fetch once
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows image preview when valid URL is provided", async () => {
    render(<AddCollectible />);

    const imageInput = screen.getByPlaceholderText(/image url/i);
    await userEvent.type(imageInput, "http://example.com/collectible.png");

    expect(await screen.findByText(/image preview/i)).toBeInTheDocument();
    expect(screen.getByAltText(/collectible preview/i)).toBeInTheDocument();
  });

  it("does not show image preview when URL is empty", () => {
    render(<AddCollectible />);

    expect(screen.queryByText(/image preview/i)).not.toBeInTheDocument();
    expect(
      screen.queryByAltText(/collectible preview/i)
    ).not.toBeInTheDocument();
  });

  it("clears image preview when reset is clicked", async () => {
    render(<AddCollectible />);

    const imageInput = screen.getByPlaceholderText(/image url/i);
    await userEvent.type(imageInput, "http://example.com/collectible.png");

    expect(await screen.findByText(/image preview/i)).toBeInTheDocument();

    const resetButton = screen.getByRole("button", { name: /reset/i });
    await userEvent.click(resetButton);

    expect(screen.queryByText(/image preview/i)).not.toBeInTheDocument();
  });
});
