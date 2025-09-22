import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";
import Profile from "./editProfile";
import supabase from "../supabase/supabaseClient";

const Settings = () => {
  const navigate = useNavigate();
  const [selectedTask, setSelectedTask] = useState(null);

  const handleBack = () => {
    setSelectedTask(null);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });

    if (error) {
      toast.error("Failed to log out. Please try again.");
      return;
    }

    toast.success("Logged out!");
    setSelectedTask(null);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (selectedTask === "Give Feedback") {
      toast.success("Loading your submitted feedback...");
    } else if (selectedTask === "Logout") {
      toast.error("Ready to log out?");
    }
  }, [selectedTask]);

  return (
    <div className="admin-container">
      {/* Profile is always displayed */}
      <div className="admin-header">
        <h1 className="heading">Profile</h1>
        <Profile />

        <div className="admin-buttons flex flex-wrap gap-2 mt-4">
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
            onClick={() => setSelectedTask("Logout")}
          />
        </div>
      </div>

      {/* Conditional sections */}
      {selectedTask === "Give Feedback" && (
        <div className="quest-list">
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

      {selectedTask === "Logout" && (
        <div className="quest-list">
          <div className="btn flex gap-2 mt-2">
            <IconButton
              type="button"
              icon="check"
              label="Confirm Logout"
              onClick={handleLogout}
            />
            <IconButton
              type="button"
              icon="arrow_back"
              label="Cancel"
              onClick={handleBack}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;


