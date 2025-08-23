import React, { useMemo } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const MAP_CONTAINER_STYLE = { width: "100%", height: "70vh", borderRadius: 12 };
const LIBRARIES = ["marker"];

export default function Map() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Center and borders (example box around Johannesburg — change to yours)
  const center = useMemo(() => ({ lat: -26.1900, lng: 28.0300 }), []);
  const bounds = useMemo(
    () => ({
      north: -26.1780,
      south: -26.2055,
      west: 27.9975,
      east: 28.0495,
    }),
    []
  );

  // Demo pins (replace with Supabase data later)
  /*const demoQuests = [
    { id: "q1", title: "Quest 1", position: { lat: -26.2041, lng: 28.0473 } },
    { id: "q2", title: "Quest 2", position: { lat: -26.205, lng: 28.05 } },
  ];*/

  if (loadError) return <div>Failed to load Google Maps.</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div>
      <h1>Quests</h1>
      <p>This is the quests page. You can view quests and treasure hunts here.</p>

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={12}
        options={{
          restriction: { latLngBounds: bounds, strictBounds: true }, // “map borders”
          disableDefaultUI: false,
          clickableIcons: true,
          // mapId: "YOUR_MAP_ID", // optional: Cloud Styled Maps
        }}
        onLoad={(map) => {
          // Fit to your bounds on load (optional):
          const b = new window.google.maps.LatLngBounds(
            { lat: bounds.south, lng: bounds.west },
            { lat: bounds.north, lng: bounds.east }
          );
          map.fitBounds(b);
        }}
      >
      </GoogleMap>
    </div>
  );
}
