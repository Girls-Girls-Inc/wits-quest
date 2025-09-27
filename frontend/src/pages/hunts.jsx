import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../styles/profile.css";

const API_BASE = import.meta.env.VITE_WEB_URL;

const Hunts = () => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState(null);
  const [me, setMe] = useState(null);
  const [hunts, setHunts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Watch for session changes (same as Dashboard.jsx)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setAccessToken(session?.access_token || null);
      setMe(session?.user || null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAccessToken(session?.access_token || null);
      setMe(session?.user || null);
    });

    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Load hunts assigned to the logged-in user
  const loadUserHunts = async () => {
    if (!accessToken) {
      setHunts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/user-hunts`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

      const rows = (Array.isArray(json) ? json : []).map((uh) => {
        const h = uh.hunts || {};
        return {
          id: uh.id,
          userId: uh.userId,
          huntId: uh.huntId,
          isActive: !!uh.isActive,
          name: h.name ?? `Hunt ${uh.huntId}`,
          description: h.description ?? "—",
          question: h.question ?? "—",
        };
      });

      setHunts(rows);
    } catch (e) {
      console.error("Failed to load user hunts:", e.message);
      setHunts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadUserHunts();
    }
  }, [accessToken]);

  if (loading) {
    return <p>Loading your hunts...</p>;
  }

  return (
    <div className="hunts-page">
      <h2>My Hunts</h2>
      {hunts.length === 0 ? (
        <p>No hunts assigned to you.</p>
      ) : (
        <table className="hunts-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Hunt</th>
              <th>Description</th>
              <th>Question</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {hunts.map((h) => (
              <tr key={h.id}>
                <td>{h.huntId}</td>
                <td>{h.name}</td>
                <td>{h.description}</td>
                <td>{h.question}</td>
                <td>{h.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <button
                    className="dash-btn"
                    onClick={() => navigate(`/hunts/${h.huntId}?uh=${h.id}`)}
                    disabled={!h.huntId}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Hunts;
