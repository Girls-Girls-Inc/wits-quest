import React from "react";
import { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import IconButton from "../components/IconButton";

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

const DASHBOARD_ACTIONS = [
  { label: "Create Quest", icon: "task", path: "/addQuest" },
  { label: "Create Hunt", icon: "flag", path: "/addHunt" },
  { label: "Create Quiz", icon: "quiz", path: "/addQuiz" },
  { label: "Create Location", icon: "edit_location", path: "/addLocation" },
  { label: "Create Collectible", icon: "military_tech", path: "/addCollectiable" },
  { label: "Manage Quests", icon: "star", path: "/manageQuests" },
  { label: "Manage Hunts", icon: "stars", path: "/manageHunts" },
  { label: "Manage Quizzes", icon: "quiz", path: "/manageQuizzes" },
  { label: "Manage Locations", icon: "location_on", path: "/manageLocations" },
  { label: "Manage Badges", icon: "award_star", path: "/manageCollectibles" },
  { label: "Manage Admins", icon: "admin_panel_settings", path: "/manageAdmins" },
];

const AdminDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header">
        <h1 className="heading">Admin Dashboard</h1>
        <p className="admin-header__subtitle">
          Choose an area to create new content or manage existing quests, hunts, and resources.
        </p>
      </div>

      <div className="admin-buttons">
        {DASHBOARD_ACTIONS.map((action) => (
          <IconButton
            key={action.label}
            icon={action.icon}
            label={action.label}
            className="tile-button"
            onClick={() => navigate(action.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
