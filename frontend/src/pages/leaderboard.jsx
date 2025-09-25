import React, { useEffect, useRef, useState } from "react";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css";

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
  const latestReqId = useRef(0);
  const abortRef = useRef(null);

  const makeUrl = (key) =>
    `${API_BASE}/leaderboard?id=${encodeURIComponent(BOARDS[key].id)}`;

  const loadBoard = async (key = boardKey) => {
    const reqId = ++latestReqId.current;
    setLoading(true);
    setRows([]);
    try {
      abortRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(makeUrl(key), {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("API did not return an array");

      if (reqId !== latestReqId.current) return;
      setRows(data);
    } catch (e) {
      if (e?.name === "AbortError") {
        return;
      }
      setRows([]);
      toast.error(e.message || "Failed to load leaderboard");
    } finally {
      if (reqId === latestReqId.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadBoard("year");
  }, []);

  const switchBoard = async (key) => {
    setBoardKey(key);
    await loadBoard(key);
  };

  if (loading) {
    return (
      <div className="leaderboard-loading">
        <Toaster />
        <div>Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <Toaster />
      <div className="leaderboard-header">
        <h1>LEADERBOARD</h1>
        <h2>{BOARDS[boardKey].label}</h2>
      </div>

      <div className="leaderboard-controls">
        <div className="dropdown">
          <button
            className="dropdown-toggle"
            onClick={() =>
              document.querySelector(".dropdown").classList.toggle("open")
            }
          >
            <span className="material-symbols-outlined">
              {BOARDS[boardKey].icon}
            </span>
            {BOARDS[boardKey].label}
            <span className="material-symbols-outlined caret">expand_more</span>
          </button>

          <ul className="dropdown-menu">
            {Object.keys(BOARDS).map((key) => (
              <li key={key}>
                <button
                  className={`dropdown-item ${boardKey === key ? "active" : ""
                    }`}
                  onClick={() => {
                    switchBoard(key);
                    document
                      .querySelector(".dropdown")
                      .classList.remove("open");
                  }}
                >
                  <span className="material-symbols-outlined">
                    {BOARDS[key].icon}
                  </span>
                  {BOARDS[key].label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="btn">
          <IconButton
            type="button"
            label="Refresh"
            icon="refresh"
            onClick={() => loadBoard(boardKey)}
          />
        </div>
      </div>

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table full-width">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Name</Th>
              <Th>Points</Th>
            </tr>
          </thead>
          {/* single keyed tbody to force remount on board change */}
          <tbody key={boardKey}>
            {rows.length === 0 && (
              <tr>
                <Td colSpan={3} className="empty">
                  No entries yet.
                </Td>
              </tr>
            )}

            {rows.map((r, i) => (
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
                  <strong>{r.username}</strong>
                </Td>
                <Td>{r.points}</Td>
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
