// src/pages/QuestDetail.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { GoogleMap, Marker, Circle, useLoadScript } from "@react-google-maps/api";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const API_BASE = import.meta.env.VITE_WEB_URL;
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function haversineMeters(aLat, aLng, bLat, bLng) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000; // meters
    const dLat = toRad(bLat - aLat);
    const dLng = toRad(bLng - aLng);
    const s1 =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
    return R * c;
}

export default function QuestDetail() {
    const { questId } = useParams();
    const [params] = useSearchParams(); // ?uq=USER_QUEST_ID
    const userQuestId = params.get("uq");
    const navigate = useNavigate();

    const [accessToken, setAccessToken] = useState(null);
    const [me, setMe] = useState(null);

    const [quest, setQuest] = useState(null);   // { id, name, pointsAchievable, locationId, ... }
    const [loc, setLoc] = useState(null);       // { id, name, lat, lng, radius }
    const [loading, setLoading] = useState(true);

    // live user position
    const [pos, setPos] = useState(null);       // { lat, lng, accuracy? }
    const watchIdRef = useRef(null);

    const { isLoaded } = useLoadScript({ googleMapsApiKey: GMAPS_KEY || "" });
    const mapRef = useRef(null);

    const distanceM = useMemo(() => {
        if (!pos || !loc) return null;
        return Math.round(haversineMeters(pos.lat, pos.lng, loc.lat, loc.lng));
    }, [pos, loc]);

    const withinRadius = useMemo(() => {
        if (!pos || !loc) return false;
        const r = Number(loc.radius) || 0;
        if (!r) return false;
        return haversineMeters(pos.lat, pos.lng, loc.lat, loc.lng) <= r;
    }, [pos, loc]);

    // session
    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setAccessToken(session?.access_token || null);
            setMe(session?.user || null);
        })();
    }, []);

    // fetch quest + location (normalize radius/lat/lng here)
    useEffect(() => {
        if (!accessToken) return;

        (async () => {
            try {
                setLoading(true);

                // 1) Quest
                const resQ = await fetch(`${API_BASE}/quests?id=${encodeURIComponent(questId)}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const list = await resQ.json();
                const q = Array.isArray(list) ? list[0] : list;
                if (!q) throw new Error(`Quest ${questId} not found`);
                setQuest(q);

                // 2) Location (normalize numbers, including radius)
                if (!q.locationId) throw new Error("Quest has no locationId");
                const resL = await fetch(`${API_BASE}/locations/${q.locationId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                const raw = await resL.json();

                const toNum = (v) => (typeof v === "number" ? v : v != null ? parseFloat(v) : NaN);
                const lat = toNum(raw.lat ?? raw.latitude);
                const lng = toNum(raw.lng ?? raw.longitude);
                const radius =
                    toNum(raw.radius ?? raw.radiusMeters ?? raw.range ?? raw.distance) || 0;

                setLoc({ ...raw, lat, lng, radius });
            } catch (e) {
                toast.error(e.message || "Failed to load quest");
            } finally {
                setLoading(false);
            }
        })();
    }, [accessToken, questId]);

    // start geolocation watch (live location)
    useEffect(() => {
        if (!("geolocation" in navigator)) {
            toast.error("Geolocation not supported by your browser.");
            return;
        }
        const id = navigator.geolocation.watchPosition(
            (p) => {
                const next = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
                setPos(next);
            },
            (err) => toast.error(err.message || "Unable to get your location"),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
        watchIdRef.current = id;
        return () => {
            if (watchIdRef.current != null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    // Optional: auto-center the map to your live location once it appears
    useEffect(() => {
        if (mapRef.current && pos) {
            mapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
        }
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
                    points: quest.pointsAchievable, // server re-validates points from DB
                }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j?.message || "Failed to complete quest");
            toast.success("Quest completed! Points awarded.");
            navigate("/"); // back to dashboard
        } catch (e) {
            toast.error(e.message || "Completion failed");
        }
    };

    const mapCenter = useMemo(() => {
        if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
        return { lat: -26.2041, lng: 28.0473 }; // Johannesburg fallback
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

    const youIcon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#1E90FF", // DodgerBlue
        fillOpacity: 1,
        strokeColor: "white",
        strokeWeight: 2,
        scale: 10, // bigger size (default ~4)
    };


    return (
        <div className="page quest-detail">
            <Toaster />
            <header className="quest-detail-header">
                <h1>{quest.name}</h1>
                <div className="meta">
                    <span><strong>Points:</strong> {quest.pointsAchievable}</span>
                    <span><strong>Location:</strong> {loc.name ?? "Unknown"}</span>
                    <span><strong>Radius (m):</strong> {Number(loc.radius) || 0}</span>
                    {distanceM != null && (
                        <span><strong>Distance to target:</strong> {distanceM} m</span>
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
                        {/* Quest location + radius */}
                        <Marker position={mapCenter} title={loc.name || "Quest location"} />
                        {!!(Number(loc.radius) || 0) && (
                            <Circle
                                center={mapCenter}
                                radius={Number(loc.radius) || 0}
                                options={{
                                    strokeOpacity: 0.6,
                                    fillOpacity: 0.12,
                                }}
                            />
                        )}

                        {/* Your live position */}
                        {pos && (
                            <>
                                <Marker position={{ lat: pos.lat, lng: pos.lng }} icon={youIcon} title="You" />
                                {/* (optional) accuracy circle around you
                {pos.accuracy && (
                  <Circle
                    center={{ lat: pos.lat, lng: pos.lng }}
                    radius={pos.accuracy}
                    options={{ strokeOpacity: 0.2, fillOpacity: 0.05 }}
                  />
                )} */}
                            </>
                        )}
                    </GoogleMap>
                ) : (
                    <div>Loading map…</div>
                )}
            </section>

            <section className="actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className={`radius-indicator ${withinRadius ? "ok" : "far"}`}>
                    {withinRadius ? "You are inside the radius" : "You are outside the radius"}
                </div>
                <button className="primary" disabled={!withinRadius} onClick={onComplete}>
                    Check-in & Complete
                </button>
                <button
                    className="secondary"
                    onClick={() => {
                        if (mapRef.current && pos) mapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
                    }}
                >
                    Center on me
                </button>
                <button className="secondary" onClick={() => navigate(-1)}>Back</button>
            </section>
        </div>
    );
}
