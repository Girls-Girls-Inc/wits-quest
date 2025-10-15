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

process.env.VITE_GOOGLE_MAPS_API_KEY = "test-api-key";

const mockUseLoadScript = jest.fn();
const mockGoogleMap = jest.fn(({ children, onClick }) => (
  <div 
    data-testid="google-map" 
    onClick={onClick}
  >
    {children}
  </div>
));
const mockMarker = jest.fn(({ position }) => (
  <div data-testid="marker" data-position={JSON.stringify(position)} />
));

jest.mock("@react-google-maps/api", () => ({
  useLoadScript: () => mockUseLoadScript(),
  GoogleMap: mockGoogleMap,
  Marker: mockMarker,
}));

/* =============== import component =============== */

const path = require("path");
const locationMapPickerAbsPath = path.resolve(
  __dirname,
  "../../components/LocationMapPicker.jsx"
);
jest.unmock(locationMapPickerAbsPath);
const LocationMapPicker = require(locationMapPickerAbsPath).default;

/* ================================ Tests ================================= */

describe("LocationMapPicker", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLoadScript.mockReturnValue({ isLoaded: true, loadError: null });
    process.env.VITE_GOOGLE_MAPS_API_KEY = "test-api-key";
  });

  describe("Rendering States", () => {
    it("renders map when API key is present and loaded", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId("google-map")).toBeInTheDocument();
    });

    it("shows error when API key is missing", () => {
      process.env.VITE_GOOGLE_MAPS_API_KEY = "";

      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/google maps api key missing/i)).toBeInTheDocument();
      expect(screen.queryByTestId("google-map")).not.toBeInTheDocument();
    });

    it("shows loading state when map is not loaded", () => {
      mockUseLoadScript.mockReturnValue({ isLoaded: false, loadError: null });

      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/loading map/i)).toBeInTheDocument();
      expect(screen.queryByTestId("google-map")).not.toBeInTheDocument();
    });

    it("shows error when map fails to load", () => {
      mockUseLoadScript.mockReturnValue({
        isLoaded: false,
        loadError: new Error("Failed to load"),
      });

      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/failed to load google maps/i)).toBeInTheDocument();
      expect(screen.queryByTestId("google-map")).not.toBeInTheDocument();
    });
  });

  describe("Marker Display", () => {
    it("displays marker when valid coordinates are provided", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      const marker = screen.getByTestId("marker");
      expect(marker).toBeInTheDocument();

      const position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBeCloseTo(-26.19);
      expect(position.lng).toBeCloseTo(28.03);
    });

    it("does not display marker when coordinates are null", () => {
      render(
        <LocationMapPicker
          latitude={null}
          longitude={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("does not display marker when coordinates are undefined", () => {
      render(
        <LocationMapPicker
          latitude={undefined}
          longitude={undefined}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("does not display marker when latitude is invalid", () => {
      render(
        <LocationMapPicker
          latitude="invalid"
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("does not display marker when longitude is invalid", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude="invalid"
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });
  });

  describe("Coordinate Input Handling", () => {
    it("accepts string coordinates and converts to numbers", () => {
      render(
        <LocationMapPicker
          latitude="-26.19"
          longitude="28.03"
          onChange={mockOnChange}
        />
      );

      const marker = screen.getByTestId("marker");
      const position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBeCloseTo(-26.19);
      expect(position.lng).toBeCloseTo(28.03);
    });

    it("accepts number coordinates", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      const marker = screen.getByTestId("marker");
      const position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBeCloseTo(-26.19);
      expect(position.lng).toBeCloseTo(28.03);
    });

    it("handles NaN coordinates gracefully", () => {
      render(
        <LocationMapPicker
          latitude={NaN}
          longitude={NaN}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("handles Infinity coordinates gracefully", () => {
      render(
        <LocationMapPicker
          latitude={Infinity}
          longitude={-Infinity}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("handles zero coordinates", () => {
      render(
        <LocationMapPicker
          latitude={0}
          longitude={0}
          onChange={mockOnChange}
        />
      );

      const marker = screen.getByTestId("marker");
      const position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBe(0);
      expect(position.lng).toBe(0);
    });
  });

  describe("Map Interaction", () => {
    it("calls onChange when map is clicked", async () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      const map = screen.getByTestId("google-map");

      // Simulate map click with mock event
      const mockEvent = {
        latLng: {
          lat: () => -26.20,
          lng: () => 28.04,
        },
      };

      await userEvent.click(map);

      // Manually call the onClick handler with mock event
      mockGoogleMap.mock.calls[0][0].onClick(mockEvent);

      expect(mockOnChange).toHaveBeenCalledWith({
        lat: -26.20,
        lng: 28.04,
      });
    });

    it("does not call onChange when disabled", async () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
          disabled={true}
        />
      );

      const map = screen.getByTestId("google-map");

      const mockEvent = {
        latLng: {
          lat: () => -26.20,
          lng: () => 28.04,
        },
      };

      mockGoogleMap.mock.calls[0][0].onClick(mockEvent);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("does not call onChange when event has invalid coordinates", async () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      const mockEvent = {
        latLng: {
          lat: () => NaN,
          lng: () => 28.04,
        },
      };

      mockGoogleMap.mock.calls[0][0].onClick(mockEvent);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("handles missing latLng in event", async () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      const mockEvent = {};

      mockGoogleMap.mock.calls[0][0].onClick(mockEvent);

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it("works without onChange callback", async () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
        />
      );

      const mockEvent = {
        latLng: {
          lat: () => -26.20,
          lng: () => 28.04,
        },
      };

      // Should not throw
      expect(() => {
        mockGoogleMap.mock.calls[0][0].onClick(mockEvent);
      }).not.toThrow();
    });
  });

  describe("Props Handling", () => {
    it("uses custom zoom level", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
          zoom={15}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 15 }),
        expect.any(Object)
      );
    });

    it("uses default zoom level when not specified", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 17 }),
        expect.any(Object)
      );
    });

    it("applies custom height", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
          height="400px"
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          mapContainerStyle: expect.objectContaining({ height: "400px" }),
        }),
        expect.any(Object)
      );
    });

    it("uses default height when not specified", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          mapContainerStyle: expect.objectContaining({ height: "260px" }),
        }),
        expect.any(Object)
      );
    });
  });

  describe("Map Options", () => {
    it("disables street view control", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ streetViewControl: false }),
        }),
        expect.any(Object)
      );
    });

    it("disables fullscreen control", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ fullscreenControl: false }),
        }),
        expect.any(Object)
      );
    });

    it("disables map type control", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({ mapTypeControl: false }),
        }),
        expect.any(Object)
      );
    });
  });

  describe("Coordinate Updates", () => {
    it("updates marker when coordinates change", () => {
      const { rerender } = render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      let marker = screen.getByTestId("marker");
      let position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBeCloseTo(-26.19);

      rerender(
        <LocationMapPicker
          latitude={-26.20}
          longitude={28.04}
          onChange={mockOnChange}
        />
      );

      marker = screen.getByTestId("marker");
      position = JSON.parse(marker.getAttribute("data-position"));
      expect(position.lat).toBeCloseTo(-26.20);
      expect(position.lng).toBeCloseTo(28.04);
    });

    it("removes marker when coordinates become invalid", () => {
      const { rerender } = render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId("marker")).toBeInTheDocument();

      rerender(
        <LocationMapPicker
          latitude={null}
          longitude={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
    });

    it("adds marker when coordinates become valid", () => {
      const { rerender } = render(
        <LocationMapPicker
          latitude={null}
          longitude={null}
          onChange={mockOnChange}
        />
      );

      expect(screen.queryByTestId("marker")).not.toBeInTheDocument();

      rerender(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId("marker")).toBeInTheDocument();
    });
  });

  describe("Center Positioning", () => {
    it("centers map on provided coordinates", () => {
      render(
        <LocationMapPicker
          latitude={-26.19}
          longitude={28.03}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          center: { lat: -26.19, lng: 28.03 },
        }),
        expect.any(Object)
      );
    });

    it("uses default center when coordinates are invalid", () => {
      render(
        <LocationMapPicker
          latitude={null}
          longitude={null}
          onChange={mockOnChange}
        />
      );

      expect(mockGoogleMap).toHaveBeenCalledWith(
        expect.objectContaining({
          center: { lat: -26.190166589669577, lng: 28.03017233015316 },
        }),
        expect.any(Object)
      );
    });
  });
});
