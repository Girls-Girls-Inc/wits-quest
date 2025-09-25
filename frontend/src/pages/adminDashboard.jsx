import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);
  const [quests, setQuests] = useState([]);
  const [collectibles, setCollectibles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const [questData, setQuestData] = useState({
    name: "",
    description: "",
    collectibleId: "",
    locationId: "",
    huntId: "",
    quizId: "",
    pointsAchievable: "",
    isActive: true,
  });

  const [locationData, setLocationData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "",
  });

  const [huntData, setHuntData] = useState({
    name: "",
    description: "",
    question: "",
    answer: "",
    timeLimit: "",
  });

  // Signed-in Supabase user
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data?.user ?? null);
    })();
  }, []);

  // Fetch collectibles, locations, and users
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = await getToken();
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
        const authedOptions = {
          credentials: "include",
          ...(authHeaders ? { headers: authHeaders } : {}),
        };

        const [collectRes, locRes, huntRes] = await Promise.all([
          fetch(`${API_BASE}/collectibles`, { credentials: "include" }),
          fetch(`${API_BASE}/locations`, { credentials: "include" }),
          fetch(`${API_BASE}/hunts`, authedOptions),
        ]);

        const quizzesRes = token
          ? await fetch(`${API_BASE}/quizzes`, authedOptions)
          : null;

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
          } catch (parseErr) {
            console.error(`${label}:`, parseErr);
            return [];
          }
        };

        const [collectiblesData, locationsData, huntsData] = await Promise.all([
          safeJson(collectRes, "Failed to fetch collectibles"),
          safeJson(locRes, "Failed to fetch locations"),
          safeJson(huntRes, "Failed to fetch hunts"),
        ]);

        const quizzesData = quizzesRes
          ? await safeJson(quizzesRes, "Failed to fetch quizzes")
          : [];

        setCollectibles(
          Array.isArray(collectiblesData) ? collectiblesData : []
        );
        setLocations(Array.isArray(locationsData) ? locationsData : []);
        setHunts(Array.isArray(huntsData) ? huntsData : []);
        setQuizzes(Array.isArray(quizzesData) ? quizzesData : []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchUsers = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/users`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        toast.error(`Failed to load users: ${err.message}`);
      }
    };

    fetchOptions();
    fetchUsers();
  }, []);

  const handleBack = () => {
    setSelectedTask(null);
    setQuestData({
      name: "",
      description: "",
      collectibleId: "",
      locationId: "",
      huntId: "",
      quizId: "",
      pointsAchievable: "",
      isActive: true,
    });
    setLocationData({
      name: "",
      latitude: "",
      longitude: "",
      radius: "",
    });
  };

  const handleQuestChange = (e) => {
    const { name, value } = e.target;
    setQuestData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("You must be logged in");

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Your session expired. Please sign in again.");
      return;
    }

    const questInsert = {
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

    try {
      const res = await fetch(`${API_BASE}/quests`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
        credentials: "include",
        body: JSON.stringify(questInsert),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create quest");
      toast.success(`Quest created successfully!`);
      handleBack();
    } catch (err) {
      toast.error(`Failed to create quest: ${err.message}`);
    }
  };

  

  const handleLocationSubmit = async (e) => {

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      toast.error("Your session expired. Please sign in again.");
      return;
    }
    e.preventDefault();
    if (!user) return toast.error("You must be logged in");

    const locationInsert = {
      ...locationData,
      latitude: parseFloat(locationData.latitude),
      longitude: parseFloat(locationData.longitude),
      radius: parseFloat(locationData.radius),
    };

    try {
      const res = await fetch(`${API_BASE}/locations`, {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
        credentials: "include",
        body: JSON.stringify(locationInsert),
      });
      const result = await res.json();

      if (!res.ok) {
      const msg = result?.error || result?.message || "Failed to create location";
      throw new Error(msg);
    }
    toast.success(`Location created successfully!`);
    handleBack();
    } catch (err) {
      toast.error(`Failed to create location: ${err.message}`);
    }
  };

  const handleToggleModerator = async (userId, newStatus) => {
    try {
      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, isModerator: newStatus } : u
        )
      );

      const token = await getToken();
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isModerator: newStatus }),
      });

      if (!res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.userId === userId ? { ...u, isModerator: !newStatus } : u
          )
        );
        throw new Error(await res.text());
      }
      toast.success("User updated!");
    } catch (err) {
      toast.error(`Failed to update user: ${err.message}`);
      console.error("DEBUG PATCH error:", err);
    }
  };

  const handleHuntChange = (e) => {
    const { name, value } = e.target;
    setHuntData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHuntSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("You must be logged in");

    const huntInsert = {
      ...huntData,
      timeLimit: huntData.timeLimit ? Number(huntData.timeLimit) : null,
    };

    try {
      const res = await fetch(`${API_BASE}/hunts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(huntInsert),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create hunt");
      toast.success(`Hunt created successfully!`);
      handleBack();
    } catch (err) {
      toast.error(`Failed to create hunt: ${err.message}`);
    }
  };

  return (
    <div className="admin-container">
      {!selectedTask ? (
        <div className="admin-header">
          <h1 className="heading">Admin Dashboard</h1>
          <div className="admin-buttons">
            <IconButton
              icon="task"
              label="Create Quest"
              onClick={() => setSelectedTask("Quest Creation")}
              className="tile-button"
            />
            <IconButton
              icon="task"
              label="Create Hunt"
              onClick={() => setSelectedTask("Hunt Creation")}
              className="tile-button"
            />
            <IconButton
              icon="quiz"
              label="Create Quiz"
              onClick={() => navigate("/addQuiz")}
              className="tile-button"
            />
            <IconButton
              icon="edit_location"
              label="Add Location"
              onClick={() => setSelectedTask("Location Creation")}
              className="tile-button"
            />
            <IconButton
              icon="admin_panel_settings"
              label="Adjust Admins"
              onClick={() => setSelectedTask("Admin Privilege")}
              className="tile-button"
            />
            <IconButton
              icon="award_star"
              label="Create Badge"
              onClick={() => setSelectedTask("Badge Creation")}
              className="tile-button"
            />
            <IconButton
              icon="star"
              label="Manage Quests"
              onClick={() => navigate("/manageQuests")}
            />
            <IconButton
              icon="quiz"
              label="Manage Quizzes"
              onClick={() => navigate("/manageQuizzes")}
            />
            <IconButton
              icon="stars"
              label="Manage Hunts"
              onClick={() => navigate("/manageHunts")}
            />
          </div>
        </div>
      ) : (
        <div>
          <h1>{selectedTask}</h1>

          {selectedTask === "Quest Creation" && (
            <form className="login-form" onSubmit={handleQuestSubmit}>
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
                <label>Collectible</label>
                <select
                  name="collectibleId"
                  value={questData.collectibleId}
                  onChange={handleQuestChange}
                >
                  <option value="">Select a collectible</option>
                  {collectibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-box">
                <label>Location</label>
                <select
                  name="locationId"
                  value={questData.locationId}
                  onChange={handleQuestChange}
                >
                  <option value="">Select a location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-box">
                <label>Hunt</label>
                <select
                  name="huntId"
                  value={questData.huntId}
                  onChange={handleQuestChange}
                >
                  <option value="">Select a hunt</option>
                  {hunts.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-box">
                <label>Quiz</label>
                <select
                  name="quizId"
                  value={questData.quizId}
                  onChange={handleQuestChange}
                >
                  <option value="">Select a quiz</option>
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.questionText || `Quiz ${quiz.id}`}
                    </option>
                  ))}
                </select>
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
              <div className="input-box">
                <label>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={questData.isActive}
                    onChange={(e) =>
                      setQuestData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-2">
                <IconButton type="submit" icon="save" label="Create Quest" />
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Back"
                  onClick={handleBack}
                />
              </div>
            </form>
          )}

          {selectedTask === "Hunt Creation" && (
            <form className="login-form" onSubmit={handleHuntSubmit}>
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
                  placeholder="Hunt Description"
                  value={huntData.description}
                  onChange={handleHuntChange}
                  required
                />
              </div>
              <div className="input-box">
                <InputField
                  icon="help"
                  type="text"
                  name="question"
                  placeholder="Hunt Question"
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
                  placeholder="Correct Answer"
                  value={huntData.answer}
                  onChange={handleHuntChange}
                  required
                />
              </div>
              <div className="input-box">
                <InputField
                  icon="timer"
                  type="number"
                  name="timeLimit"
                  placeholder="Time Limit (seconds, optional)"
                  value={huntData.timeLimit}
                  onChange={handleHuntChange}
                />
              </div>
              <div className="flex gap-2">
                <IconButton type="submit" icon="save" label="Create Hunt" />
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Back"
                  onClick={handleBack}
                />
              </div>
            </form>
          )}

          {selectedTask === "Location Creation" && (
            <form className="login-form" onSubmit={handleLocationSubmit}>
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
                <InputField
                  type="number"
                  name="latitude"
                  step="any"
                  placeholder="Latitude"
                  value={locationData.latitude}
                  onChange={handleLocationChange}
                  icon="globe_location_pin"
                  required
                />
              </div>
              <div className="input-box">
                <InputField
                  type="number"
                  name="longitude"
                  step="any"
                  placeholder="Longitude"
                  value={locationData.longitude}
                  onChange={handleLocationChange}
                  icon="globe_location_pin"
                  required
                />
              </div>
              <div className="input-box">
                <InputField
                  type="number"
                  name="radius"
                  step="any"
                  placeholder="Radius"
                  value={locationData.radius}
                  onChange={handleLocationChange}
                  icon="lens_blur"
                  required
                />
              </div>
              <div className="btn flex gap-2">
                <IconButton type="submit" icon="save" label="Create Location" />
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Back"
                  onClick={handleBack}
                />
              </div>
            </form>
          )}

          {selectedTask === "Admin Privilege" && (
            <div className="quest-list">
              <h2>Manage Admin Privileges</h2>
              {users.map((u) => (
                <div
                  key={u.userId}
                  className="quest-card flex items-center justify-between p-2 mb-2 border rounded"
                >
                  <div>
                    <strong>{u.email}</strong> (
                    {u.isModerator ? "Admin" : "User"})
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleToggleModerator(u.userId, !u.isModerator)
                      }
                      className={`px-2 py-1 rounded text-white ${
                        u.isModerator ? "btn-red" : "btn-green"
                      }`}
                    >
                      {u.isModerator ? "Remove Admin" : "Make Admin"}
                    </button>
                  </div>
                </div>
              ))}
              <div className="btn flex gap-2 mt-2">
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Back"
                  onClick={handleBack}
                />
              </div>
            </div>
          )}

          {selectedTask === "Badge Creation" && (
            <div className="quest-list">
              <h2>Badge Creation (Coming Soon)</h2>
              <div className="btn flex gap-2 mt-2">
                <IconButton
                  type="button"
                  icon="arrow_back"
                  label="Back"
                  onClick={handleBack}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;



