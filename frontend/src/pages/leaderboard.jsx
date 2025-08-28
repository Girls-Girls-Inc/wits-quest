import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css"; // <-- new CSS file

const API_BASE = import.meta.env.VITE_WEB_URL;

const BOARDS = {
  year: { label: "Yearly", id: "12345", icon: "calendar_today" },
  month: { label: "Monthly", id: "1234", icon: "calendar_month" },
  week: { label: "Weekly", id: "123", icon: "calendar_view_week" },
};

const Leaderboard = () => {
  const [boardKey, setBoardKey] = useState("year");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const makeUrl = (key) =>
    `${API_BASE}/leaderboard?id=${encodeURIComponent(BOARDS[key].id)}`;

  const DUMMY_ROWS = [
    { id: "dummy-1", name: "Alice Tester", points: 1200 },
    { id: "dummy-2", name: "Bob Debugger", points: 950 },
  ];

  const loadBoard = async (key = boardKey) => {
    setLoading(true);
    try {
      const res = await fetch(makeUrl(key), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("API did not return an array");

      setRows([...DUMMY_ROWS, ...data]);
    } catch (e) {
      setRows(DUMMY_ROWS);
      toast.error(e.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard("year");
  }, []);

  const switchBoard = async (key) => {
    setBoardKey(key);
    await loadBoard(key);
  };

  return (
    <div className="leaderboard-container">
      <Toaster />
      <div className="leaderboard-header">
        <h1>Leaderboard</h1>
        <h2>{BOARDS[boardKey].label}</h2>
      </div>

      <div className="leaderboard-controls">
        <div className={`btn ${boardKey === "year" ? "active" : ""}`}>
          <IconButton
            type="button"
            icon={BOARDS.year.icon}
            label="YEARLY"
            onClick={() => switchBoard("year")}
          />
        </div>
        <div className={`btn ${boardKey === "month" ? "active" : ""}`}>
          <IconButton
            type="button"
            icon={BOARDS.month.icon}
            label="MONTHLY"
            onClick={() => switchBoard("month")}
          />
        </div>
        <div className={`btn ${boardKey === "week" ? "active" : ""}`}>
          <IconButton
            type="button"
            icon={BOARDS.week.icon}
            label="WEEKLY"
            onClick={() => switchBoard("week")}
          />
        </div>
        <div className="btn">
          <IconButton
            type="button"
            icon="refresh"
            label={loading ? "LOADING…" : "REFRESH"}
            onClick={() => loadBoard(boardKey)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Name</Th>
              <Th>Points</Th>
              <Th>ID</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <Td colSpan={4} className="loading">
                  Loading…
                </Td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <Td colSpan={4} className="empty">
                  No entries yet.
                </Td>
              </tr>
            )}

            {!loading &&
              rows.map((r, i) => (
                <tr key={r.id ?? `${i}`}>
                  <Td>
                    <strong>{i + 1}</strong>{" "}
                    {i < 3 && (
                      <span
                        className="material-symbols-outlined trophy"
                        title="Top rank"
                      >
                        emoji_events
                      </span>
                    )}
                  </Td>
                  <Td>
                    <strong>{r.name}</strong>
                  </Td>
                  <Td>{r.points}</Td>
                  <Td>
                    <code>{r.id}</code>
                  </Td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Th = ({ children }) => <th>{children}</th>;
const Td = ({ children, ...rest }) => <td {...rest}>{children}</td>;

export default Leaderboard;
