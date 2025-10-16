import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import ComboBox from "../components/ComboBox";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;
const TOAST_OPTIONS = {
  style: {
    background: "#002d73",
    color: "#ffb819",
  },
  success: {
    style: {
      background: "green",
      color: "white",
    },
  },
  error: {
    style: {
      background: "red",
      color: "white",
    },
  },
  loading: {
    style: {
      background: "#002d73",
      color: "#ffb819",
    },
  },
};

const getToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export default function ManageQuests() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [collectibles, setCollectibles] = useState([]);
  const [hunts, setHunts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuest, setEditingQuest] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationId: "",
    pointsAchievable: "",
    collectibleId: "",
    huntId: "",
    quizId: "",
    isActive: true,
  });

  // Load quests with images
  const loadQuests = async () => {
    const t = toast.loading("Loading quests...");
    try {
      // Fetch quests
      const { data: questsData, error: questsError } = await supabase
        .from("quests")
        .select("*")
        .order("createdAt", { ascending: false });
      if (questsError) throw questsError;

      // Fetch images from quest_with_badges
      const { data: badgeData, error: badgeError } = await supabase
        .from("quest_with_badges")
        .select("questId, imageUrl");
      if (badgeError) throw badgeError;

      // Merge images with quests
      const questsWithImages = (questsData || []).map((q) => {
        const badge = badgeData?.find(
          (b) => Number(b.questId) === Number(q.id)
        );

        let imageUrl = null;
        if (badge?.imageUrl) {
          imageUrl = badge.imageUrl.startsWith("http")
            ? badge.imageUrl
            : supabase.storage
                .from("quests") // <-- your bucket name
                .getPublicUrl(badge.imageUrl).data.publicUrl;
        }

        return {
          ...q,
          id: Number(q.id),
          locationId: q.locationId !== null ? Number(q.locationId) : null,
          collectibleId:
            q.collectibleId !== null ? Number(q.collectibleId) : null,
          huntId: q.huntId !== null ? Number(q.huntId) : null,
          quizId: q.quizId !== null ? Number(q.quizId) : null,
          pointsAchievable: q.pointsAchievable ?? 0,
          isActive: q.isActive ?? true,
          imageUrl,
        };
      });

      setQuests(questsWithImages);
      toast.success("Quests loaded", { id: t });
    } catch (err) {
      toast.error(err.message || "Failed to load quests", { id: t });
      setQuests([]);
    }
  };

  // Load locations
  const loadLocations = async () => {
    try {
      const res = await fetch(`${API_BASE}/locations`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch locations");
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLocations([]);
    }
  };

  // Load collectibles
  const loadCollectibles = async () => {
    try {
      const res = await fetch(`${API_BASE}/collectibles`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch collectibles");
      const data = await res.json();
      setCollectibles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCollectibles([]);
    }
  };

  const loadHunts = async () => {
    try {
      const res = await fetch(`${API_BASE}/hunts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hunts");
      setHunts(await res.json());
    } catch {
      setHunts([]);
    }
  };

  const loadQuizzes = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setQuizzes([]);
        return;
      }
      const res = await fetch(`${API_BASE}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuizzes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to fetch quizzes");
      setQuizzes([]);
    }
  };

  useEffect(() => {
    loadQuests();
    loadLocations();
    loadCollectibles();
    loadHunts();
    loadQuizzes();
  }, []);

  const handleEditClick = (quest) => {
    if (!quest?.id) return toast.error("Invalid quest selected");
    setEditingQuest({ ...quest });
    setFormData({
      name: quest.name || "",
      description: quest.description || "",
      locationId: quest.locationId || "",
      pointsAchievable: quest.pointsAchievable || "",
      collectibleId: quest.collectibleId || "",
      huntId: quest.huntId || "",
      quizId: quest.quizId != null ? String(quest.quizId) : "",
      isActive: quest.isActive ?? true,
    });
  };

  const handleSave = async () => {
    const token = await getToken();
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    if (!editingQuest?.id) return toast.error("Invalid quest selected");
    const t = toast.loading("Saving quest...");
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        locationId: formData.locationId ? Number(formData.locationId) : null,
        pointsAchievable: formData.pointsAchievable
          ? Number(formData.pointsAchievable)
          : 0,
        collectibleId: formData.collectibleId
          ? Number(formData.collectibleId)
          : null,
        huntId: formData.huntId ? Number(formData.huntId) : null,
        quizId: formData.quizId ? Number(formData.quizId) : null,
        isActive: formData.isActive ?? true,
      };
      const questId = Number(editingQuest.id);
      const resp = await fetch(`${API_BASE}/quests/${questId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const contentType = resp.headers.get("content-type") || "";
      let responseBody = null;
      if (contentType.includes("application/json")) {
        responseBody = await resp.json();
      } else {
        responseBody = await resp.text();
      }

      if (!resp.ok) {
        const message =
          (typeof responseBody === "string" && responseBody) ||
          (responseBody && responseBody.message) ||
          "Failed to update quest";
        throw new Error(message);
      }

      const updatedQuest =
        responseBody && typeof responseBody === "object"
          ? responseBody.quest ?? responseBody
          : null;

      setQuests(
        quests.map((q) => {
          if (q.id !== questId) return q;
          const merged = updatedQuest
            ? { ...q, ...updatedQuest }
            : { ...q, ...payload };
          return {
            ...merged,
            imageUrl: q.imageUrl,
            quizId:
              updatedQuest?.quizId != null
                ? Number(updatedQuest.quizId)
                : payload.quizId,
          };
        })
      );
      toast.success("Quest updated", { id: t });
      setEditingQuest(null);
    } catch (err) {
      toast.error(err.message, { id: t });
    }
  };

  const handleDelete = async (id) => {
    setPendingDelete(null);
    const t = toast.loading("Deleting quest...");
    try {
      const token = await getToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.", { id: t });
        return;
      }
      const resp = await fetch(`${API_BASE}/quests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to delete quest");
      setQuests(quests.filter((q) => q.id !== id));
      if (editingQuest?.id === id) setEditingQuest(null);
      toast.success("Quest deleted", { id: t });
    } catch (err) {
      toast.error(err.message, { id: t });
    }
  };

  const requestDelete = (quest) => setPendingDelete(quest);
  const cancelDeletePrompt = () => setPendingDelete(null);
  const confirmDelete = () => {
    if (!pendingDelete) return;
    handleDelete(pendingDelete.id);
  };

  return (
    <div className="quests-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="quests-header">
        <h1>Manage Quests</h1>
        <div className="quest-buttons">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
          <IconButton icon="refresh" label="Refresh" onClick={loadQuests} />
          <IconButton
            icon="add"
            label="New Quest"
            onClick={() => navigate("/addQuest")}
          />
        </div>
      </div>

      {editingQuest && (
        <div className="modal-backdrop" onClick={() => setEditingQuest(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()} // prevent backdrop close
          >
            <button
              className="modal-close"
              onClick={() => setEditingQuest(null)}
            >
              ✖
            </button>

            <form
              className="login-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <div className="input-box">
                <InputField
                  type="text"
                  name="name"
                  placeholder="Quest Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="input-box">
                <InputField
                  type="text"
                  name="description"
                  placeholder="Quest Description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="input-box">
                <ComboBox
                  id="locationId"
                  name="locationId"
                  value={formData.locationId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      locationId: e.target.value || "",
                    })
                  }
                  placeholder="Select a location"
                  ariaLabel="Location"
                  options={locations.map((loc) => ({
                    value: loc.id,
                    label: loc.name,
                  }))}
                  required
                />
              </div>

              <div className="input-box">
                <ComboBox
                  id="collectibleId"
                  name="collectibleId"
                  value={formData.collectibleId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      collectibleId: e.target.value || "",
                    })
                  }
                  placeholder="Select a collectible"
                  ariaLabel="Collectible"
                  options={collectibles.map((col) => ({
                    value: col.id,
                    label: col.name,
                  }))}
                />
              </div>

              <div className="input-box">
                <ComboBox
                  id="huntId"
                  name="huntId"
                  value={formData.huntId}
                  onChange={(e) =>
                    setFormData({ ...formData, huntId: e.target.value || "" })
                  }
                  placeholder="Select a hunt"
                  ariaLabel="Hunt"
                  options={hunts.map((hunt) => ({
                    value: hunt.id,
                    label: hunt.name,
                  }))}
                />
              </div>

              <div className="input-box">
                <ComboBox
                  id="quizId"
                  name="quizId"
                  value={formData.quizId}
                  onChange={(e) =>
                    setFormData({ ...formData, quizId: e.target.value || "" })
                  }
                  placeholder="None (no quiz)"
                  ariaLabel="Quiz"
                  options={quizzes.map((quiz) => ({
                    value: quiz.id,
                    label: quiz.questionText,
                  }))}
                />
              </div>

              <div className="input-box">
                <InputField
                  type="number"
                  name="pointsAchievable"
                  placeholder="Points Achievable"
                  value={formData.pointsAchievable}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pointsAchievable: e.target.value,
                    })
                  }
                />
              </div>

              <div className="input-box checkbox">
                <label
                  htmlFor="manageQuestIsActive"
                  className={`checkbox-label${
                    formData.isActive ? " checkbox-label--checked" : ""
                  }`}
                >
                  <span>Active</span>
                  <input
                    id="manageQuestIsActive"
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                  />
                </label>
              </div>

              <div className="btn">
                <IconButton type="submit" icon="save" label="Save Quest" />
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Cancel"
                  onClick={() => setEditingQuest(null)}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-quest-title"
          onClick={cancelDeletePrompt}
        >
          <div
            className="modal login-required"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <h2 id="delete-quest-title">Delete Quest?</h2>
              <p>
                Are you sure you want to delete "
                <strong>{pendingDelete.name}</strong>"? This action cannot be
                undone.
              </p>
              <div className="modal-actions">
                <IconButton
                  icon="delete"
                  label="Delete Quest"
                  onClick={confirmDelete}
                />
                <IconButton
                  icon="close"
                  label="Cancel"
                  onClick={cancelDeletePrompt}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="quest-list">
        {quests.map((q) => (
          <div
            key={q.id}
            className="quest-card flex items-center gap-4 p-4 border rounded mb-2"
          >
            <div className="quest-profile">
              <img
                src={q.imageUrl || "https://via.placeholder.com/100"}
                alt={q.name}
                className="w-16 h-16 object-cover rounded"
              />
            </div>
            <div className="quest-info flex-1">
              <h2 className="font-bold">{q.name}</h2>
              <p>
                <strong>Points:</strong> {q.pointsAchievable}
              </p>
              <p>
                <strong>Active:</strong> {q.isActive ? "Yes" : "No"}
              </p>
              <p>
                <strong>Collectible:</strong>{" "}
                {collectibles.find((c) => c.id === q.collectibleId)?.name ||
                  "-"}
              </p>
              <p>
                <strong>Hunt:</strong>{" "}
                {hunts.find((h) => h.id === q.huntId)?.name || "-"}
              </p>
              <p>
                <strong>Quiz:</strong>{" "}
                {quizzes.find((quiz) => quiz.id === q.quizId)?.questionText ||
                  "-"}
              </p>
            </div>
            <div className="quest-action flex gap-2">
              {/* <button
                onClick={() => handleEditClick(q)}
                className="text-blue-600"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(q.id)}
                className="text-red-600"
              >
                Delete
              </button> */}
              <IconButton
                onClick={() => handleEditClick(q)}
                icon="edit"
                label="Edit"
              />
              <IconButton
                icon="delete"
                label="Delete"
                onClick={() => requestDelete(q)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
