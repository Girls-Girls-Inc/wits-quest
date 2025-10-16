import React, { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import LocationMapPicker from "../components/LocationMapPicker";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";

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

const createLocationDefaults = () => ({
  name: "",
  latitude: "",
  longitude: "",
  radius: "",
});

const AddLocation = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [locationData, setLocationData] = useState(createLocationDefaults);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data?.user ?? null);
    })();
  }, []);

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePositionChange = ({ lat, lng }) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setLocationData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
  };

  const resetForm = () => setLocationData(createLocationDefaults());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!user) return toast.error("You must be logged in");

    const payload = {
      ...locationData,
      latitude: parseFloat(locationData.latitude),
      longitude: parseFloat(locationData.longitude),
      radius: parseFloat(locationData.radius),
    };

    if (
      !Number.isFinite(payload.latitude) ||
      !Number.isFinite(payload.longitude)
    ) {
      toast.error("Please drop a pin on the map to set the coordinates.");
      return;
    }

    if (!Number.isFinite(payload.radius) || payload.radius <= 0) {
      toast.error("Radius must be a positive number.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating location...");
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Your session expired.");

      const res = await fetch(`${API_BASE}/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create location");

      toast.success("Location created successfully!", { id: toastId });
      resetForm();
      navigate("/adminDashboard");
    } catch (err) {
      toast.error(err.message || "Failed to create location", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Create Location</h1>
          <div className="admin-header__actions">
            <IconButton
              type="button"
              icon="arrow_back"
              label="Back to Admin"
              onClick={() => navigate("/adminDashboard")}
            />
          </div>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-box">
          <label htmlFor="location-map" className="map-label">
            Drop a pin to set latitude & longitude
          </label>
          <LocationMapPicker
            latitude={locationData.latitude}
            longitude={locationData.longitude}
            onChange={handlePositionChange}
            height="300px"
          />
        </div>
        <div className="input-box">
          <InputField
            type="text"
            name="name"
            placeholder="Location Name"
            value={locationData.name}
            onChange={handleLocationChange}
            icon="globe"
            required
          />
        </div>
        <div className="input-box">
          <label htmlFor="location-latitude">Latitude</label>
          <div className="input-wrapper">
            <input
              id="location-latitude"
              name="latitude"
              type="number"
              step="any"
              placeholder="Latitude"
              value={locationData.latitude}
              readOnly
              className="input-field"
            />
            <i className="material-symbols-outlined">globe_location_pin</i>
          </div>
        </div>
        <div className="input-box">
          <label htmlFor="location-longitude">Longitude</label>
          <div className="input-wrapper">
            <input
              id="location-longitude"
              name="longitude"
              type="number"
              step="any"
              placeholder="Longitude"
              value={locationData.longitude}
              readOnly
              className="input-field"
            />
            <i className="material-symbols-outlined">globe_location_pin</i>
          </div>
        </div>
        <div className="input-box">
          <label htmlFor="location-radius">Radius</label>
          <div className="input-wrapper">
            <input
              id="location-radius"
              name="radius"
              type="number"
              step="any"
              placeholder="Radius"
              value={locationData.radius}
              onChange={handleLocationChange}
              required
              className="input-field"
            />
            <i className="material-symbols-outlined">lens_blur</i>
          </div>
        </div>
        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon="save"
            label={loading ? "Saving..." : "Create Location"}
            disabled={loading}
          />
          <IconButton
            type="button"
            icon="restart_alt"
            label="Reset"
            onClick={resetForm}
            disabled={loading}
          />
        </div>
      </form>
    </div>
  );
};

export default AddLocation;
