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
import ComboBox from "../components/ComboBox";

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

const createQuestDefaults = () => ({
  name: "",
  description: "",
  collectibleId: "",
  locationId: "",
  huntId: "",
  quizId: "",
  pointsAchievable: "",
  isActive: true,
});

const AddQuest = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questData, setQuestData] = useState(createQuestDefaults);
  const [collectibles, setCollectibles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [hunts, setHunts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data?.user ?? null);
    })();
  }, []);

  useEffect(() => {
    const safeJson = async (res, label) => {
      if (!res) return [];
      try {
        const bodyText = await res.text();
        if (!res.ok) {
          console.error(`${label}: ${bodyText || res.status}`);
          return [];
        }
        if (!bodyText) return [];
        return JSON.parse(bodyText);
      } catch (err) {
        console.error(`${label}:`, err);
        return [];
      }
    };

    const fetchOptions = async () => {
      try {
        const token = await getToken();
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
        const authedOptions = {
          credentials: "include",
          ...(token ? { headers: authHeaders } : {}),
        };

        const [collectRes, locRes, huntRes] = await Promise.all([
          fetch(`${API_BASE}/collectibles`, { credentials: "include" }),
          fetch(`${API_BASE}/locations`, { credentials: "include" }),
          fetch(`${API_BASE}/hunts`, authedOptions),
        ]);

        const quizzesRes = token
          ? await fetch(`${API_BASE}/quizzes`, authedOptions)
          : null;

        const [collectiblesData, locationsData, huntsData] = await Promise.all([
          safeJson(collectRes, "Failed to fetch collectibles"),
          safeJson(locRes, "Failed to fetch locations"),
          safeJson(huntRes, "Failed to fetch hunts"),
        ]);

        const quizzesData = quizzesRes
          ? await safeJson(quizzesRes, "Failed to fetch quizzes")
          : [];

        setCollectibles(Array.isArray(collectiblesData) ? collectiblesData : []);
        setLocations(Array.isArray(locationsData) ? locationsData : []);
        setHunts(Array.isArray(huntsData) ? huntsData : []);
        setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
      } catch (err) {
        toast.error("Failed to load quest options");
        console.error(err);
      }
    };

    fetchOptions();
  }, []);

  const handleQuestChange = (e) => {
    const { name, value, type, checked } = e.target;
    setQuestData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => setQuestData(createQuestDefaults());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!user) return toast.error("You must be logged in");

    const token = await getToken();
    if (!token) {
      toast.error("Your session expired. Please sign in again.");
      return;
    }

    const payload = {
      ...questData,
      createdBy: user.id,
      pointsAchievable: Number(questData.pointsAchievable) || 0,
      locationId: questData.locationId ? Number(questData.locationId) : null,
      collectibleId: questData.collectibleId
        ? Number(questData.collectibleId)
        : null,
      huntId: questData.huntId ? Number(questData.huntId) : null,
      quizId: questData.quizId ? Number(questData.quizId) : null,
    };

    setLoading(true);
    const toastId = toast.loading("Creating quest...");
    try {
      const res = await fetch(`${API_BASE}/quests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create quest");

      toast.success("Quest created successfully!", { id: toastId });
      resetForm();
      navigate("/adminDashboard");
    } catch (err) {
      toast.error(err.message || "Failed to create quest", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Create Quest</h1>
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
            icon="question_mark"
            type="text"
            name="name"
            placeholder="Quest Name"
            value={questData.name}
            onChange={handleQuestChange}
            required
          />
        </div>
        <div className="input-box">
          <InputField
            icon="description"
            type="text"
            name="description"
            placeholder="Quest Description"
            value={questData.description}
            onChange={handleQuestChange}
            required
          />
        </div>
        <div className="input-box">
          <label htmlFor="collectibleId">Collectible</label>
          <ComboBox
            id="collectibleId"
            name="collectibleId"
            value={questData.collectibleId}
            onChange={handleQuestChange}
            placeholder="Select a collectible"
            options={collectibles.map((collectible) => ({
              value: collectible.id,
              label: collectible.name,
            }))}
          />
        </div>
        <div className="input-box">
          <label htmlFor="locationId">Location</label>
          <ComboBox
            id="locationId"
            name="locationId"
            value={questData.locationId}
            onChange={handleQuestChange}
            placeholder="Select a location"
            options={locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
          />
        </div>
        <div className="input-box">
          <label htmlFor="huntId">Hunt</label>
          <ComboBox
            id="huntId"
            name="huntId"
            value={questData.huntId}
            onChange={handleQuestChange}
            placeholder="Select a hunt"
            options={hunts.map((hunt) => ({
              value: hunt.id,
              label: hunt.name,
            }))}
          />
        </div>
        <div className="input-box">
          <label htmlFor="quizId">Quiz</label>
          <ComboBox
            id="quizId"
            name="quizId"
            value={questData.quizId}
            onChange={handleQuestChange}
            placeholder="Select a quiz"
            options={quizzes.map((quiz) => ({
              value: quiz.id,
              label: quiz.questionText || `Quiz ${quiz.id}`,
            }))}
          />
        </div>
        <div className="input-box">
          <InputField
            type="number"
            name="pointsAchievable"
            placeholder="Points Achievable"
            value={questData.pointsAchievable}
            onChange={handleQuestChange}
          />
        </div>
        <div className="input-box checkbox">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={questData.isActive}
              onChange={handleQuestChange}
            />
            Active
          </label>
        </div>
        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon="save"
            label={loading ? "Saving..." : "Create Quest"}
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

export default AddQuest;
