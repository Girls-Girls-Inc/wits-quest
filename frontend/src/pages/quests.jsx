import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
  const [myQuestIds, setMyQuestIds] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // guard against double-click / concurrent adds of the same quest
  const pendingAdds = useRef(new Set());

  const [locCache, setLocCache] = useState({});
  const cacheLocation = (loc) =>
    setLocCache((m) => (loc?.id ? { ...m, [loc.id]: loc } : m));
  const fetchMyQuestIds = useCallback(
    async (token) => {
      if (myQuestIds instanceof Set) return myQuestIds;

      const res = await fetch(USER_QUESTS_API, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      const ids = new Set(
        (Array.isArray(data) ? data : []).map((r) => String(r.questId))
      );
      setMyQuestIds(ids);
      return ids;
    },
    [myQuestIds]
  );

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

  const getStableQuestId = (q) => {
    const raw = q?.id ?? q?.questId;
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : null; // store as string for Set stability
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

  const handlePromptLogin = () => {
    setShowLoginPrompt(false);
    closeModal();
    navigate("/login");
  };

  const handlePromptDismiss = () => {
    setShowLoginPrompt(false);
  };

  const addToMyQuests = async (questOrId) => {
    // derive a single stable id (string)
    const questIdStr =
      typeof questOrId === "object"
        ? getStableQuestId(questOrId)
        : Number.isFinite(Number(questOrId))
        ? String(Number(questOrId))
        : null;

    if (!questIdStr) {
      toast.error("Could not determine questId for this quest.");
      return;
    }

    // prevent concurrent adds of the same quest
    if (pendingAdds.current.has(questIdStr)) return;
    pendingAdds.current.add(questIdStr);
    const t = toast.loading("Adding quest…");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.dismiss(t);
        setShowLoginPrompt(true);
        return;
      }

      const ids = await fetchMyQuestIds(token);
      if (ids.has(questIdStr)) {
        toast.success("This quest is already in your list.", { id: t });
        return;
      }

      const resp = await fetch(USER_QUESTS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questId: Number(questIdStr) }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        if (resp.status === 409) {
          // backend says it's already there
          toast.success("This quest is already in your list.", { id: t });
          setMyQuestIds((prev) => {
            const next = new Set(prev || []);
            next.add(questIdStr);
            return next;
          });
          return;
        }
        throw new Error(json.message || "Failed to add quest");
      }

      // update local cache immediately
      setMyQuestIds((prev) => {
        const next = new Set(prev || []);
        next.add(questIdStr);
        return next;
      });

      toast.success("Added to your quests!", { id: t });
    } catch (e) {
      toast.error(e.message, { id: t });
    } finally {
      pendingAdds.current.delete(questIdStr);
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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  return (
    <div className="quests-container">
      <div className="quests-header">
        <h1>QUEST</h1>
        <div className="quest-buttons">
          <IconButton icon="map" onClick={() => navigate(`/map`)} label="Map" />
          <IconButton icon="refresh" onClick={loadQuests} label="Refresh" />
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
              <IconButton
                icon="find_in_page"
                onClick={() => openModal(q)}
                label="View Details"
              />
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
                    onClick={() => addToMyQuests(activeQuest)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showLoginPrompt && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-required-title"
          onClick={handlePromptDismiss}
        >
          <div
            className="modal login-required"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <h2 id="login-required-title">Login Required</h2>
              <p>
                You need an account to save quests. Would you like to sign in
                now?
              </p>
              <div className="modal-actions">
                <IconButton
                  icon="login"
                  label="Go to Login"
                  onClick={handlePromptLogin}
                />
                <IconButton
                  icon="close"
                  label="Continue Browsing"
                  onClick={handlePromptDismiss}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
