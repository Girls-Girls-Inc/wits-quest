// src/pages/QuestDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, Circle, useLoadScript } from "@react-google-maps/api";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import IconButton from "../components/IconButton"; // import your button

const API_BASE = import.meta.env.VITE_WEB_URL;
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function haversineMeters(aLat, aLng, bLat, bLng) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s1 =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
}

export default function QuestDetail() {
    const { questId } = useParams();
    const [params] = useSearchParams();
    const userQuestId = params.get("uq");
    const navigate = useNavigate();

    const [accessToken, setAccessToken] = useState(null);
    const [me, setMe] = useState(null);

    const [quest, setQuest] = useState(null);
    const [loc, setLoc] = useState(null);
    const [loading, setLoading] = useState(true);

    const [pos, setPos] = useState(null);
    const watchIdRef = useRef(null);

    const { isLoaded } = useLoadScript({ googleMapsApiKey: GMAPS_KEY || "" });
    const mapRef = useRef(null);

    const distanceM = useMemo(() => {
        if (!pos || !loc) return null;
        return Math.round(haversineMeters(pos.lat, pos.lng, loc.lat, loc.lng));
    }, [pos, loc]);

    const withinRadius = useMemo(() => {
        if (!pos || !loc) return false;
        const r = Number(loc.radius);
        if (!Number.isFinite(r) || r <= 0) return false;
        return haversineMeters(pos.lat, pos.lng, loc.lat, loc.lng) <= r;
    }, [pos, loc]);

    useEffect(() => {
        (async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            setAccessToken(session?.access_token || null);
            setMe(session?.user || null);
        })();
    }, []);

    // fetch quest + location (backend guarantees valid numbers)
    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            try {
                setLoading(true);

                const resQ = await fetch(`${API_BASE}/quests?id=${encodeURIComponent(questId)}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const list = await resQ.json();
                const q = Array.isArray(list) ? list[0] : list;
                if (!q) throw new Error(`Quest ${questId} not found`);
                setQuest(q);

                if (!q.locationId) throw new Error("Quest has no locationId");

                const resL = await fetch(`${API_BASE}/locations/${q.locationId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const raw = await resL.json();

                // normalize numbers
                const lat = Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : 0;
                const lng = Number.isFinite(Number(raw.lng)) ? Number(raw.lng) : 0;
                const radius = Number.isFinite(Number(raw.radius)) ? Number(raw.radius) : 0;

                const normalised = { ...raw, lat, lng, radius };
                console.debug("[QuestDetail] location loaded:", normalised);

                setLoc(normalised);
            } catch (e) {
                toast.error(e.message || "Failed to load quest");
            } finally {
                setLoading(false);
            }
        })();
    }, [accessToken, questId]);

    // watch user position
    useEffect(() => {
        if (!("geolocation" in navigator)) {
            toast.error("Geolocation not supported by your browser.");
            return;
        }
        const id = navigator.geolocation.watchPosition(
            (p) =>
                setPos({
                    lat: p.coords.latitude,
                    lng: p.coords.longitude,
                    accuracy: p.coords.accuracy,
                }),
            (err) => toast.error(err.message || "Unable to get your location"),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        watchIdRef.current = id;
        return () => {
            if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    useEffect(() => {
        if (mapRef.current && pos) mapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
    }, [pos]);

    const onComplete = async () => {
        if (!accessToken || !me || !quest || !userQuestId) return;
        if (!withinRadius) {
            toast.error("You must be inside the quest radius to complete.");
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/user-quests/${userQuestId}/complete`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    questId: quest.id,
                    points: quest.pointsAchievable,
                }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.message || "Failed to complete quest");
            toast.success("Quest completed! Points awarded.");
            navigate("/dashboard");
        } catch (e) {
            toast.error(e.message || "Completion failed");
        }
    };

    const mapCenter = useMemo(() => {
        if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
        return { lat: -26.2041, lng: 28.0473 }; // fallback: Johannesburg
    }, [loc]);

    if (loading) {
        return (
            <div className="page">
                <Toaster />
                <h2>Loading quest…</h2>
            </div>
        );
    }

    if (!quest || !loc) {
        return (
            <div className="page">
                <Toaster />
                <h2>Quest not found</h2>
            </div>
        );
    }

    const youIcon = isLoaded
        ? {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#1E90FF",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
            scale: 10,
        }
        : undefined;

    const hasRadius = Number.isFinite(Number(loc.radius)) && Number(loc.radius) > 0;

    return (
        <div className="page quest-detail">
            <Toaster />
            <header className="quest-detail-header">
                <h1>{quest.name}</h1>
                <div className="meta">
                    <span>
                        <strong>Points:</strong> {quest.pointsAchievable}
                    </span>
                    <span>
                        <strong>Location:</strong> {loc.name ?? "Unknown"}
                    </span>
                    <span>
                        <strong>Radius (m):</strong> {Number(loc.radius) || 0}
                    </span>
                    {distanceM != null && (
                        <span>
                            <strong>Distance to target:</strong> {distanceM} m
                        </span>
                    )}
                </div>
            </header>

            <section className="map-wrap">
                {isLoaded ? (
                    <GoogleMap
                        onLoad={(map) => (mapRef.current = map)}
                        mapContainerStyle={{ width: "100%", height: "420px", borderRadius: "12px" }}
                        center={mapCenter}
                        zoom={16}
                        options={{
                            streetViewControl: false,
                            mapTypeControl: false,
                            fullscreenControl: false,
                        }}
                    >
                        <Marker position={mapCenter} title={loc.name || "Quest location"} />

                        {hasRadius && (
                            <Circle
                                center={mapCenter}
                                radius={Number(loc.radius)}
                                options={{ strokeOpacity: 0.6, fillOpacity: 0.12 }}
                            />
                        )}

                        {pos && <Marker position={{ lat: pos.lat, lng: pos.lng }} icon={youIcon} title="You" />}
                    </GoogleMap>
                ) : (
                    <div>Loading map…</div>
                )}
            </section>

  return (
    <div className="page quest-detail">
      <Toaster />

      <header className="quest-detail-header">
        <h1>{quest.name}</h1>
        <div className="meta">
          <span>
            <strong>Points:</strong> {quest.pointsAchievable}
          </span>
          <span>
            <strong>Location:</strong> {loc.name ?? "Unknown"}
          </span>
          <span>
            <strong>Radius (m):</strong> {Number(loc.radius) || 0}
          </span>
          {distanceM != null && (
            <span>
              <strong>Distance to target:</strong> {distanceM} m
            </span>
          )}
        </div>
      </header>

      <section className="map-wrap">
        {isLoaded ? (
          <GoogleMap
            onLoad={(map) => (mapRef.current = map)}
            mapContainerStyle={{
              width: "100%",
              height: "420px",
              borderRadius: "12px",
            }}
            center={mapCenter}
            zoom={16}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            <Marker position={mapCenter} title={loc.name || "Quest location"} />
            {hasRadius && (
              <Circle
                center={mapCenter}
                radius={Number(loc.radius)}
                options={{ strokeOpacity: 0.6, fillOpacity: 0.12 }}
              />
            )}
            {pos && (
              <Marker
                position={{ lat: pos.lat, lng: pos.lng }}
                icon={youIcon}
                title="You"
              />
            )}
          </GoogleMap>
        ) : (
          <div>Loading map…</div>
        )}
      </section>

      <section className="actions">
        <div className={`radius-indicator ${withinRadius ? "ok" : "far"}`}>
          {withinRadius
            ? "You are inside the radius"
            : "You are outside the radius"}
        </div>

        <div className="action-buttons">
          <IconButton
            icon="check_circle"
            label="Check-in & Complete"
            onClick={onComplete}
            disabled={!withinRadius}
          />
          <IconButton
            icon="my_location"
            label="Center on me"
            onClick={() =>
              pos && mapRef.current?.panTo({ lat: pos.lat, lng: pos.lng })
            }
          />
          <IconButton
            icon="arrow_back"
            label="Back"
            onClick={() => navigate(-1)}
          />
        </div>
      </section>
    </div>
  );
}
