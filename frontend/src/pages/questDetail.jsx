import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  GoogleMap,
  Marker,
  Circle,
  DirectionsService,
  DirectionsRenderer,
  useLoadScript,
} from "@react-google-maps/api";

import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import IconButton from "../components/IconButton";
import "../styles/quests.css";

const API_BASE = import.meta.env.VITE_WEB_URL;
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function normalizeQuizPayload(raw) {
  if (!raw) return null;
  const quiz = { ...raw };
  if (typeof quiz.options === "string") {
    const trimmed = quiz.options.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          quiz.options = parsed;
        } else if (parsed && Array.isArray(parsed.options)) {
          quiz.options = parsed.options;
        } else {
          quiz.options = trimmed
            .split(/\r?\n/)
            .map((opt) => opt.trim())
            .filter(Boolean);
        }
      } catch {
        quiz.options = trimmed
          .split(/\r?\n/)
          .map((opt) => opt.trim())
          .filter(Boolean);
      }
    } else {
      quiz.options = [];
    }
  } else if (!Array.isArray(quiz.options)) {
    quiz.options = quiz.options ? [quiz.options] : [];
  }
  return quiz;
}

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
  const [quiz, setQuiz] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(null);
  const watchIdRef = useRef(null);
  // const [directions, setDirections] = useState(null);

  const { isLoaded } = useLoadScript({ googleMapsApiKey: GMAPS_KEY || "" });

  const mapRef = useRef(null);

  const quizType = useMemo(
    () => (quiz?.questionType || "").toLowerCase(),
    [quiz]
  );
  const quizOptions = useMemo(
    () => (Array.isArray(quiz?.options) ? quiz.options : []),
    [quiz]
  );
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

  const quizAnswerProvided = useMemo(() => {
    if (!quiz) return true;
    if (quizType === "text") return answer.trim().length > 0;
    if (quizType === "mcq") return Boolean(answer);
    return Boolean(answer?.toString().trim());
  }, [answer, quiz, quizType]);

  const requiresQuizAnswer = Boolean(quiz);

  const canCompleteQuest =
    withinRadius && (!requiresQuizAnswer || quizAnswerProvided);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
      setMe(session?.user || null);
    })();
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    (async () => {
      try {
        setLoading(true);
        const resQ = await fetch(
          `${API_BASE}/quests?id=${encodeURIComponent(questId)}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const list = await resQ.json();
        const q = Array.isArray(list) ? list[0] : list;
        if (!q) throw new Error(`Quest ${questId} not found`);
        setQuest(q);

        if (!q.locationId) throw new Error("Quest has no locationId");

        const resL = await fetch(`${API_BASE}/locations/${q.locationId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const raw = await resL.json();
        const lat = Number.isFinite(Number(raw.lat)) ? Number(raw.lat) : 0;
        const lng = Number.isFinite(Number(raw.lng)) ? Number(raw.lng) : 0;
        const radius = Number.isFinite(Number(raw.radius))
          ? Number(raw.radius)
          : 0;
        setLoc({ ...raw, lat, lng, radius });

        if (q.quizId) {
          try {
            const resQuiz = await fetch(`${API_BASE}/quiz/${q.quizId}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!resQuiz.ok) {
              const errText = await resQuiz.text().catch(() => "");
              throw new Error(errText || "Failed to load quiz");
            }
            const quizPayload = await resQuiz.json();
            setQuiz(normalizeQuizPayload(quizPayload));
          } catch (quizErr) {
            setQuiz(null);
            toast.error(quizErr?.message || "Failed to load quiz");
          }
        } else {
          setQuiz(null);
        }
        setAnswer("");
      } catch (e) {
        setQuiz(null);
        setAnswer("");
        toast.error(e.message || "Failed to load quest");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, questId]);

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
      if (watchIdRef.current != null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && pos)
      mapRef.current.panTo({ lat: pos.lat, lng: pos.lng });
  }, [pos]);

  const onComplete = async () => {
    if (!accessToken || !me || !quest || !userQuestId) return;
    if (!withinRadius) {
      toast.error("You must be inside the quest radius to complete.");
      return;
    }
    if (requiresQuizAnswer && !quizAnswerProvided) {
      toast.error("Please answer the question to complete this quest.");
      return;
    }
    if (requiresQuizAnswer) {
      const normalizedAnswer = answer.trim();
      const normalizedCorrect = quiz.correctAnswer?.trim() || "";
      if (quizType === "text") {
        if (
          !normalizedCorrect ||
          normalizedAnswer.toLowerCase() !== normalizedCorrect.toLowerCase()
        ) {
          toast.error("Incorrect answer. Try again!");
          return;
        }
      } else if (quizType === "mcq") {
        if (normalizedAnswer !== normalizedCorrect) {
          toast.error("Incorrect answer. Try again!");
          return;
        }
      }
    }

    try {
      // 1) Complete the quest
      const res = await fetch(
        `${API_BASE}/user-quests/${userQuestId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            questId: quest.id,
            points: quest.pointsAchievable,
          }),
        }
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || "Failed to complete quest");

      // 2) Activate the hunt linked to this quest
      const activateRes = await fetch(
        `${API_BASE}/hunts/${quest.huntId}/activate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const activateJson = await activateRes.json().catch(() => ({}));
      if (!activateRes.ok) {
        console.error("Error activating hunt:", activateJson);
        toast.error("Quest completed, but hunt could not be activated.");
        return;
      } else {
        toast.success("Hunt activated!");
      }

      // 3) Award collectible (if any)
      if (quest.collectibleId != null) {
        const award = await fetch(
          `${API_BASE}/users/${encodeURIComponent(
            me.id
          )}/collectibles/${encodeURIComponent(quest.collectibleId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ earnedAt: new Date().toISOString() }),
          }
        );
        const aj = await award.json().catch(() => ({}));
        if (!award.ok) {
          console.warn("Award collectible failed:", aj);
          toast.error("Quest done, but collectible could not be awarded.");
        } else {
          toast.success("Collectible added to your inventory!");
        }
      }

      toast.success("Quest completed! Points awarded.");
      navigate("/dashboard");
    } catch (e) {
      toast.error(e.message || "Completion failed");
    }
  };

  const mapCenter = useMemo(() => {
    if (loc?.lat && loc?.lng) return { lat: loc.lat, lng: loc.lng };
    return { lat: -26.2041, lng: 28.0473 };
  }, [loc]);

  if (loading) {
    return (
      <div className="page quest-detail">
        <h2>Loading quest…</h2>
      </div>
    );
  }

  if (!quest || !loc) {
    return (
      <div className="page quest-detail">
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

  const hasRadius =
    Number.isFinite(Number(loc.radius)) && Number(loc.radius) > 0;

  return (
    <div className="page quest-detail">
      <header className="quest-detail-header">
        <h1>{quest.name}</h1>
        <div className="meta">
          <span>
            <strong>Points:</strong> {quest.pointsAchievable}
          </span>
          <br />
          <span>
            <strong>Location:</strong> {loc.name ?? "Unknown"}
          </span>
          <br />

          {distanceM != null && (
            <span>
              <strong>Distance to target:</strong> {distanceM} m
            </span>
          )}
        </div>
      </header>

      {quiz && (
        <section className="quiz-section">
          <h3>Quest Challenge</h3>
          <p>{quiz.questionText}</p>

          {quizType === "mcq" && quizOptions.length > 0 && (
            <div className="quiz-options">
              {quizOptions.map((opt, i) => (
                <label key={i}>
                  <input
                    type="radio"
                    name="quiz"
                    value={opt}
                    checked={answer === opt}
                    onChange={() => setAnswer(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}

          {quizType === "text" && (
            <>
              {quiz.correctAnswer && quiz.correctAnswer.length > 50 ? (
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  rows={Math.min(Math.ceil(quiz.correctAnswer.length / 40), 6)}
                />
              ) : (
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                />
              )}
            </>
          )}
        </section>
      )}

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
            {/* Quest location */}
            <Marker position={mapCenter} title={loc.name || "Quest location"} />

            {/* Radius circle */}
            {hasRadius && (
              <Circle
                center={mapCenter}
                radius={Number(loc.radius)}
                options={{ strokeOpacity: 0.6, fillOpacity: 0.12 }}
              />
            )}

            {/* User marker */}
            {pos && (
              <Marker
                position={{ lat: pos.lat, lng: pos.lng }}
                icon={youIcon}
                title="You"
              />
            )}

            {/* Actual road path
            {pos && !directions && (
              <DirectionsService
                options={{
                  origin: { lat: pos.lat, lng: pos.lng },
                  destination: { lat: mapCenter.lat, lng: mapCenter.lng },
                  travelMode: "WALKING",
                }}
                callback={(res) => {
                  if (res !== null && res.status === "OK") {
                    setDirections(res);
                  }
                }}
              />
            )}
            {directions && (
              <DirectionsRenderer
                options={{
                  directions: directions,
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: "#FF0000",
                    strokeWeight: 4,
                  },
                }}
              />
            )} */}
          </GoogleMap>
        ) : (
          <div>Loading map…</div>
        )}
      </section>

      <section className="actions">
        <div
          className={` highlight radius-indicator ${
            withinRadius ? "ok" : "far"
          }`}
        >
          {withinRadius
            ? "You are inside the radius"
            : "You are outside the radius"}
          <br />
          <span>
            <strong> Radius (m):</strong> {Number(loc.radius) || 0}
          </span>
        </div>

        <div className="action-buttons">
          <IconButton
            icon="check_circle"
            label="Check-in & Complete"
            onClick={onComplete}
            disabled={!canCompleteQuest}
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
