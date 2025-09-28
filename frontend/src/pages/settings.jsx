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
          <IconButton
            icon="logout"
            label="Logout"
            onClick={() => setShowLogoutModal(true)}
          />
        </div>
      </div>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="modal-backdrop">
          <div className="modal logout-modal">
            <button
              className="modal-close"
              onClick={() => setShowLogoutModal(false)}
            >
              ✕
            </button>
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
