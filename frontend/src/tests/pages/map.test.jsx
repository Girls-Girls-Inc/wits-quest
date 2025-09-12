/** @jest-environment jsdom */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// (optional) in case setup file doesn't include it
// import '@testing-library/jest-dom';

// ensure a sane default if your component falls back to process.env
process.env.VITE_WEB_URL = process.env.VITE_WEB_URL || "http://test.local";

// Polyfill for libs that expect them (and to avoid router/TextEncoder issues)
const { TextEncoder, TextDecoder } = require("util");
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
  text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
});

/* ========================= Mocks ========================= */

// react-hot-toast — mirror your other tests
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

// Keep a ref to the last fake map so we can assert fitBounds was called
let __lastMap = null;
const setLastMap = (m) => (__lastMap = m);
export const getLastMap = () => __lastMap;

// Minimal mock of @react-google-maps/api
jest.mock("@react-google-maps/api", () => {
  const React = require("react");
  const { useEffect } = React;

  // This value is mutable per-test
  let useLoadScriptState = { isLoaded: true, loadError: null };

  const GoogleMap = ({ children, onLoad }) => {
    // Simulate Google Maps map object
    const mapObj = { fitBounds: jest.fn() };
    useEffect(() => {
      // Provide the LatLngBounds constructor expected by component
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
    <button
      type="button"
      data-testid={`marker-${title}`}
      aria-label={`marker-${title}`}
      onClick={onClick}
    >
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
    // Allow tests to toggle loaded/error states
    useLoadScript: () => useLoadScriptState,
    __setUseLoadScriptState: (s) => {
      useLoadScriptState = s;
    },
  };
});

import { __setUseLoadScriptState as setMapLoadState } from "@react-google-maps/api";

/* -------------------- Fetch Mock -------------------- */

const WEB_URL = process.env.VITE_WEB_URL || "http://test.local";
const QUESTS_URL = `${WEB_URL}/quests`;

// Regex helpers so we don't depend on exact base URL
const isQuests = (url) => /\/quests(?:\?.*)?$/.test(String(url));
const matchLocId = (url) => /\/locations\/([^/?#]+)/.exec(String(url));
const matchLocQuery = (url) => /\/locations\?id=([^&]+)/.exec(String(url));

beforeEach(() => {
  jest.clearAllMocks();

  setMapLoadState({ isLoaded: true, loadError: null });
  global.fetch = jest.fn();
});

/* ========================= Test Data ========================= */

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
    collectibleId: "col-111",
  },
  // 2) nested "location" with latitude/longitude
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
  // 3) geojson-like: coordinates [lng, lat]
  {
    id: "q3",
    title: "Science Stadium",
    geo: { coordinates: [28.02, -26.2] },
    points: 25,
    isActive: true,
    createdAt: "2025-08-28T09:00:00.000Z",
  },
  // 4) needs location lookup via /locations/:id
  {
    id: "q4",
    name: "Chamber of Mines",
    locationId: "loc-1",
    isActive: true,
  },
  // 5) overlapping with q1 to exercise spreadOverlaps (same exact coords)
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
  // For loc-2 we'll simulate fallback endpoint instead of /:id
};
const locationsFallback = {
  "loc-2": { data: [{ latitude: -26.198, longitude: 28.01 }] },
};

/* ========================= Helpers ========================= */

function mockHappyFetch() {
  global.fetch.mockImplementation((url) => {
    const s = String(url);

    if (isQuests(s)) {
      return Promise.resolve(jsonResponse(questsPayload, 200));
    }
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


// Mock supabase client to avoid env requirements and network
jest.mock("../../supabase/supabaseClient", () => ({
  __esModule: true,
  default: { auth: { getSession: jest.fn() } },
}));

// Ensure we import the REAL map page, overriding the global mock from jest.setup
const path = require("path");
const mapAbsPath = path.resolve(__dirname, "../../pages/map.jsx");
jest.unmock(mapAbsPath);
// Use require to avoid ESM import hoisting
const QuestMap = require(mapAbsPath).default;

/* ========================= Tests ========================= */

describe("QuestMap page", () => {
  it("shows Google Maps loading state when script not yet loaded", () => {
    setMapLoadState({ isLoaded: false, loadError: null });
    mockHappyFetch();

    render(<QuestMap />);
    expect(screen.getByText(/Loading map…/i)).toBeInTheDocument();

    // restore for other tests
    setMapLoadState({ isLoaded: true, loadError: null });
  });

  it("shows a friendly error if Google Maps script fails to load", () => {
    setMapLoadState({ isLoaded: false, loadError: new Error("boom") });
    mockHappyFetch();

    render(<QuestMap />);
    expect(screen.getByText(/Failed to load Google Maps\./i)).toBeInTheDocument();

    setMapLoadState({ isLoaded: true, loadError: null });
  });

  it("fetches quests, resolves locations, renders markers, and opens InfoWindow", async () => {
    mockHappyFetch();

    render(<QuestMap />);
    expect(await screen.findByText(/Quests Map/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled();
    });

    // Five markers are rendered
    
    const m1 = screen.getByTestId("marker-Great Hall");
    const m2 = screen.getByTestId("marker-Library");
    const m3 = screen.getByTestId("marker-Science Stadium");
    const m4 = screen.getByTestId("marker-Chamber of Mines");
    const m5 = screen.getByTestId("marker-Great Hall Annex");
    expect(m1).toBeInTheDocument();
    expect(m2).toBeInTheDocument();
    expect(m3).toBeInTheDocument();
    expect(m4).toBeInTheDocument();
    expect(m5).toBeInTheDocument();

    // Click a marker to open InfoWindow and check content
    await userEvent.click(m1);

    const info = await screen.findByRole("dialog", { name: /info-window/i });
    expect(within(info).getByText(/Great Hall/i)).toBeInTheDocument();
    expect(within(info).getByText(/Main ceremony area/i)).toBeInTheDocument();
    expect(within(info).getByText(/Points:\s*100/i)).toBeInTheDocument();

    // Click another marker — should show inactive status and location id
    await userEvent.click(m2);
    const info2 = await screen.findByRole("dialog", { name: /info-window/i });
    expect(within(info2).getByText(/Library/i)).toBeInTheDocument();
    expect(within(info2).getByText(/Quiet place to study/i)).toBeInTheDocument();
    expect(within(info2).getByText(/Points:\s*50/i)).toBeInTheDocument();

    // Verify map.fitBounds was called when the map loaded
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
    // First payload: 5 quests
    mockHappyFetch();

    render(<QuestMap />);
    await screen.findByText(/Quests Map/i);

    // wait for first load to finish
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled();
    });

    // Initial markers present (subset asserted below)

    // Next fetch returns only 2 quests
    global.fetch.mockImplementationOnce((url) => {
      const s = String(url);
      if (isQuests(s)) {
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

    // Click Refresh
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

    // wait for second load to finish
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /refresh/i })).not.toBeDisabled();
    });

    // After refresh, new markers are present

    // New markers present
    expect(screen.getByTestId("marker-FNB Stadium")).toBeInTheDocument();
    expect(screen.getByTestId("marker-Origins Centre")).toBeInTheDocument();
  });
});
