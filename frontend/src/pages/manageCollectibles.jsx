import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import supabase from "../supabase/supabaseClient";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import "../styles/profile.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;

export default function ManageBadges() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [editingBadge, setEditingBadge] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadBadges = async () => {
    const toastId = toast.loading("Loading badges...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      
      const res = await fetch(`${API_BASE}/collectibles`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to fetch badges");
      }
      
      const payload = await res.json();
      setBadges(Array.isArray(payload) ? payload : []);
    } catch (err) {
      toast.error(err.message || "Failed to load badges", { id: toastId });
      setBadges([]);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const resetForm = () => {
    setEditingBadge(null);
    setShowEditModal(false);
    setFormData({
      name: "",
      description: "",
      imageUrl: "",
    });
  };

  const handleEditClick = (badge) => {
    if (!badge?.id) return toast.error("Invalid badge selected");
    setEditingBadge(badge);
    setFormData({
      name: badge.name || "",
      description: badge.description || "",
      imageUrl: badge.imageUrl || "",
    });
    setShowEditModal(true);
  };

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!editingBadge?.id) return toast.error("Invalid badge selected");

    const name = formData.name.trim();
    if (!name) return toast.error("Badge name is required");

    const toastId = toast.loading("Saving badge...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      const payload = {
        name,
        description: formData.description?.trim() || null,
        imageUrl: formData.imageUrl?.trim() || null,
      };

      const res = await fetch(`${API_BASE}/collectibles/${editingBadge.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Failed to update badge");

      toast.success("Badge updated", { id: toastId });
      setBadges((prev) =>
        prev.map((b) => (b.id === editingBadge.id ? body : b))
      );
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to update badge", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!confirm("Delete this badge?")) return;
    
    const toastId = toast.loading("Deleting badge...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      
      const res = await fetch(`${API_BASE}/collectibles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to delete badge");
      }
      
      toast.success("Badge deleted", { id: toastId });
      setBadges((prev) => prev.filter((b) => b.id !== id));
      if (editingBadge?.id === id) {
        resetForm();
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete badge", { id: toastId });
    }
  };

  return (
    <div className="quests-container">
      <Toaster />
      <div className="quests-header">
        <h1>Manage Badges</h1>
        <div className="flex gap-2">
          <IconButton icon="refresh" label="Refresh" onClick={loadBadges} />
          <IconButton
            icon="add"
            label="New Badge"
            onClick={() => navigate("/addBadge")}
          />
        </div>
      </div>

      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="modal-close"
              onClick={resetForm}
              aria-label="Close modal"
            >
              ✖
            </button>

            <form
              className="login-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSave();
              }}
            >
              <InputField
                type="text"
                name="name"
                placeholder="Badge Name"
                value={formData.name}
                onChange={(event) =>
                  handleFieldChange("name", event.target.value)
                }
                icon="badge"
                required
              />

              <InputField
                type="text"
                name="description"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(event) =>
                  handleFieldChange("description", event.target.value)
                }
                icon="description"
              />

              <InputField
                type="text"
                name="imageUrl"
                placeholder="Image URL (optional)"
                value={formData.imageUrl}
                onChange={(event) =>
                  handleFieldChange("imageUrl", event.target.value)
                }
                icon="image"
              />

              {formData.imageUrl && (
                <div className="image-preview">
                  <img
                    src={formData.imageUrl}
                    alt="Badge preview"
                    style={{ maxWidth: "200px", maxHeight: "200px" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      toast.error("Invalid image URL");
                    }}
                  />
                </div>
              )}

              <div className="btn flex gap-2">
                <IconButton type="submit" icon="save" label="Save Badge" />
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Cancel"
                  onClick={resetForm}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="quest-list">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="quest-card flex items-start gap-4 p-4 border rounded mb-2"
          >
            {badge.imageUrl && (
              <img
                src={badge.imageUrl}
                alt={badge.name}
                style={{ width: "64px", height: "64px", objectFit: "cover" }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            )}
            <div className="quest-info flex-1">
              <h2 className="font-bold">{badge.name}</h2>
              {badge.description && <p>{badge.description}</p>}
              <p className="text-sm text-gray-500">
                Created: {new Date(badge.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="quest-action flex gap-2">
              <IconButton
                icon="edit"
                label="Edit"
                onClick={() => handleEditClick(badge)}
              />
              <IconButton
                icon="delete"
                label="Delete"
                onClick={() => handleDelete(badge.id)}
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
