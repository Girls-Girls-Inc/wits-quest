import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const DEFAULT_CENTER = {
  lat: -26.190166589669577,
  lng: 28.03017233015316,
};

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "260px",
  borderRadius: "12px",
  overflow: "hidden",
};

const LIBRARIES = ["places"];

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Lightweight Google Maps wrapper used for picking latitude/longitude pairs.
 */
export default function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  zoom = 17,
  disabled = false,
  height,
}) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GMAPS_KEY || "",
    libraries: LIBRARIES,
  });

  const coords = useMemo(() => {
    const lat = toNumber(latitude);
    const lng = toNumber(longitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [latitude, longitude]);

  const [marker, setMarker] = useState(coords ?? null);
  const [center, setCenter] = useState(coords ?? DEFAULT_CENTER);

  useEffect(() => {
    if (coords) {
      setMarker(coords);
      setCenter(coords);
    } else {
      setMarker(null);
      setCenter(DEFAULT_CENTER);
    }
  }, [coords]);

  const handleMapClick = useCallback(
    (event) => {
      if (disabled) return;
      const lat = event?.latLng?.lat();
      const lng = event?.latLng?.lng();
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const next = { lat, lng };
      setMarker(next);
      setCenter(next);
      onChange?.(next);
    },
    [disabled, onChange]
  );

  if (!GMAPS_KEY) {
    return (
      <div className="map-picker-fallback">
        Google Maps API key missing. Set `VITE_GOOGLE_MAPS_API_KEY` to enable
        the map.
      </div>
    );
  }

  if (loadError) {
    return <div className="map-picker-fallback">Failed to load Google Maps.</div>;
  }

  if (!isLoaded) {
    return <div className="map-picker-fallback">Loading map…</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={
        height ? { ...MAP_CONTAINER_STYLE, height } : MAP_CONTAINER_STYLE
      }
      center={center}
      zoom={zoom}
      options={{
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      }}
      onClick={handleMapClick}
    >
      {marker && <Marker position={marker} draggable={false} />}
    </GoogleMap>
  );
}
