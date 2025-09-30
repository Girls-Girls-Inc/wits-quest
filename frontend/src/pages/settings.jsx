import React, { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/profile.css";
import "../styles/button.css";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";
import Profile from "./editProfile";
import supabase from "../supabase/supabaseClient";

const Settings = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });

    if (error) {
      toast.error("Failed to log out. Please try again.");
      return;
    }

    toast.success("Logged out!");
    setShowLogoutModal(false);
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-container">
      <Toaster />

      <div className="admin-header">
        <h1 className="heading">Profile</h1>
        <Profile />

        <div className="settings-buttons">
          <IconButton
            icon="feedback"
            label="Give Feedback"
            onClick={() =>
              window.open(
                "https://docs.google.com/forms/d/e/1FAIpQLSdpNVwJkldfLiQ42pFO5Ic7PHw8KhOeu2THb0UgA64tP-1z4w/viewform?usp=sharing&ouid=101378631951017579634",
                "_blank"
              )
            }
          />

          {/* Help Button */}
          <IconButton
            icon="help"
            label="Help"
            onClick={() => setShowHelpModal(true)}
          />

          <IconButton
            icon="logout"
            label="Logout"
            onClick={() => setShowLogoutModal(true)}
          />
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="modal-backdrop">
          <div className="modal help-modal">
            <button
              className="modal-close"
              onClick={() => setShowHelpModal(false)}
            >
              ✕
            </button>
            <h2>How to Complete a Quest</h2>
            <ol className="help-list">
              <li>
                Go to the <strong>Quests</strong> page.
              </li>
              <li>
                Browse the list and click <strong>View Details</strong> on a
                quest that interests you.
              </li>
              <li>
                Select <strong>Add to My Quests</strong> to save it.
              </li>
              <li>
                Open your <strong>Dashboard</strong> and, in the Quests table,
                click <strong>View</strong> next to the quest you want to
                complete.
              </li>
              <li>
                Travel to the quest’s location on the map (make sure you’re
                within the marked radius).
              </li>
              <li>
                Click <strong>Check In</strong> to finish the quest.
              </li>
              <li>Your points will be automatically added to your profile.</li>
            </ol>
            <div className="help-actions">
              <IconButton
                type="button"
                icon="map"
                label="View Quests"
                onClick={() => {
                  setShowHelpModal(false);
                  navigate("/displayQuests");
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal logout-modal">
            <div className="modal-header">
              <button
                className="modal-close"
                onClick={() => setShowLogoutModal(false)}
              >
                ✕
              </button>
            </div>
            <h2>Confirm Logout</h2>
            <p>Are you sure you want to log out of your account?</p>
            <div className="logout-actions">
              <IconButton
                type="button"
                icon="check"
                label="Yes, Logout"
                onClick={handleLogout}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
