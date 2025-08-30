// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import SignupImage from "../assets/signup.png";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL; // backend base URL

const AdminDashboard = () => {
  const [isActive, setIsActive] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  const [collectibles, setCollectibles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);

  const [questData, setQuestData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    collectibleId: "",
    locationId: "",
    pointsAchievable: "",
    isActive: true,
  });

  const [locationData, setLocationData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "",
  });

  // Signed-in Supabase user (for createdBy)
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUser(data?.user ?? null);
      else console.error(error);
    })();
  }, []);

  // Fetch options + users on mount
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [collectibleRes, locationRes] = await Promise.all([
          fetch(`${API_BASE}/collectibles`, { credentials: "include" }),
          fetch(`${API_BASE}/locations`, { credentials: "include" }),
        ]);

        if (!collectibleRes.ok) throw new Error("Failed to fetch collectibles");
        if (!locationRes.ok) throw new Error("Failed to fetch locations");

        const [collectiblesData, locationsData] = await Promise.all([
          collectibleRes.json(),
          locationRes.json(),
        ]);

        setCollectibles(Array.isArray(collectiblesData) ? collectiblesData : []);
        setLocations(Array.isArray(locationsData) ? locationsData : []);
      } catch (err) {
        console.error("Error fetching options:", err);
        setCollectibles([]);
        setLocations([]);
      }
    };

    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE}/users`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching users:", err);
        setUsers([]);
      }
    };

    fetchOptions();
    fetchUsers();
  }, []);

  const handleTaskClick = (task) => setSelectedTask(task);

  const handleBack = () => {
    setSelectedTask(null);
    setIsActive(true);
    setQuestData({
      name: "",
      description: "",
      imageUrl: "",
      collectibleId: "",
      locationId: "",
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

  const handleQuestSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in to create a quest");

    const questInsert = {
      ...questData,
      createdBy: user.id,
      pointsAchievable: parseInt(questData.pointsAchievable, 10) || 0,
    };

    try {
      const res = await fetch(`${API_BASE}/quests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(questInsert),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create quest");

      alert(`Quest "${result.name}" created successfully!`);
      handleBack();
    } catch (err) {
      alert(`Failed to create quest: ${err.message}`);
    }
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("You must be logged in to create a location");

    const locationInsert = {
      ...locationData,
      latitude: parseFloat(locationData.latitude),
      longitude: parseFloat(locationData.longitude),
      radius: parseFloat(locationData.radius),
    };

    try {
      const res = await fetch(`${API_BASE}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(locationInsert),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Failed to create location");

      alert(`Location "${result.name}" created successfully!`);
      handleBack();
    } catch (err) {
      alert(`Failed to create location: ${err.message}`);
    }
  };

  const handleToggleModerator = async (userId, newStatus) => {
    try {
      // Optimistic UI
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, isModerator: newStatus } : u))
      );

      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isModerator: newStatus }),
      });

      if (!res.ok) {
        // Revert on failure
        setUsers((prev) =>
          prev.map((u) => (u.userId === userId ? { ...u, isModerator: !newStatus } : u))
        );
        throw new Error(await res.text());
      }
    } catch (err) {
      alert(`Failed to update user: ${err.message}`);
    }
  };

  return (
    <div className={`container${isActive ? " active" : ""}`}>
      <Toaster />
      <div className="form-box login">
        {!selectedTask ? (
          <div className="admin-menu">
            <div className="admin-buttons">
              <IconButton
                icon="task"
                label="Quest Creation"
                onClick={() => handleTaskClick("Quest Creation")}
              />
              <IconButton
                icon="place"
                label="Location Creation"
                onClick={() => handleTaskClick("Location Creation")}
              />
              <IconButton
                icon="badge"
                label="Create Badge"
                onClick={() => handleTaskClick("Badge Creation")}
              />
              <IconButton
                icon="admin_panel_settings"
                label="Admin Privilege"
                onClick={() => handleTaskClick("Admin Privilege")}
              />
            </div>
          </div>
        ) : (
          <div className="task-panel signup">
            <h1>{selectedTask}</h1>

            {selectedTask === "Quest Creation" && (
              <form className="login-form" onSubmit={handleQuestSubmit}>
                <div className="input-box">
                  <InputField
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
                    type="text"
                    name="description"
                    placeholder="Quest Description"
                    value={questData.description}
                    onChange={handleQuestChange}
                    required
                  />
                </div>
                <div className="input-box">
                  <InputField
                    type="text"
                    name="imageUrl"
                    placeholder="Image URL"
                    value={questData.imageUrl}
                    onChange={handleQuestChange}
                  />
                </div>

                <div className="input-box">
                  <label>Collectible</label>
                  <select
                    name="collectibleId"
                    value={questData.collectibleId}
                    onChange={handleQuestChange}
                    required
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
                    required
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
                        setQuestData((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>

                <div className="btn">
                  <IconButton type="submit" icon="save" label="Create Quest" />
                  <IconButton
                    type="button"
                    onClick={handleBack}
                    icon="arrow_back"
                    label="Back"
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
                    required
                  />
                </div>
                <div className="input-box">
                  <InputField
                    type="number"
                    step="any"
                    name="latitude"
                    placeholder="Latitude"
                    value={locationData.latitude}
                    onChange={handleLocationChange}
                    required
                  />
                </div>
                <div className="input-box">
                  <InputField
                    type="number"
                    step="any"
                    name="longitude"
                    placeholder="Longitude"
                    value={locationData.longitude}
                    onChange={handleLocationChange}
                    required
                  />
                </div>
                <div className="input-box">
                  <InputField
                    type="number"
                    step="any"
                    name="radius"
                    placeholder="Radius"
                    value={locationData.radius}
                    onChange={handleLocationChange}
                    required
                  />
                </div>
                <div className="btn">
                  <IconButton type="submit" icon="save" label="Create Location" />
                  <IconButton
                    type="button"
                    onClick={handleBack}
                    icon="arrow_back"
                    label="Back"
                  />
                </div>
              </form>
            )}

            {selectedTask === "Admin Privilege" && (
              <div className="task-panel signup">
                <h1>Admin Privileges</h1>
                <p>Promote or remove users as moderators.</p>

                <div style={{ maxHeight: "400px", overflow: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      minWidth: "600px",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "8px" }}>Email</th>
                        <th style={{ textAlign: "left", padding: "8px" }}>Is Moderator</th>
                        <th style={{ textAlign: "left", padding: "8px" }}>Created At</th>
                        <th style={{ textAlign: "left", padding: "8px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId}>
                          <td style={{ padding: "8px" }}>{u.email}</td>
                          <td style={{ padding: "8px" }}>{u.isModerator ? "Yes" : "No"}</td>
                          <td style={{ padding: "8px" }}>
                            {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <button
                              type="button"
                              onClick={() => handleToggleModerator(u.userId, !u.isModerator)}
                              style={{
                                backgroundColor: u.isModerator ? "#ff4d4f" : "#4caf50",
                                color: "#fff",
                                border: "none",
                                padding: "4px 8px",
                                cursor: "pointer",
                                borderRadius: "4px",
                              }}
                            >
                              {u.isModerator ? "Remove Moderator" : "Make Moderator"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="btn">
                  <IconButton
                    type="button"
                    onClick={handleBack}
                    icon="arrow_back"
                    label="Back"
                  />
                </div>
              </div>
            )}

            {selectedTask === "Badge Creation" && (
              <form className="user-form" onSubmit={(e) => e.preventDefault()}>
                <div className="btn">
                  <IconButton
                    type="button"
                    onClick={handleBack}
                    icon="arrow_back"
                    label="Back"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="toggle">
        <div className={`toggle-panel ${selectedTask ? "toggle-left" : "toggle-right"}`}>
          <img src={SignupImage} alt="Quest" />
          {!selectedTask ? (
            <>
              <h1>Select a Task</h1>
              <p>What would you like to do?</p>
            </>
          ) : (
            <>
              <h1>{selectedTask} Panel</h1>
              <p>Detailed view of {selectedTask} operations.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
