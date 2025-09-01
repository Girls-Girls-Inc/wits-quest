import React, { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";
import "../styles/map.css";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL; // e.g. http://localhost:3000
const USER_QUESTS_API = `${API_BASE}/user-quests`;
const MAP_CONTAINER_STYLE = { width: "100%", height: "70vh", borderRadius: 12 };
const LIBRARIES = ["marker"];

const asLatLng = (obj) => {
  if (!obj) return null;
  const toNum = (v) =>
    typeof v === "number" ? v : v != null ? parseFloat(v) : NaN;

  if (obj.lat != null && obj.lng != null) {
    const lat = toNum(obj.lat),
      lng = toNum(obj.lng);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  if (obj.latitude != null && obj.longitude != null) {
    const lat = toNum(obj.latitude),
      lng = toNum(obj.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  if (Array.isArray(obj.coordinates) && obj.coordinates.length === 2) {
    const [lngRaw, latRaw] = obj.coordinates;
    const lat = toNum(latRaw),
      lng = toNum(lngRaw);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
  }
  return null;
};

const questInlinePos = (q) =>
  asLatLng(q) || asLatLng(q.location) || asLatLng(q.geo) || null;

// meters → degrees at given latitude (approx)
const metersToDegrees = (meters, atLatDeg) => {
  const dLat = meters / 111_320; // ~ meters per degree latitude
  const dLng = meters / (111_320 * Math.cos((atLatDeg * Math.PI) / 180));
  return { dLat, dLng };
};

// Spread overlapping markers around their shared coordinate in a small ring.
// radiusMeters: base distance; grows a bit if many markers share the spot.
const spreadOverlaps = (markers, radiusMeters = 15) => {
  // Group by exact coordinate (rounded to 6dp to catch near-identical points)
  const keyOf = (p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const groups = new Map();
  for (const m of markers) {
    const k = keyOf(m.position);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(m);
  }

  const result = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    const lat0 = group[0].position.lat;
    const base = radiusMeters;
    // Evenly distribute on circle(s)
    group.forEach((m, i) => {
      // If many, create concentric rings every 8 points
      const ring = Math.floor(i / 8);
      const idxOnRing = i % 8; // 0..7
      const nOnRing = Math.min(8, group.length - ring * 8);
      const angle = (2 * Math.PI * idxOnRing) / nOnRing; // radians
      const r = base * (1 + ring * 0.6); // grow radius a bit per ring
      const { dLat, dLng } = metersToDegrees(r, lat0);
      const pos = {
        lat: m.position.lat + dLat * Math.sin(angle),
        lng: m.position.lng + dLng * Math.cos(angle),
      };
      result.push({ ...m, position: pos, overlappedOffset: true });
    });
  }
  return result;
};

// ---------- component ----------
export default function QuestMap() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selected, setSelected] = useState(null); // store full marker for InfoWindow
  const [adding, setAdding] = useState(false); // add-to-my-quests button state

  const center = useMemo(() => ({ lat: -26.19, lng: 28.03 }), []);
  const bounds = useMemo(
    () => ({ north: -26.178, south: -26.2055, west: 27.9975, east: 28.0495 }),
    []
  );

  const fetchLocationById = async (id, signal) => {
    // Prefer /locations/:id (single object)
    const r1 = await fetch(`${API_BASE}/locations/${encodeURIComponent(id)}`, {
      signal,
    });
    if (r1.ok) return r1.json();
    // Fallback: /locations?id=...
    const sep = `${API_BASE}/locations`.includes("?") ? "&" : "?";
    const r2 = await fetch(
      `${API_BASE}/locations${sep}id=${encodeURIComponent(id)}`,
      { signal }
    );
    if (r2.ok) {
      const arr = await r2.json();
      return Array.isArray(arr)
        ? arr[0]
        : Array.isArray(arr?.data)
        ? arr.data[0]
        : null;
    }
    throw new Error(`Location ${id} not found`);
  };

  const loadQuests = async () => {
    const ac = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quests`, {
        signal: ac.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const withInline = [];
      const needsLookup = [];
      for (const q of list) {
        const pos = questInlinePos(q);
        if (pos) withInline.push({ quest: q, position: pos });
        else if (q.locationId != null) needsLookup.push(q);
      }

      const resolveQuestId = (marker) =>
        marker?.raw?.questId ?? marker?.raw?.id ?? marker?.id ?? null;
      const idSet = [...new Set(needsLookup.map((q) => q.locationId))];
      const idToLoc = new Map();
      await Promise.all(
        idSet.map(async (id) => {
          try {
            const loc = await fetchLocationById(id, ac.signal);
            idToLoc.set(id, loc);
          } catch (e) {
            console.warn(e);
            toast.error(`Could not load location ${id}`);
          }
        })
      );

      const fromLocations = needsLookup
        .map((q) => {
          const locObj = idToLoc.get(q.locationId);
          const pos = asLatLng(locObj);
          return pos ? { quest: q, position: pos } : null;
        })
        .filter(Boolean);

      // Build markers
      const builtRaw = [...withInline, ...fromLocations].map(
        ({ quest, position }) => ({
          id:
            quest.id ||
            quest.questId ||
            quest.slug ||
            quest.name ||
            JSON.stringify(quest),
          title: quest.name || quest.title || "Quest",
          points: quest.pointsAchievable ?? quest.points ?? null,
          isActive: quest.isActive ?? true,
          createdAt: quest.createdAt,
          description: quest.description ?? quest.details ?? null,
          position,
          raw: quest,
        })
      );

      // Spread overlapping markers slightly
      const built = spreadOverlaps(builtRaw, 15); // ~15 m offset

      setMarkers(built);
      setQuests(list);
    } catch (e) {
      toast.error(e.message || "Failed to load quests");
    } finally {
      setLoading(false);
    }
    return () => ac.abort();
  };

  useEffect(() => {
    loadQuests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolveQuestId = (marker) =>
    marker?.raw?.questId ?? marker?.raw?.id ?? marker?.id ?? null;
  const addToMyQuests = async (marker) => {
    const questId = resolveQuestId(marker);
    if (!questId) {
      toast.error("Could not determine questId for this quest.");
      return;
    }
    const t = toast.loading("Adding quest…");
    setAdding(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Please sign in.");

      const resp = await fetch(USER_QUESTS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questId }),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || "Failed to add quest");

      toast.success("Added to your quests!", { id: t });
    } catch (e) {
      toast.error(e.message, { id: t });
    } finally {
      setAdding(false);
    }
  };

  if (loadError) return <div>Failed to load Google Maps.</div>;
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div>
      <Toaster />
      <div className="map-container">
        <div className="map-header">
          <h1>Quests Map</h1>

          <IconButton
            type="button"
            onClick={loadQuests}
            disabled={loading}
            className="btn"
            label="Refresh"
          />
        </div>

        <div></div>
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={center}
          zoom={12}
          options={{
            restriction: { latLngBounds: bounds, strictBounds: true },
            disableDefaultUI: false,
            clickableIcons: true,
          }}
          onLoad={(map) => {
            const b = new window.google.maps.LatLngBounds(
              { lat: bounds.south, lng: bounds.west },
              { lat: bounds.north, lng: bounds.east }
            );
            map.fitBounds(b);
          }}
          onClick={() => setSelected(null)} // click map to close info
        >
          {markers.map((m) => (
            <Marker
              key={m.id}
              position={m.position}
              title={m.title}
              onClick={() => setSelected(m)}
            />
          ))}

          {selected && (
            <InfoWindow
              position={selected.position}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window-content">
                <strong className="info-window-title">{selected.title}</strong>
                {selected.description && (
                  <div className="info-window-desc">{selected.description}</div>
                )}
                {typeof selected.points === "number" && (
                  <div className="info-window-points">
                    Points: {selected.points}
                  </div>
                )}

                {selected.overlappedOffset && (
                  <div className="info-window-overlap"></div>
                )}
                <IconButton
                  type="button"
                  onClick={() => addToMyQuests(selected)}
                  disabled={adding}
                  label="Add to my Quests"
                />
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
