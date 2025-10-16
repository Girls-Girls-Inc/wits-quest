import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";

const API_BASE = import.meta.env.VITE_WEB_URL;
const TOAST_OPTIONS = {
  style: {
    background: "#002d73",
    color: "#ffb819",
  },
  success: {
    style: { background: "green", color: "white" },
  },
  error: {
    style: { background: "red", color: "white" },
  },
  loading: {
    style: { background: "#002d73", color: "#ffb819" },
  },
};

const AddCollectiable = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "imageUrl") setImageError(false);
  };

  // --- Upload image to Supabase Storage ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Upload to 'badges' bucket
      const { error: uploadError } = await supabase.storage
        .from("badges")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from("badges").getPublicUrl(filePath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Failed to get public URL");

      setForm((prev) => ({ ...prev, imageUrl: publicUrl }));
      toast.success("Image uploaded successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleImageError = () => setImageError(true);
  const handleImageLoad = () => setImageError(false);

  const resetForm = () => {
    setForm({ name: "", description: "", imageUrl: "" });
    setImageError(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    if (!name) {
      toast.error("Collectible name is required");
      return;
    }

    if (form.imageUrl && imageError) {
      toast.error("Please provide a valid image");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Session expired. Please sign in again.");

      const payload = {
        name,
        description: form.description.trim() || null,
        imageUrl: form.imageUrl || null,
      };

      const res = await fetch(`${API_BASE}/collectibles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Failed to create collectible");
      }

      toast.success("Collectible created successfully");
      resetForm();
      navigate("/manageCollectibles");
    } catch (err) {
      toast.error(err?.message || "Failed to create collectible");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />

      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Create Collectible</h1>
          <div className="admin-header__actions">
            <IconButton
              type="button"
              icon="arrow_back"
              label="Back to Collectibles"
              onClick={() => navigate("/manageCollectibles")}
            />
          </div>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <InputField
          type="text"
          name="name"
          placeholder="Collectible Name"
          value={form.name}
          onChange={(event) => handleFieldChange("name", event.target.value)}
          icon="badge"
          required
        />

        <InputField
          type="text"
          name="description"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(event) =>
            handleFieldChange("description", event.target.value)
          }
          icon="description"
        />

        {/* Upload Image */}
        <div className="input-box">
          <label>Upload Image (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
          />
          {uploading && <p>Uploading image...</p>}
        </div>

        {form.imageUrl && (
          <div className="input-box">
            <label>Image Preview</label>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "1rem",
                border: "2px dashed #ccc",
                borderRadius: "8px",
                minHeight: "200px",
                backgroundColor: "#f9f9f9",
              }}
            >
              {!imageError ? (
                <img
                  src={form.imageUrl}
                  alt="Collectible preview"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  style={{
                    maxWidth: "200px",
                    maxHeight: "200px",
                    objectFit: "contain",
                    borderRadius: "4px",
                  }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "#999" }}>
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: "48px" }}
                  >
                    broken_image
                  </i>
                  <p>Invalid image</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon={submitting ? "hourglass_bottom" : "save"}
            label={submitting ? "Creating..." : "Create Collectible"}
            disabled={submitting || uploading}
          />
          <IconButton
            type="button"
            icon="restart_alt"
            label="Reset"
            onClick={resetForm}
            disabled={submitting || uploading}
          />
        </div>
      </form>
    </div>
  );
};

export default AddCollectiable;
