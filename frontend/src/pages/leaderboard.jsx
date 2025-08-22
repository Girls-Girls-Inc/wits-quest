import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../index.css";
import "../styles/login-signup.css";

// Absolute backend URL as requested
const API_BASE = "http://localhost:4000";

// Boards -> /api/leaderboard?id=<id>
const BOARDS = {
  year:  { label: "Yearly",  id: "12345", icon: "calendar_today" },
  month: { label: "Monthly", id: "1234",  icon: "calendar_month" },
  week:  { label: "Weekly",  id: "123",   icon: "calendar_view_week" },
};

const Leaderboard = () => {
  const [boardKey, setBoardKey] = useState("year");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Build URL: http://localhost:4000/api/leaderboard?id=12345
  function makeUrl(key) {
    const board = BOARDS[key];
    return `${API_BASE}/api/leaderboard?id=${encodeURIComponent(board.id)}`;
  }

  async function loadBoard(key = boardKey) {
    setLoading(true);
    try {
      const res = await fetch(makeUrl(key), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // normalize: if API returns an array use it; otherwise try common shapes
      const list = Array.isArray(data) ? data : (data?.rows || data?.items || []);
      setRows(list);
    } catch (e) {
      setRows([]);
      toast.error(e.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard("year"); // load Yearly on first render
  }, []);

  return (
    <div className="container" style={{ maxWidth: 1000 }}>
      <Toaster />

      <div className="form-box" style={{ padding: 24, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0 }}>Leaderboard</h1>
            <p style={{ margin: 0, color: "#666" }}>
              {BOARDS[boardKey].label} • Board ID {BOARDS[boardKey].id}
            </p>
          </div>
          <div className="btn" style={{ minWidth: 140 }}>
            <IconButton
              icon="refresh"
              label={loading ? "Loading…" : "Refresh"}
              onClick={() => loadBoard(boardKey)}
              disabled={loading}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {Object.entries(BOARDS).map(([key, { label, icon }]) => (
            <TabButton
              key={key}
              active={boardKey === key}
              icon={icon}
              label={label}
              onClick={async () => { setBoardKey(key); await loadBoard(key); }}
            />
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="form-box" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Score</Th>
                <Th>Updated</Th>
                <Th>ID</Th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <Td colSpan={5} style={{ textAlign: "center", padding: 18, color: "#666" }}>
                    Loading…
                  </Td>
                </tr>
              )}

              {!loading && rows.length === 0 && (
                <tr>
                  <Td colSpan={5} style={{ textAlign: "center", padding: 18, color: "#666" }}>
                    No entries yet.
                  </Td>
                </tr>
              )}

              {!loading && rows.map((r, i) => (
                <tr key={r.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                  <Td>
                    <strong>{i + 1}</strong>{" "}
                    {i < 3 && (
                      <span className="material-symbols-outlined" title="Top rank" style={{ fontSize: 16, verticalAlign: "middle" }}>
                        emoji_events
                      </span>
                    )}
                  </Td>
                  <Td><strong>{r.name}</strong></Td>
                  <Td>{r.score}</Td>
                  <Td>{fmtDate(r.updated_at || r.created_at)}</Td>
                  <Td><code style={{ fontSize: 12, wordBreak: "break-all" }}>{r.id}</code></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Small UI helpers ---
const Th = ({ children }) => (
  <th style={{ textAlign: "left", padding: "12px 14px", fontWeight: 600, fontSize: 14, borderBottom: "1px solid #eee" }}>
    {children}
  </th>
);
const Td = ({ children, ...rest }) => (
  <td {...rest} style={{ padding: "12px 14px", fontSize: 14 }}>
    {children}
  </td>
);

const TabButton = ({ active, icon, label, onClick }) => (
  <button
    className="btn"
    onClick={onClick}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 14px",
      borderRadius: 8,
      border: active ? "2px solid #222" : "1px solid #ddd",
      background: active ? "#fff" : "#fafafa",
      cursor: "pointer",
    }}
  >
    <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    <span>{label}</span>
  </button>
);

// --- utils ---
function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

export default Leaderboard;

