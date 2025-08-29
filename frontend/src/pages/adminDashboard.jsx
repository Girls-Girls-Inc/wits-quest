import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import SignupImage from "../assets/signup.png";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL;

// Dummy fallback data
const DUMMY_USERS = [
  {
    userId: "1",
    email: "user1@example.com",
    isModerator: false,
    created_at: new Date().toISOString(),
  },
  {
    userId: "2",
    email: "user2@example.com",
    isModerator: true,
    created_at: new Date().toISOString(),
  },
];

const DUMMY_COLLECTIBLES = [
  { id: "1", name: "Golden Coin" },
  { id: "2", name: "Silver Badge" },
];

const DUMMY_LOCATIONS = [
  { id: "1", name: "Central Park" },
  { id: "2", name: "Downtown" },
];

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
      const res = await fetch(`${API_BASE}/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0)
        throw new Error("No users returned");
      setUsers(data);
    } catch (err) {
      console.warn("Using dummy users due to error:", err.message);
      setUsers(DUMMY_USERS);
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

        if (!Array.isArray(collectiblesData) || collectiblesData.length === 0)
          throw new Error("No collectibles returned");
        if (!Array.isArray(locationsData) || locationsData.length === 0)
          throw new Error("No locations returned");

        setCollectibles(collectiblesData);
        setLocations(locationsData);
      } catch (err) {
        console.warn(
          "Using dummy collectibles/locations due to error:",
          err.message
        );
        setCollectibles(DUMMY_COLLECTIBLES);
        setLocations(DUMMY_LOCATIONS);
      }
    };
    fetchOptions();
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
    setQuestData({ ...questData, [name]: value });
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setLocationData({ ...locationData, [name]: value });
  };

  // ... Keep your handleQuestSubmit, handleLocationSubmit, handleToggleModerator unchanged ...

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
          </div>
        )}
      </div>
      <div className="toggle">
        <div
          className={`toggle-panel ${
            selectedTask ? "toggle-left" : "toggle-right"
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
