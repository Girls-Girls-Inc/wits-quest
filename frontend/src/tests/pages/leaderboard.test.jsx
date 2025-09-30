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

jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));

jest.mock("../../styles/login-signup.css", () => ({}));
jest.mock("../../index.css", () => ({}));
jest.mock("../../styles/leaderboard.css", () => ({}));
jest.mock("../../styles/quests.css", () => ({}));

/* =============== fetch router + helpers =============== */

// IMPORTANT: API_BASE is "" under Jest → requests are "/leaderboard?...".
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
  text: async () => JSON.stringify(obj),
});
const textRes = (txt, { status = 200, headers = {} } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k] ?? null },
  text: async () => txt,
});

/* =============== envs & globals =============== */

beforeEach(() => {
  setupFetchRouter();
  localStorage.clear();
  localStorage.setItem(
    "supabase.auth.token",
    JSON.stringify({ access_token: "tok-xyz" })
  );
  global.loadingToast = "tid-1";
});

beforeAll(() => {
  Object.assign(navigator, {
    clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

/* =============== import component =============== */

const path = require("path");
const leaderboardAbsPath = path.resolve(
  __dirname,
  "../../pages/leaderboard.jsx"
);
jest.unmock(leaderboardAbsPath);
const Leaderboard = require(leaderboardAbsPath).default;

/* =============== small helpers =============== */

const getDropdownToggleByLabel = (labelRe) =>
  screen
    .getAllByRole("button", { name: labelRe })
    .find((el) => el.classList.contains("dropdown-toggle"));

const openDropdownAndChoose = async (toggleButton, optionRegex) => {
  await userEvent.click(toggleButton);
  const item = await screen.findByRole("button", { name: optionRegex });
  await userEvent.click(item);
};

/* ================================ Tests ================================= */

describe("Leaderboard page", () => {
  it("loads the public yearly board on mount and displays rows", async () => {
    let hits = 0;
    addRoute("GET", "/leaderboard?id=12345", () => {
      hits += 1;
      return hits === 1
        ? jsonRes([{ id: "u1", username: "Alice", points: 1 }]) // first load
        : jsonRes([{ id: "u2", username: "Bob", points: 2 }]); // after refresh
    });

    render(<Leaderboard />);

    expect(
      screen.getByRole("heading", { level: 1, name: /leaderboard/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /yearly/i })
    ).toBeInTheDocument();

    expect(await screen.findByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("switches to Private scope, lists private leaderboards, and opens details", async () => {
    let hits = 0;
    addRoute("GET", "/leaderboard?id=12345", () => {
      hits += 1;
      return hits === 1
        ? jsonRes([{ id: "u1", username: "Alice", points: 1 }])
        : jsonRes([{ id: "u2", username: "Bob", points: 2 }]);
    });

    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute(
      "GET",
      "/private-leaderboards/p1/members",
      jsonRes([{ userId: "u1" }, { userId: "u2" }])
    );

    addRoute(
      "GET",
      "/private-leaderboards/p1",
      jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" })
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=year$/,
      jsonRes([
        { userId: "u1", username: "Alice", points: 10, rank: 1 },
        { userId: "u2", username: "Bob", points: 5, rank: 2 },
      ])
    );

    render(<Leaderboard />);

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);

    expect(
      await screen.findByRole("heading", { level: 1, name: /private leaderboards/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /club a/i })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /view details/i }));
    expect(
      await screen.findByRole("heading", { level: 1, name: /club a/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("changes period inside private details and reloads standings", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute(
      "GET",
      "/private-leaderboards/p1/members",
      jsonRes([{ userId: "u1" }])
    );
    addRoute(
      "GET",
      "/private-leaderboards/p1",
      jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" })
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 10, rank: 1 }])
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=month$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 7, rank: 1 }])
    );

    render(<Leaderboard />);

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));

    const periodToggle = getDropdownToggleByLabel(/yearly/i);
    await openDropdownAndChoose(periodToggle, /monthly/i);

    expect(
      screen.getByRole("heading", { level: 2, name: /monthly/i })
    ).toBeInTheDocument();
    expect(await screen.findByText("7")).toBeInTheDocument();
  });

  it("shows invite code and copies it to clipboard", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute(
      "GET",
      "/private-leaderboards/p1/members",
      jsonRes([{ userId: "u1" }])
    );
    addRoute(
      "GET",
      "/private-leaderboards/p1",
      jsonRes({ id: "p1", name: "Club A", inviteCode: "INV-123" })
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 10, rank: 1 }])
    );

    render(<Leaderboard />);

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));

    await userEvent.click(screen.getByRole("button", { name: /show code/i }));
    expect(await screen.findByText(/invite code/i)).toBeInTheDocument();
    expect(screen.getByText("INV-123")).toBeInTheDocument();

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("INV-123");
    });
    expect(toast.success).toHaveBeenCalledWith("Invite code copied to clipboard");
  });

  it("Refresh calls correct loader depending on view (public vs. private detail)", async () => {
    // public load then refresh
    addRoute(
      "GET",
      "/leaderboard?id=12345",
      jsonRes([{ id: "u1", username: "Alice", points: 1 }])
    );
    addRoute(
      "GET",
      "/leaderboard?id=12345",
      jsonRes([{ id: "u2", username: "Bob", points: 2 }])
    );

    // private list + details + standings twice
    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p1", name: "Club A" }]));
    addRoute("GET", "/private-leaderboards/p1/members", jsonRes([{ userId: "u1" }]));
    addRoute("GET", "/private-leaderboards/p1", jsonRes({ id: "p1", name: "Club A", inviteCode: "INV" }));
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 10, rank: 1 }])
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p1\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 11, rank: 1 }])
    );

    render(<Leaderboard />);

    // public refresh
    await userEvent.click(
      await screen.findByRole("button", { name: /refresh/i })
    );
    expect(await screen.findByText("Bob")).toBeInTheDocument();

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);
    await userEvent.click(screen.getByRole("button", { name: /view details/i }));

    await userEvent.click(
      await screen.findByRole("button", { name: /refresh/i })
    );
    expect(await screen.findByText("11")).toBeInTheDocument();
  });

  it("Join flow: opens modal, posts code, reloads list, then opens details", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([]));

    addRoute("POST", "/private-leaderboards/join", (url, opts) => {
      const body = JSON.parse(opts.body);
      if (body.code !== "CODE-123")
        return jsonRes({ error: "bad code" }, { status: 400 });
      return jsonRes({ member: { leaderboardId: "p2" } });
    });

    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p2", name: "New Club" }]));
    addRoute("GET", "/private-leaderboards/p2/members", jsonRes([{ userId: "u1" }]));

    addRoute(
      "GET",
      "/private-leaderboards/p2",
      jsonRes({ id: "p2", name: "New Club", inviteCode: "NEW" })
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p2\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 1, rank: 1 }])
    );

    render(<Leaderboard />);

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);

    await userEvent.click(screen.getByRole("button", { name: /^join$/i }));
    const input = await screen.findByPlaceholderText(/paste invite code/i);
    await userEvent.type(input, "CODE-123");
    const btns = screen.getAllByRole("button", { name: /^join$/i });
    await userEvent.click(btns[btns.length - 1]);

    expect(
      await screen.findByRole("heading", { level: 1, name: /new club/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("Create flow: opens modal, posts name, reloads list, then opens details", async () => {
    addRoute("GET", "/leaderboard?id=12345", jsonRes([]));
    addRoute("GET", "/private-leaderboards", jsonRes([]));

    addRoute("POST", "/private-leaderboards", (url, opts) => {
      const body = JSON.parse(opts.body);
      if (!body.name)
        return jsonRes({ error: "name required" }, { status: 400 });
      return jsonRes({ id: "p3", name: body.name });
    });

    addRoute("GET", "/private-leaderboards", jsonRes([{ id: "p3", name: "Fresh Club" }]));
    addRoute("GET", "/private-leaderboards/p3/members", jsonRes([{ userId: "u1" }]));
    addRoute(
      "GET",
      "/private-leaderboards/p3",
      jsonRes({ id: "p3", name: "Fresh Club", inviteCode: "FRESH" })
    );
    addRoute(
      "GET",
      /\/private-leaderboards\/p3\/standings\?period=year$/,
      jsonRes([{ userId: "u1", username: "Alice", points: 2, rank: 1 }])
    );

    render(<Leaderboard />);

    const scopeToggle = getDropdownToggleByLabel(/public/i);
    await openDropdownAndChoose(scopeToggle, /private/i);

    await userEvent.click(screen.getByRole("button", { name: /^create$/i }));
    const nameInput = await screen.findByPlaceholderText(/leaderboard name/i);
    await userEvent.type(nameInput, "Fresh Club");
    const createBtns = screen.getAllByRole("button", { name: /^create$/i });
    await userEvent.click(createBtns[createBtns.length - 1]);

    expect(
      await screen.findByRole("heading", { level: 1, name: /fresh club/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("shows Unauthorized toast when public load returns 401", async () => {
    const toast = (await import("react-hot-toast")).default;

    addRoute(
      "GET",
      "/leaderboard?id=12345",
      textRes(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })
    );

    render(<Leaderboard />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
      const msg = toast.error.mock.calls
        .map((c) => c[0])
        .join(" ")
        .toLowerCase();
      expect(msg).toContain("unauthorized");
    });
  });
});

