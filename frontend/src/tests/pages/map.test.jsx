/** @jest-environment jsdom */

import React from "react";
import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// env default
process.env.VITE_WEB_URL = process.env.VITE_WEB_URL || "http://test.local";

// Polyfill
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
  text: async () =>
    typeof body === "string" ? body : JSON.stringify(body),
});

/* ========================= Mocks ========================= */

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
    success: mockToast.success,
    error: mockToast.error,
    loading: mockToast.loading,
    dismiss: mockToast.dismiss,
    Toaster: () => null,
  };
});

let __lastMap = null;
const setLastMap = (m) => (__lastMap = m);
export const getLastMap = () => __lastMap;

jest.mock("@react-google-maps/api", () => {
  const React = require("react");
  const { useEffect } = React;

  let useLoadScriptState = { isLoaded: true, loadError: null };

  const GoogleMap = ({ children, onLoad }) => {
    const mapObj = { fitBounds: jest.fn() };
    useEffect(() => {
      if (!global.window.google) {
        global.window.google = {
          maps: {
            LatLngBounds: function (sw, ne) {
              this.sw = sw;
              this.ne = ne;
            },
          },
        };
      }
      setLastMap(mapObj);
      onLoad && onLoad(mapObj);
    }, []);
    return <div data-testid="google-map">{children}</div>;
  };

  const Marker = ({ title, onClick }) => (
    <button type="button" aria-label={title} onClick={onClick}>
      {title}
    </button>
  );

  const InfoWindow = ({ children, onCloseClick }) => (
    <div role="dialog" aria-label="info-window">
      <button onClick={onCloseClick}>Close</button>
      {children}
    </div>
  );

  return {
    GoogleMap,
    Marker,
    InfoWindow,
    useLoadScript: () => useLoadScriptState,
    __setUseLoadScriptState: (s) => {
      useLoadScriptState = s;
    },
  };
});

import { __setUseLoadScriptState as setMapLoadState } from "@react-google-maps/api";

