import React, { useEffect, useMemo, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";
import { useNavigate } from "react-router-dom";
import IconButton from "../components/IconButton";

const API_BASE = import.meta.env.VITE_WEB_URL;
const LOCATIONS_API = `${API_BASE}/locations`;
const USER_QUESTS_API = `${API_BASE}/user-quests`;

export default function Quests() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeQuest, setActiveQuest] = useState(null);
  const [activeLocation, setActiveLocation] = useState(null);
  const [jwt, setJwt] = useState(null);

  const [locCache, setLocCache] = useState({});
  const cacheLocation = (loc) =>
    setLocCache((m) => (loc?.id ? { ...m, [loc.id]: loc } : m));

  const loadQuests = async () => {
    const t = toast.loading("Loading quests...");
    try {
      const { data, error } = await supabase
        .from("quest_with_badges")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;
      setQuests(data || []);
      toast.success("Quests loaded", { id: t });
    } catch (err) {
      toast.error(err.message || "Failed to load quests", { id: t });
      setQuests([]);
    }
  };

  const fetchJwt = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session?.access_token) {
      setJwt(data.session.access_token);
    }
  };

  useEffect(() => {
    loadQuests();
    fetchJwt();
  }, []);

  const openModal = async (quest) => {
    setActiveQuest(quest);
    setActiveLocation(null);
    setOpen(true);

    if (!quest?.locationId) return;

    if (locCache[quest.locationId]) {
      setActiveLocation(locCache[quest.locationId]);
      return;
    }

    const t = toast.loading("Loading location…");
    try {
      const headers = { "Content-Type": "application/json" };
      if (jwt) headers.Authorization = `Bearer ${jwt}`;

      const resp = await fetch(`${LOCATIONS_API}/${quest.locationId}`, {
        headers,
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || "Failed to load location");

      cacheLocation(json);
      setActiveLocation(json);
      toast.dismiss(t);
    } catch (e) {
      toast.error(e.message, { id: t });
    }
  };

  const closeModal = () => {
    setOpen(false);
    setActiveQuest(null);
    setActiveLocation(null);
  };

  const addToMyQuests = async (questId) => {
    const t = toast.loading("Adding quest…");
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
    }
  };

  const mapSrc = useMemo(() => {
    const q = activeLocation;
    if (!q) return null;
    if (q.lat && q.lng) {
      return `https://www.google.com/maps?q=${q.lat},${q.lng}&hl=en&z=16&output=embed`;
    }
    const text =
      q.mapQuery ||
      q.address ||
      q.name ||
      activeQuest?.location ||
      "Wits University";
    return `https://www.google.com/maps?q=${encodeURIComponent(
      text
    )}&hl=en&z=15&output=embed`;
  }, [activeLocation, activeQuest]);

  // ESC closes modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <div className="quests-container">
      <Toaster />
      <div className="quests-header">
        <h1>QUEST</h1>
        <div className="quest-buttons">
          <button onClick={() => navigate("/adminDashboard")}>
            Create Quest
          </button>
          <button onClick={loadQuests}>Refresh</button>
        </div>
      </div>

      <div className="quest-list">
        {quests.map((q) => (
          <div key={q.id} className="quest-card">
            <div className="quest-profile">
              <img
                src={q.imageUrl || "https://via.placeholder.com/100"}
                alt="Quest"
              />
            </div>

            <div className="quest-info">
              <h2>{q.name}</h2>
              <p>
                <strong>Location:</strong> {q.location || "—"}
              </p>
              <p>
                <strong>Rewards:</strong>{" "}
                {q.rewards || `${q.pointsAchievable ?? 100} points`}
              </p>
            </div>

            <div className="quest-action">
              <button onClick={() => openModal(q)}>View Details</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {open && activeQuest && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quest-title"
          onClick={closeModal}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <IconButton
              className="modal-close"
              label="Close"
              icon="close"
              onClick={closeModal}
            />

            <div className="modal-body">
              <div className="modal-left">
                <img
                  src={
                    activeQuest.imageUrl ||
                    "https://via.placeholder.com/600x300"
                  }
                  alt={activeQuest.name}
                  className="modal-hero"
                />
                <h2 id="quest-title">{activeQuest.name}</h2>
                <p>{activeQuest.description || "No description provided."}</p>

                <div className="location-block">
                  <h3>Location</h3>
                  {activeLocation ? (
                    <>
                      <p>
                        <strong>{activeLocation.name || "—"}</strong>
                      </p>
                      {activeLocation.address && (
                        <p>{activeLocation.address}</p>
                      )}
                      {activeLocation.description && (
                        <p>{activeLocation.description}</p>
                      )}
                      {activeLocation.openingHours && (
                        <p>
                          <em>Hours: {activeLocation.openingHours}</em>
                        </p>
                      )}
                    </>
                  ) : (
                    <p>Loading location…</p>
                  )}
                </div>
              </div>

              <div className="modal-right">
                <div className="map-frame">
                  {mapSrc && (
                    <iframe
                      title="map"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={mapSrc}
                    />
                  )}
                </div>

                <div className="modal-actions">
                  <IconButton
                    icon="add"
                    label="Add to my Quests"
                    onClick={() => addToMyQuests(activeQuest.questId)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
