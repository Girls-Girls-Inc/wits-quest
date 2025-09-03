import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;

export default function ManageQuests() {
  const navigate = useNavigate();
  const [quests, setQuests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [collectibles, setCollectibles] = useState([]);
  const [editingQuest, setEditingQuest] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationId: "",
    pointsAchievable: "",
    collectibleId: "",
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

  useEffect(() => {
    loadQuests();
    loadLocations();
    loadCollectibles();
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
      isActive: quest.isActive ?? true,
    });
  };

  const handleSave = async () => {
    if (!editingQuest?.id) return toast.error("Invalid quest selected");
    const t = toast.loading("Saving quest...");
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        locationId: formData.locationId || null,
        pointsAchievable: formData.pointsAchievable || 0,
        collectibleId: formData.collectibleId || null,
        isActive: formData.isActive ?? true,
      };
      const questId = Number(editingQuest.id);
      const resp = await fetch(`${API_BASE}/quests/${questId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || "Failed to update quest");

      setQuests(
        quests.map((q) =>
          q.id === questId ? { ...json.quest, imageUrl: q.imageUrl } : q
        )
      );
      toast.success("Quest updated", { id: t });
      setEditingQuest(null);
    } catch (err) {
      toast.error(err.message, { id: t });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quest?")) return;
    const t = toast.loading("Deleting quest...");
    try {
      const resp = await fetch(`${API_BASE}/quests/${id}`, {
        method: "DELETE",
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

  return (
    <div className="quests-container">
      <div className="quests-header">
        <h1>Manage Quests</h1>
        {/* <button onClick={loadQuests}>Refresh</button> */}
        <IconButton icon="refresh" label="Refresh" onClick={loadQuests} />
      </div>

      {editingQuest && (
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
            <label>Location</label>
            <select
              name="locationId"
              value={formData.locationId}
              onChange={(e) =>
                setFormData({ ...formData, locationId: e.target.value || "" })
              }
              required
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-box">
            <label>Collectible</label>
            <select
              name="collectibleId"
              value={formData.collectibleId}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  collectibleId: e.target.value || "",
                })
              }
            >
              <option value="">Select a collectible</option>
              {collectibles.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-box">
            <InputField
              type="number"
              name="pointsAchievable"
              placeholder="Points Achievable"
              value={formData.pointsAchievable}
              onChange={(e) =>
                setFormData({ ...formData, pointsAchievable: e.target.value })
              }
            />
          </div>

          <div className="input-box">
            <label>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              Active
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
                onClick={() => handleDelete(q.id)}
              />
            </div>
          </div>
        ))}
        <div className="mt-4">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
        </div>
      </div>
    </div>
  );
}
