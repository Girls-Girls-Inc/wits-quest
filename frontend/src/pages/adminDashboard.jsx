import React, { useState } from "react";
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
  {
    label: "Create Collectible",
    icon: "military_tech",
    path: "/addCollectible",
  },
  { label: "Manage Quests", icon: "star", path: "/manageQuests" },
  { label: "Manage Hunts", icon: "stars", path: "/manageHunts" },
  { label: "Manage Quizzes", icon: "quiz", path: "/manageQuizzes" },
  { label: "Manage Locations", icon: "location_on", path: "/manageLocations" },
  {
    label: "Manage Collectibles",
    icon: "award_star",
    path: "/manageCollectibles",
  },
  {
    label: "Manage Admins",
    icon: "admin_panel_settings",
    path: "/manageAdmins",
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [showHelpModal, setShowHelpModal] = useState(false);

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <header className="admin-header">
        <div className="admin-header__row">
          <h1 className="heading">Admin Dashboard</h1>
          <button
            className="help-btn"
            aria-label="Help"
            onClick={() => setShowHelpModal(true)}
          >
            ?
          </button>
        </div>
      </header>

      {showHelpModal && (
        <div className="modal-backdrop">
          <div className="modal help-modal">
            <button
              className="modal-close"
              onClick={() => setShowHelpModal(false)}
            >
              ✕
            </button>

            <h2>Admin Dashboard Guide</h2>
            <div className="help-actions">
              <IconButton
                type="button"
                icon="task"
                label="Go to Dashboard"
                onClick={() => {
                  setShowHelpModal(false);
                  navigate("/adminDashboard");
                }}
              />
            </div>
            <ol className="help-list">
              <li>
                <strong>Create Content</strong> - Use the creation options to
                add new quests, hunts, quizzes, locations, and collectibles to
                the platform.
              </li>
              <li>
                <strong>Manage Quests</strong> - View, edit, and delete existing
                quests. Update quest details and monitor quest progress.
              </li>
              <li>
                <strong>Manage Hunts</strong> - Oversee all hunts, set time
                limits, and configure hunt questions and settings.
              </li>
              <li>
                <strong>Manage Quizzes</strong> - Create and manage quizzes, add
                questions, and track quiz performance.
              </li>
              <li>
                <strong>Manage Locations</strong> - Define location markers on
                the map, set geofence radius, and manage location details.
              </li>
              <li>
                <strong>Manage Collectibles</strong> - Add badges and
                collectible items that users can earn by completing quests.
              </li>
              <li>
                <strong>Manage Admins</strong> - Grant or revoke admin
                privileges for other users on the platform.
              </li>
            </ol>

            <p className="help-summary">
              For more detailed information, check out the comprehensive admin
              guide:
            </p>

            <div className="help-actions" style={{ marginBottom: "1rem" }}>
              <IconButton
                type="button"
                icon="book"
                label="Open Full Admin Guide"
                onClick={() =>
                  window.open(
                    "https://pattern-zircon-799.notion.site/WitsQuest-Admin-Guide-290fdf0881da80ae9e9cf3dcad96b71c?source=copy_link",
                    "_blank"
                  )
                }
              />
            </div>
          </div>
        </div>
      )}

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
