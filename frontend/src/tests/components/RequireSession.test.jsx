/** @jest-environment jsdom */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, act } from "@testing-library/react";

/* ---------------- Router stubs ---------------- */
const mockNavigate = jest.fn();
let navigateProps = null;

jest.mock("react-router-dom", () => {
  const React = require("react");
  const Navigate = (props) => {
    navigateProps = props;
    return React.createElement("div", { "data-testid": "navigate" });
  };
  return {
    Link: ({ to, children, ...rest }) =>
      React.createElement("a", { href: to, ...rest }, children),
    useLocation: () => ({ pathname: "/dashboard" }),
    useNavigate: () => mockNavigate,
    Navigate,
  };
});

/* ---------------- Supabase mock (all in-factory; exports __mock helpers) ---------------- */
jest.mock("../../supabase/supabaseClient", () => {
  const mockGetSession = jest.fn();
  const mockOnAuthStateChange = jest.fn();

  const state = {
    handler: null,
    unsubscribe: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      auth: {
        getSession: (...args) => mockGetSession(...args),
        onAuthStateChange: (cb) => {
          state.handler = cb;
          mockOnAuthStateChange(cb);
          return { data: { subscription: { unsubscribe: state.unsubscribe } } };
        },
      },
    },
    __mock: { mockGetSession, mockOnAuthStateChange, state },
  };
});

/* import after mocks */
const supabaseModule = require("../../supabase/supabaseClient");
const RequireSession = require("../../components/RequireSession").default;

const { __mock } = supabaseModule;

beforeEach(() => {
  jest.clearAllMocks();
  navigateProps = null;
  __mock.state.handler = null;
  __mock.state.unsubscribe.mockReset();
});

const Protected = () => <div data-testid="protected">Protected content</div>;

describe("RequireSession", () => {
  it("renders nothing while session is undefined (initial mount)", async () => {
    let resolveSession;
    __mock.mockGetSession.mockReturnValue(
      new Promise((res) => {
        resolveSession = res;
      })
    );

    const { container } = render(
      <RequireSession>
        <Protected />
      </RequireSession>
    );

    // until getSession resolves, it should render null
    expect(container.firstChild).toBeNull();

    await act(async () => {
      resolveSession({ data: { session: { user: { id: "u1" } } } });
    });

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("redirects to /login with state.from when unauthenticated", async () => {
    __mock.mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <RequireSession>
        <Protected />
      </RequireSession>
    );

    const nav = await screen.findByTestId("navigate");
    expect(nav).toBeInTheDocument();
    expect(navigateProps?.to).toBe("/login");
    expect(navigateProps?.replace).toBe(true);
    expect(navigateProps?.state?.from?.pathname).toBe("/dashboard");
  });

  it("renders children when authenticated", async () => {
    __mock.mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: "u1" } } },
    });

    render(
      <RequireSession>
        <Protected />
      </RequireSession>
    );

    expect(await screen.findByTestId("protected")).toBeInTheDocument();
    expect(__mock.mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it("updates when onAuthStateChange provides a new session", async () => {
    // start unauthenticated → Navigate first
    __mock.mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    render(
      <RequireSession>
        <Protected />
      </RequireSession>
    );

    expect(await screen.findByTestId("navigate")).toBeInTheDocument();
    expect(typeof __mock.state.handler).toBe("function");

    await act(async () => {
      __mock.state.handler("SIGNED_IN", { user: { id: "u2" } });
    });

    expect(screen.getByTestId("protected")).toBeInTheDocument();
  });

  it("unsubscribes on unmount", async () => {
    __mock.mockGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: "u1" } } },
    });

    const { unmount } = render(
      <RequireSession>
        <Protected />
      </RequireSession>
    );

    expect(await screen.findByTestId("protected")).toBeInTheDocument();

    unmount();
    expect(__mock.state.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
