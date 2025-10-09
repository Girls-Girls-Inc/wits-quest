import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";

const API_BASE = import.meta.env.VITE_WEB_URL;

const AddBadge = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    imageUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "imageUrl") {
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      imageUrl: "",
    });
    setImageError(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const name = form.name.trim();
    if (!name) {
      toast.error("Badge name is required");
      return;
    }

    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();

    if (imageUrl && imageError) {
      toast.error("Please provide a valid image URL or leave it blank");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const payload = {
        name,
        description: description || null,
        imageUrl: imageUrl || null,
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
        throw new Error(body?.error || "Failed to create badge");
      }

      toast.success("Badge created successfully");
      resetForm();
      navigate("/manageCollectibles");
    } catch (err) {
      toast.error(err.message || "Failed to create badge");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster />
      <div className="admin-header">
        <h1 className="heading">Create Badge</h1>
        <IconButton
          icon="arrow_back"
          label="Back to Badges"
          onClick={() => navigate("/manageCollectibles")}
        />
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <InputField
          type="text"
          name="name"
          placeholder="Badge Name"
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

        <InputField
          type="text"
          name="imageUrl"
          placeholder="Image URL (optional)"
          value={form.imageUrl}
          onChange={(event) => handleFieldChange("imageUrl", event.target.value)}
          icon="image"
        />

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
                  alt="Badge preview"
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
                <div
                  style={{
                    textAlign: "center",
                    color: "#999",
                  }}
                >
                  <i
                    className="material-symbols-outlined"
                    style={{ fontSize: "48px" }}
                  >
                    broken_image
                  </i>
                  <p>Invalid image URL</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon={submitting ? "hourglass_bottom" : "save"}
            label={submitting ? "Creating..." : "Create Badge"}
            disabled={submitting}
          />
          <IconButton
            type="button"
            icon="restart_alt"
            label="Reset"
            onClick={resetForm}
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  );
};

export default AddBadge;
