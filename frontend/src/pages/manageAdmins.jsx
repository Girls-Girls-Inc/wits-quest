import React, { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import supabase from "../supabase/supabaseClient";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import IconButton from "../components/IconButton";

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

const getErrorMessage = (err, fallback = "Unexpected error") => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }
  return fallback;
};

const ManageAdmins = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const toastId = toast.loading("Loading users...");
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
      toast.success("Users loaded", { id: toastId });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load users"), {
        id: toastId,
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleModerator = async (userId, newStatus) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.userId === userId ? { ...user, isModerator: newStatus } : user
      )
    );

    try {
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
          prev.map((user) =>
            user.userId === userId
              ? { ...user, isModerator: !newStatus }
              : user
          )
        );
        throw new Error(await res.text());
      }
      toast.success("User updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update user"));
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Manage Admin Privileges</h1>
          <div className="admin-header__actions">
            <IconButton
              type="button"
              icon="arrow_back"
              label="Back to Admin"
              onClick={() => navigate("/admin")}
            />
            <IconButton
              type="button"
              icon="refresh"
              label="Refresh"
              onClick={loadUsers}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      <div className="quest-list">
        {users.length === 0 && !loading ? (
          <p className="empty-state">No users available.</p>
        ) : (
          users.map((user) => (
            <div
              key={user.userId}
              className="quest-card flex items-center justify-between p-2 mb-2 border rounded"
            >
              <div>
                <strong>{user.email}</strong> (
                {user.isModerator ? "Admin" : "User"})
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handleToggleModerator(user.userId, !user.isModerator)
                  }
                  className={`px-2 py-1 rounded text-white ${
                    user.isModerator ? "make-red" : "make-green"
                  }`}
                >
                  {user.isModerator ? "Remove Admin" : "Make Admin"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageAdmins;
