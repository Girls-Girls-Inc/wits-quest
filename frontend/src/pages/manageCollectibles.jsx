import React, { useEffect, useState } from "react";
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
const TOAST_OPTIONS = {
  style: { background: "#002d73", color: "#ffb819" },
  success: { style: { background: "green", color: "white" } },
  error: { style: { background: "red", color: "white" } },
  loading: { style: { background: "#002d73", color: "#ffb819" } },
};

const createDefaultBadgeForm = () => ({
  name: "",
  description: "",
  imageUrl: "",
});

export default function ManageBadges() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [editingBadge, setEditingBadge] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState(createDefaultBadgeForm);
  const [initialFormData, setInitialFormData] = useState(
    createDefaultBadgeForm
  );
  const [uploading, setUploading] = useState(false);

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

      if (!res.ok)
        throw new Error((await res.text()) || "Failed to fetch badges");

      const payload = await res.json();
      setBadges(Array.isArray(payload) ? payload : []);
      toast.dismiss(toastId);
    } catch (err) {
      toast.error(err.message || "Failed to load badges", { id: toastId });
      setBadges([]);
    }
  };

  useEffect(() => {
    loadBadges();
  }, []);

  const handleCloseModal = () => {
    setEditingBadge(null);
    setShowEditModal(false);
    setFormData(createDefaultBadgeForm());
    setInitialFormData(createDefaultBadgeForm());
  };

  const handleResetForm = () => setFormData({ ...initialFormData });

  const handleEditClick = (badge) => {
    if (!badge?.id) return toast.error("Invalid badge selected");
    setEditingBadge(badge);
    const preparedForm = {
      name: badge.name || "",
      description: badge.description || "",
      imageUrl: badge.imageUrl || "",
    };
    setInitialFormData(preparedForm);
    setFormData(preparedForm);
    setShowEditModal(true);
  };

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ Handle image file upload to Supabase "badges" bucket
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const toastId = toast.loading("Uploading image...");

    try {
      const filePath = `badge-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("badges") // your storage bucket name
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("badges")
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl)
        throw new Error("Failed to retrieve image URL");

      setFormData((prev) => ({ ...prev, imageUrl: publicData.publicUrl }));
      toast.success("Image uploaded successfully", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Image upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
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
      handleCloseModal();
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

      if (!res.ok)
        throw new Error((await res.text()) || "Failed to delete badge");

      toast.success("Badge deleted", { id: toastId });
      setBadges((prev) => prev.filter((b) => b.id !== id));
      if (editingBadge?.id === id) handleCloseModal();
    } catch (err) {
      toast.error(err.message || "Failed to delete badge", { id: toastId });
    }
  };

  return (
    <div className="quests-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="quests-header">
        <h1>Manage Collectibles</h1>
        <div className="quest-buttons">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
          <IconButton icon="refresh" label="Refresh" onClick={loadBadges} />
          <IconButton
            icon="add"
            label="New Badge"
            onClick={() => navigate("/addCollectible")}
          />
        </div>
      </div>

      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <button
              className="modal-close"
              onClick={handleCloseModal}
              aria-label="Close modal"
            >
              ✖
            </button>

            <div className="modal-body">
              <form
                className="login-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSave();
                }}
              >
                <div className="form-row">
                  <label htmlFor="badge-name">Badge Name</label>
                  <InputField
                    id="badge-name"
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
                </div>

                <div className="form-row">
                  <label htmlFor="badge-description">Description</label>
                  <InputField
                    id="badge-description"
                    type="text"
                    name="description"
                    placeholder="Description (optional)"
                    value={formData.description}
                    onChange={(event) =>
                      handleFieldChange("description", event.target.value)
                    }
                    icon="description"
                    required={false}
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="badge-image-upload">Upload New Image</label>
                  <div className="form-row-column">
                    <input
                      id="badge-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      style={{ marginBottom: "10px" }}
                    />
                  </div>
                </div>

                {formData.imageUrl && (
                  <div className="form-row">
                    <label>Preview</label>
                    <div className="form-row-column">
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
                    </div>
                  </div>
                )}

                <div className="modal-form-actions">
                  <IconButton
                    type="submit"
                    icon="save"
                    label={uploading ? "Uploading..." : "Save Badge"}
                    disabled={uploading}
                  />
                  <IconButton
                    type="button"
                    icon="restart_alt"
                    label="Reset"
                    onClick={handleResetForm}
                    disabled={uploading}
                  />
                </div>
              </form>
            </div>
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
      </div>
    </div>
  );
}
