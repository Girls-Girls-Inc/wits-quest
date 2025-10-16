import React, { useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
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

const createHuntDefaults = () => ({
  name: "",
  description: "",
  question: "",
  answer: "",
  timeLimit: "",
  collectibleId: "",
  pointsAchievable: "",
});

const AddHunt = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [huntData, setHuntData] = useState(createHuntDefaults);
  const [collectibles, setCollectibles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data?.user ?? null);
    })();
  }, []);

  useEffect(() => {
    const loadCollectibles = async () => {
      try {
        const res = await fetch(`${API_BASE}/collectibles`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setCollectibles(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Failed to load collectibles");
        console.error(err);
        setCollectibles([]);
      }
    };

    loadCollectibles();
  }, []);

  const handleHuntChange = (e) => {
    const { name, value } = e.target;
    setHuntData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => setHuntData(createHuntDefaults());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!user) return toast.error("You must be logged in");

    const payload = {
      ...huntData,
      collectibleId: huntData.collectibleId
        ? Number(huntData.collectibleId)
        : null,
      timeLimit: huntData.timeLimit ? Number(huntData.timeLimit) : null,
      pointsAchievable: Number(huntData.pointsAchievable) || 0,
    };

    setLoading(true);
    const toastId = toast.loading("Creating hunt...");
    try {
      const res = await fetch(`${API_BASE}/hunts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create hunt");

      toast.success("Hunt created successfully!", { id: toastId });
      resetForm();
      navigate("/adminDashboard");
    } catch (err) {
      toast.error(err.message || "Failed to create hunt", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Create Hunt</h1>
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
          <InputField
            icon="flag"
            type="text"
            name="name"
            placeholder="Hunt Name"
            value={huntData.name}
            onChange={handleHuntChange}
            required
          />
        </div>
        <div className="input-box">
          <InputField
            icon="description"
            type="text"
            name="description"
            placeholder="Description"
            value={huntData.description}
            onChange={handleHuntChange}
          />
        </div>
        <div className="input-box">
          <InputField
            icon="help"
            type="text"
            name="question"
            placeholder="Question"
            value={huntData.question}
            onChange={handleHuntChange}
            required
          />
        </div>
        <div className="input-box">
          <InputField
            icon="check"
            type="text"
            name="answer"
            placeholder="Answer"
            value={huntData.answer}
            onChange={handleHuntChange}
            required
          />
        </div>
        <div className="input-box">
          <InputField
            icon="schedule"
            type="number"
            name="timeLimit"
            placeholder="Time Limit (minutes)"
            value={huntData.timeLimit}
            onChange={handleHuntChange}
          />
        </div>
        <div className="input-box">
          <label>Collectible</label>
          <select
            name="collectibleId"
            value={huntData.collectibleId}
            onChange={handleHuntChange}
          >
            <option value="">Select a collectible</option>
            {collectibles.map((collectible) => (
              <option key={collectible.id} value={collectible.id}>
                {collectible.name}
              </option>
            ))}
          </select>
        </div>
        <div className="input-box">
          <InputField
            icon="star"
            type="number"
            name="pointsAchievable"
            placeholder="Points Achievable"
            value={huntData.pointsAchievable}
            onChange={handleHuntChange}
          />
        </div>
        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon="save"
            label={loading ? "Saving..." : "Create Hunt"}
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

export default AddHunt;
