import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css";

const API_BASE = import.meta.env.VITE_WEB_URL;

const BOARDS = {
  year: { id: "year", label: "Yearly", icon: "calendar_month" },
  month: { id: "month", label: "Monthly", icon: "calendar_view_month" },
  week: { id: "week", label: "Weekly", icon: "calendar_view_week" },
};

const Dashboard = () => {
  const [boardKey, setBoardKey] = useState("year");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerId, setOwnerId] = useState(""); // optional: moderator can browse others
  const [accessToken, setAccessToken] = useState(null); // ← token we’ll send to your API
  const [me, setMe] = useState(null); // session.user (optional, for display)

  // Get / keep the Supabase session token
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setAccessToken(session?.access_token || null);
      setMe(session?.user || null);
    };
    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setAccessToken(session?.access_token || null);
      setMe(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const makeUrl = () => {
    const userId = ownerId || me?.id; // default to current user
    if (!userId) return null;
    // add limit/offset if you like: ?limit=100&offset=0
    return `${API_BASE}/users/${encodeURIComponent(userId)}/collectibles`;
  };
  const fmtDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return "";
    }
  };

  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>
         <rect width='100%' height='100%' fill='#eee'/>
         <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
               font-family='sans-serif' font-size='20' fill='#888'>no image</text>
       </svg>`
    );

  const loadBoard = async () => {
    const url = makeUrl();
    if (!accessToken || !url) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`, // IMPORTANT for RLS
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("API did not return an array");
      setRows(data); // [{ id, name, description, imageUrl, createdAt, earnedAt }, ...]
    } catch (e) {
      setRows([]);
      toast.error(e.message || "Failed to load collectibles");
    } finally {
      setLoading(false);
    }
  };

  // Load once when token arrives; reload when board or ownerId changes
  useEffect(() => {
    if (accessToken) loadBoard("year");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) loadBoard(boardKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardKey, ownerId]);

  const switchBoard = async (key) => {
    setBoardKey(key);
  };

  return (
    <div className="leaderboard-container">
      <Toaster />

      <div className="leaderboard-header">
        <h1>My Collectibles</h1>
        {me && (
          <div style={{ color: "#666", fontSize: 13 }}>
            Signed in as {me.email}
          </div>
        )}
      </div>

      <div
        className="collectibles-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          padding: 12,
        }}
      >
        {loading && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 24 }}>
            Loading…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 24 }}>
            No collectibles yet.
          </div>
        )}

        {!loading &&
          rows.map((r) => (
            <div
              key={r.id}
              className="card"
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "relative",
                  paddingTop: "62%",
                  background: "#fafafa",
                }}
              >
                <img
                  src={r.imageUrl || placeholder}
                  alt={r.name || "collectible"}
                  onError={(e) => {
                    e.currentTarget.src = placeholder;
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </div>
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ fontWeight: 700 }}>{r.name}</div>
                {r.description && (
                  <div style={{ color: "#555", fontSize: 14, lineHeight: 1.3 }}>
                    {r.description}
                  </div>
                )}
                <div style={{ marginTop: "auto", fontSize: 12, color: "#777" }}>
                  {fmtDate(r.createdAt)} · <code>#{r.id}</code>
                  {r.earnedAt && <> · earned {fmtDate(r.earnedAt)}</>}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default Dashboard;
