import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import "../styles/adminDashboard.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import LocationMapPicker from "../components/LocationMapPicker";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";

const API_BASE =
  import.meta.env.VITE_WEB_URL ||
  process.env.VITE_WEB_URL ||
  "http://localhost:3000";
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

function formatCoord(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(6);
  }
  const parsed = parseFloat(value);
  if (Number.isFinite(parsed)) {
    return parsed.toFixed(6);
  }
  return "";
}

const createEmptyLocationForm = () => ({
  name: "",
  latitude: "",
  longitude: "",
  radius: "",
});

export default function ManageLocations() {
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [editingLocation, setEditingLocation] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [formData, setFormData] = useState(createEmptyLocationForm);
  const [initialFormData, setInitialFormData] = useState(
    createEmptyLocationForm
  );

  const loadLocations = async () => {
    const toastId = toast.loading("Loading locations...");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/locations`, {
        credentials: "include",
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      });
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to fetch locations");
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
      toast.success("Locations loaded", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to load locations", { id: toastId });
      setLocations([]);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const handleEditClick = (location) => {
    if (!location?.id) {
      toast.error("Invalid location selected");
      return;
    }
    setEditingLocation(location);
    const nextForm = {
      name: location.name || "",
      latitude: formatCoord(location.latitude ?? location.lat),
      longitude: formatCoord(location.longitude ?? location.lng),
      radius:
        location.radius != null && Number.isFinite(Number(location.radius))
          ? String(location.radius)
          : "",
    };
    setFormData(nextForm);
    setInitialFormData({ ...nextForm });
  };

  const handleSave = async () => {
    const token = await getToken();
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    if (!editingLocation?.id) {
      toast.error("Invalid location selected");
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);
    const radius = parseFloat(formData.radius);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error("Latitude and longitude must be valid numbers.");
      return;
    }
    if (!Number.isFinite(radius) || radius <= 0) {
      toast.error("Radius must be a positive number.");
      return;
    }

    const payload = {
      name: formData.name,
      latitude,
      longitude,
      radius,
    };

    const toastId = toast.loading("Saving location...");
    try {
      const resp = await fetch(`${API_BASE}/locations/${editingLocation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          result?.error || result?.message || "Failed to update location"
        );
      }

      setLocations((prev) =>
        prev.map((loc) =>
          Number(loc.id) === Number(editingLocation.id)
            ? { ...loc, ...result }
            : loc
        )
      );
      toast.success("Location updated", { id: toastId });
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update location", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    setPendingDelete(null);
    const token = await getToken();
    if (!token) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    const toastId = toast.loading("Deleting location...");
    try {
      const resp = await fetch(`${API_BASE}/locations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!resp.ok && resp.status !== 204) {
        const message = await resp.text();
        throw new Error(message || "Failed to delete location");
      }
      setLocations((prev) =>
        prev.filter((loc) => Number(loc.id) !== Number(id))
      );
      if (editingLocation?.id === id) closeEditModal();
      toast.success("Location deleted", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to delete location", { id: toastId });
    }
  };

  const requestDelete = (location) => setPendingDelete(location);
  const cancelDeletePrompt = () => setPendingDelete(null);
  const confirmDelete = () => {
    if (!pendingDelete?.id) return;
    handleDelete(pendingDelete.id);
  };

  const handleResetForm = () => {
    setFormData(() => ({ ...initialFormData }));
  };

  const closeEditModal = () => {
    setEditingLocation(null);
    const emptyForm = createEmptyLocationForm();
    setFormData(emptyForm);
    setInitialFormData(emptyForm);
  };

  return (
    <div className="quests-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="quests-header">
        <h1>Manage Locations</h1>
        <div className="quest-buttons">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
          <IconButton icon="refresh" label="Refresh" onClick={loadLocations} />
          <IconButton
            icon="add"
            label="New Location"
            onClick={() => navigate("/addLocation")}
          />
        </div>
      </div>

      {editingLocation && (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeEditModal}>
              ✖
            </button>

            <div className="modal-body">
              <form
                className="login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="form-row">
                  <label htmlFor="location-name">Location Name</label>
                  <InputField
                    id="location-name"
                    type="text"
                    name="name"
                    placeholder="Location Name"
                    icon="badge"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="form-row">
                  <label>Update Coordinates</label>
                  <LocationMapPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={({ lat, lng }) =>
                      setFormData((prev) => ({
                        ...prev,
                        latitude: lat.toFixed(6),
                        longitude: lng.toFixed(6),
                      }))
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="location-latitude">Latitude</label>
                  <div className="input-wrapper">
                    <input
                      id="location-latitude"
                      name="latitude"
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={formData.latitude}
                      readOnly
                      className="input-field"
                    />
                    <i className="material-symbols-outlined">
                      globe_location_pin
                    </i>
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="location-longitude">Longitude</label>
                  <div className="input-wrapper">
                    <input
                      id="location-longitude"
                      name="longitude"
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={formData.longitude}
                      readOnly
                      className="input-field"
                    />
                    <i className="material-symbols-outlined">
                      globe_location_pin
                    </i>
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="location-radius">Radius (meters)</label>
                  <div className="input-wrapper">
                    <input
                      id="location-radius"
                      name="radius"
                      type="number"
                      step="any"
                      placeholder="Radius"
                      value={formData.radius}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          radius: e.target.value,
                        }))
                      }
                      className="input-field"
                    />
                    <i className="material-symbols-outlined">lens_blur</i>
                  </div>
                </div>

                <div className="modal-form-actions">
                  <IconButton type="submit" icon="save" label="Save Location" />
                  <IconButton
                    type="button"
                    icon="restart_alt"
                    label="Reset"
                    onClick={handleResetForm}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-location-title"
          onClick={cancelDeletePrompt}
        >
          <div
            className="modal login-required"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-body">
              <h2 id="delete-location-title">Delete Location?</h2>
              <p>
                Are you sure you want to delete "
                <strong>{pendingDelete.name}</strong>"? This action cannot be
                undone.
              </p>
              <div className="modal-actions">
                <IconButton
                  icon="delete"
                  label="Delete Location"
                  onClick={confirmDelete}
                />
                <IconButton
                  icon="restart_alt"
                  label="Reset"
                  onClick={cancelDeletePrompt}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="quest-list">
        {locations.map((location) => (
          <div key={location.id} className="quest-card">
            <div className="quest-info ">
              <h2 className="font-bold">{location.name}</h2>
              <p>
                <strong>Latitude:</strong>{" "}
                {formatCoord(location.latitude ?? location.lat) || "-"}
              </p>
              <p>
                <strong>Longitude:</strong>{" "}
                {formatCoord(location.longitude ?? location.lng) || "-"}
              </p>
              <p>
                <strong>Radius (m):</strong>{" "}
                {location.radius != null ? location.radius : "-"}
              </p>
            </div>
            <div className="quest-action flex gap-2">
              <IconButton
                onClick={() => handleEditClick(location)}
                icon="edit"
                label="Edit"
              />
              <IconButton
                icon="delete"
                label="Delete"
                onClick={() => requestDelete(location)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
