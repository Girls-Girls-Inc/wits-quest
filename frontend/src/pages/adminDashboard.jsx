import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import SignupImage from "../assets/Signup.png";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL; // use your backend base URL

const AdminDashboard = () => {
  const [isActive, setIsActive] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [collectibles, setCollectibles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [questData, setQuestData] = useState({
    name: "",
    description: "",
    imageUrl: "",
    collectibleId: "",
    locationId: "",
    pointsAchievable: "",
    isActive: true,
  });
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  const [locationData, setLocationData] = useState({
    name: "",
    latitude: "",
    longitude: "",
    radius: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) console.error(error);
      else setUser(user);
    };
    fetchUser();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`); // your backend endpoint
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      if (!Array.isArray(data))
        throw new Error("Users API did not return an array");
      setUsers(data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [collectibleRes, locationRes] = await Promise.all([
          fetch(`${API_BASE}/collectibles`),
          fetch(`${API_BASE}/locations`),
        ]);

        if (!collectibleRes.ok) throw new Error("Failed to fetch collectibles");
        if (!locationRes.ok) throw new Error("Failed to fetch locations");

        const [collectiblesData, locationsData] = await Promise.all([
          collectibleRes.json(),
          locationRes.json(),
        ]);

        if (!Array.isArray(collectiblesData))
          throw new Error("Collectibles API did not return an array");
        if (!Array.isArray(locationsData))
          throw new Error("Locations API did not return an array");

        setCollectibles(collectiblesData);
        setLocations(locationsData);
      } catch (err) {
        console.error("Error fetching options:", err);
        setCollectibles([]);
        setLocations([]);
      }
    };
    fetchOptions();
  }, []);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsActive(false);
  };

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
  };

  const handleQuestChange = (e) => {
    const { name, value } = e.target;
    setQuestData({ ...questData, [name]: value });
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
    setLocationData({ ...locationData, [name]: value });
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
        body: JSON.stringify(locationInsert),
      });

      const result = await res.json();
      if (!res.ok)
        throw new Error(result.message || "Failed to create location");

      alert(`Location "${result.name}" created successfully!`);
      handleBack();
    } catch (err) {
      alert(`Failed to create location: ${err.message}`);
    }
  };

  const handleToggleModerator = async (userId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isModerator: newStatus }),
      });

      let result = {};
      const text = await res.text();
      if (text) result = JSON.parse(text);

      // update local state regardless
      setUsers(
        users.map((u) =>
          u.userId === userId ? { ...u, isModerator: newStatus } : u
        )
      );
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
              <button onClick={() => handleTaskClick("Quest Creation")}>
                Quest Creation
              </button>
              <button onClick={() => handleTaskClick("Location Creation")}>
                Location Creation
              </button>
              <button onClick={() => handleTaskClick("Badge Creation")}>
                Create Badge
              </button>
              <button onClick={() => handleTaskClick("Admin Privilege")}>
                Admin Privilege
              </button>
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
                        setQuestData({
                          ...questData,
                          isActive: e.target.checked,
                        })
                      }
                    />
                    Active
                  </label>
                </div>
                <div className="btn">
                  <IconButton type="submit" icon="save" label="Create Quest" />
                  <IconButton
                    onClick={handleBack}
                    type="return"
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
                  <IconButton
                    type="submit"
                    icon="save"
                    label="Create Location"
                  />
                  <IconButton
                    onClick={handleBack}
                    type="return"
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

                <div
                  style={{
                    maxHeight: "400px",
                    overflowY: "auto",
                    overflowX: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      minWidth: "600px",
                      borderCollapse: "collapse",
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Email
                        </th>
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Is Moderator
                        </th>
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Created At
                        </th>
                        <th style={{ textAlign: "left", padding: "8px" }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.userId}>
                          <td style={{ padding: "8px" }}>{u.email}</td>
                          <td style={{ padding: "8px" }}>
                            {u.isModerator ? "Yes" : "No"}
                          </td>
                          <td style={{ padding: "8px" }}>
                            {new Date(u.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <button
                              onClick={async () => {
                                // Optimistic UI update
                                setUsers(
                                  users.map((userItem) =>
                                    userItem.userId === u.userId
                                      ? {
                                        ...userItem,
                                        isModerator: !u.isModerator,
                                      }
                                      : userItem
                                  )
                                );
                                try {
                                  await fetch(`${API_BASE}/users/${u.userId}`, {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      isModerator: !u.isModerator,
                                    }),
                                  });
                                } catch (err) {
                                  // revert state if network fails
                                  setUsers(
                                    users.map((userItem) =>
                                      userItem.userId === u.userId
                                        ? {
                                          ...userItem,
                                          isModerator: u.isModerator,
                                        }
                                        : userItem
                                    )
                                  );
                                  alert(
                                    `Failed to update user: ${err.message}`
                                  );
                                }
                              }}
                              style={{
                                backgroundColor: u.isModerator
                                  ? "#ff4d4f"
                                  : "#4caf50",
                                color: "#fff",
                                border: "none",
                                padding: "4px 8px",
                                cursor: "pointer",
                                borderRadius: "4px",
                              }}
                            >
                              {u.isModerator
                                ? "Remove Moderator"
                                : "Make Moderator"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="btn">
                  <IconButton
                    onClick={handleBack}
                    type="return"
                    icon="arrow_back"
                    label="Back"
                  />
                </div>
              </div>
            )}

            {selectedTask === "Badge Creation" && (
              <form className="user-form" onSubmit={handleUserUpdate}>
                <div className="btn">
                  <IconButton
                    onClick={handleBack}
                    type="return"
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
        <div
          className={`toggle-panel ${selectedTask ? "toggle-left" : "toggle-right"
            }`}
        >
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