const WEB_URL = process.env.VITE_WEB_URL || "http://test.local";
const isQuests = (url) => /\/quests(?:\?.*)?$/.test(String(url));
const isUserQuests = (url) => String(url).includes("/user-quests");
const matchLocId = (url) => /\/locations\/([^/?#]+)/.exec(String(url));
const matchLocQuery = (url) => /\/locations\?id=([^&]+)/.exec(String(url));

beforeEach(() => {
  jest.clearAllMocks();
  setMapLoadState({ isLoaded: true, loadError: null });
  global.fetch = jest.fn();
});

const questsPayload = [
  {
    id: "q1",
    name: "Great Hall",
    lat: -26.191,
    lng: 28.034,
    pointsAchievable: 100,
    isActive: true,
    createdAt: "2025-08-30T12:00:00.000Z",
    description: "Main ceremony area",
  },
  {
    id: "q2",
    name: "Library",
    location: { latitude: -26.193, longitude: 28.028 },
    points: 50,
    isActive: false,
    createdAt: "2025-08-29T10:00:00.000Z",
    description: "Quiet place to study",
    locationId: "loc-2",
  },
  {
    id: "q3",
    title: "Science Stadium",
    geo: { coordinates: [28.02, -26.2] },
    points: 25,
    isActive: true,
    createdAt: "2025-08-28T09:00:00.000Z",
  },
  {
    id: "q4",
    name: "Chamber of Mines",
    locationId: "loc-1",
    isActive: true,
  },
  {
    id: "q5",
    name: "Great Hall Annex",
    lat: -26.191,
    lng: 28.034,
    points: 10,
    isActive: true,
  },
];

const locationsById = {
  "loc-1": { lat: -26.195, lng: 28.041 },
};
const locationsFallback = {
  "loc-2": { data: [{ latitude: -26.198, longitude: 28.01 }] },
};

function mockHappyFetch() {
  global.fetch.mockImplementation((url) => {
    const s = String(url);
    if (isQuests(s)) return Promise.resolve(jsonResponse(questsPayload, 200));
    const locIdMatch = matchLocId(s);
    if (locIdMatch) {
      const id = decodeURIComponent(locIdMatch[1]);
      if (locationsById[id]) {
        return Promise.resolve(jsonResponse(locationsById[id], 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    }
    const qMatch = matchLocQuery(s);
    if (qMatch) {
      const id = decodeURIComponent(qMatch[1]);
      if (locationsFallback[id]) {
        return Promise.resolve(jsonResponse(locationsFallback[id], 200));
      }
      return Promise.resolve(jsonResponse("", 404));
    }
    return Promise.resolve(jsonResponse("", 404));
  });
}

jest.mock("../../styles/map.css", () => ({}));
jest.mock("../../components/IconButton", () => (props) => (
  <button {...props}>{props.label || "Button"}</button>
));

jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: { auth: { getSession: jest.fn() } },
}));

const path = require("path");
const mapAbsPath = path.resolve(__dirname, "../../pages/map.jsx");
jest.unmock(mapAbsPath);
const QuestMap = require(mapAbsPath).default;

/* ========================= Tests ========================= */

describe("QuestMap page", () => {
  it("shows Google Maps loading state when script not yet loaded", () => {
    setMapLoadState({ isLoaded: false, loadError: null });
    mockHappyFetch();
    render(<QuestMap />);
    expect(screen.getByText(/Loading map/i)).toBeInTheDocument();
    setMapLoadState({ isLoaded: true, loadError: null });
  });

  it("shows a friendly error if Google Maps script fails to load", () => {
    setMapLoadState({ isLoaded: false, loadError: new Error("boom") });
    mockHappyFetch();
    render(<QuestMap />);
    expect(
      screen.getByText(/Failed to load Google Maps./i)
    ).toBeInTheDocument();
    setMapLoadState({ isLoaded: true, loadError: null });
  });

  it("fetches quests, resolves locations, renders markers, and opens InfoWindow", async () => {
    mockHappyFetch();
    render(<QuestMap />);
    expect(await screen.findByText(/Quests Map/i)).toBeInTheDocument();

    const m1 = await screen.findByRole("button", { name: /^Great Hall$/i });
    expect(m1).toBeInTheDocument();

    await userEvent.click(m1);
    const info = await screen.findByRole("dialog", { name: /info-window/i });
    expect(within(info).getByText(/Great Hall/i)).toBeInTheDocument();
    expect(within(info).getByText(/Main ceremony area/i)).toBeInTheDocument();
    expect(within(info).getByText(/Points:\s*100/i)).toBeInTheDocument();

    const mapRef = getLastMap();
    expect(mapRef).toBeTruthy();
    expect(mapRef.fitBounds).toHaveBeenCalledTimes(1);
  });

  it("shows a toast error when /quests returns an error", async () => {
    global.fetch.mockResolvedValueOnce(jsonResponse("", 500));
    const toast = (await import("react-hot-toast")).default;
    render(<QuestMap />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("HTTP 500");
    });
  });

  it("refresh button re-fetches and updates counts", async () => {
    mockHappyFetch();
    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /refresh/i })
      ).not.toBeDisabled();
    });

    global.fetch.mockImplementationOnce((url) => {
      if (isQuests(url)) {
        return Promise.resolve(
          jsonResponse(
            [
              { id: "qa", name: "FNB Stadium", lat: -26.234, lng: 27.982 },
              {
                id: "qb",
                name: "Origins Centre",
                location: { latitude: -26.1905, longitude: 28.0325 },
              },
            ],
            200
          )
        );
      }
      return Promise.resolve(jsonResponse("", 404));
    });

    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /refresh/i })
      ).not.toBeDisabled();
    });

    expect(
      await screen.findByRole("button", { name: /^FNB Stadium$/i })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /^Origins Centre$/i })
    ).toBeInTheDocument();
  });

  it("prompts login when adding a quest without session", async () => {
    mockHappyFetch();
    const supabase = require("../../supabase/supabaseClient").default;
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);

    const marker = await screen.findByRole("button", { name: /^Great Hall$/i });
    await userEvent.click(marker);
    await userEvent.click(
      await screen.findByRole("button", { name: /Add to my Quests/i })
    );

    const modal = await screen.findByRole("dialog", { name: /Login Required/i });
    expect(modal).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: /Continue Browsing/i })
    );
    expect(
      screen.queryByRole("dialog", { name: /Login Required/i })
    ).not.toBeInTheDocument();
  });

  it("navigates to login when choosing Go to Login in modal", async () => {
    mockHappyFetch();
    const supabase = require("../../supabase/supabaseClient").default;
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);

    const marker = await screen.findByRole("button", { name: /^Great Hall$/i });
    await userEvent.click(marker);
    await userEvent.click(
      await screen.findByRole("button", { name: /Add to my Quests/i })
    );

    await screen.findByRole("dialog", { name: /Login Required/i });
    await userEvent.click(
      screen.getByRole("button", { name: /Go to Login/i })
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("handles 409 conflict when adding a quest", async () => {
    const supabase = require("../../supabase/supabaseClient").default;
    supabase.auth.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
    });

    const toast = (await import("react-hot-toast")).default;
    toast.loading.mockReturnValue("tid-1");

    global.fetch.mockImplementation((url, opts) => {
      const s = String(url);

      // initial quests load
      if (isQuests(s)) {
        return Promise.resolve(jsonResponse(questsPayload, 200));
      }

      // user-quests GET (empty list)
      if (isUserQuests(s) && (!opts || opts.method === "GET")) {
        return Promise.resolve(jsonResponse([], 200));
      }

      // user-quests POST → conflict
      if (isUserQuests(s) && opts?.method === "POST") {
        return Promise.resolve(
          new Response(JSON.stringify({ message: "dup" }), {
            status: 409,
            headers: { "Content-Type": "application/json" },
          })
        );
      }

      return Promise.resolve(jsonResponse("", 404));
    });

    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);

    const marker = await screen.findByRole("button", { name: /^Great Hall$/i });
    await userEvent.click(marker);

    const addBtn = await screen.findByRole("button", { name: /Add to my Quests/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "This quest is already in your list.",
        { id: "tid-1" }
      );
    });
  });


  it("shows error when location lookup fails", async () => {
    global.fetch.mockImplementation((url) => {
      if (isQuests(url)) {
        return Promise.resolve(
          jsonResponse(
            [{ id: "x", name: "Nowhere Quest", locationId: "does-not-exist" }],
            200
          )
        );
      }
      return Promise.resolve(jsonResponse("", 404));
    });
    const toast = (await import("react-hot-toast")).default;
    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Could not load location does-not-exist"
      );
    });
  });
});
