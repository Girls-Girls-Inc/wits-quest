import React, { useEffect, useState } from "react";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css"; // <-- new CSS file

const API_BASE = import.meta.env.VITE_WEB_URL;
const API_BASE = import.meta.env.VITE_WEB_URL;

const BOARDS = {
  year: { label: "Yearly", id: "12345", icon: "calendar_today" },
  month: { label: "Monthly", id: "1234", icon: "calendar_month" },
  week: { label: "Weekly", id: "123", icon: "calendar_view_week" },
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

  const loadBoard = async (key = boardKey) => {
    setLoading(true);
    try {
      const res = await fetch(makeUrl(key), {
        headers: { Accept: "application/json" },
      });
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

  const activeRing = { boxShadow: "0 0 0 2px #ffd166 inset", borderRadius: 12 };

  return (
    <div className="">
      <div className="">
        <Toaster />
        <div
          style={{
            padding: "24px 24px 8px",
            marginBottom: 12,
            overflow: "visible",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h1 style={{ margin: 0 }}>LEADERBOARD</h1>
            <h2 style={{ margin: 0 }}>{BOARDS[boardKey].label}</h2>
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <div
              className="btn"
              style={{
                display: "inline-flex",
                width: "auto",
                ...(boardKey === "year" ? activeRing : {}),
              }}
            >
              <IconButton
                type="button"
                icon={BOARDS.year.icon}
                label="YEARLY"
                onClick={() => switchBoard("year")}
              />
            </div>

            <div
              className="btn"
              style={{
                display: "inline-flex",
                width: "auto",
                ...(boardKey === "month" ? activeRing : {}),
              }}
            >
              <IconButton
                type="button"
                icon={BOARDS.month.icon}
                label="MONTHLY"
                onClick={() => switchBoard("month")}
              />
            </div>

            <div
              className="btn"
              style={{
                display: "inline-flex",
                width: "auto",
                ...(boardKey === "week" ? activeRing : {}),
              }}
            >
              <IconButton
                type="button"
                icon={BOARDS.week.icon}
                label="WEEKLY"
                onClick={() => switchBoard("week")}
              />
            </div>

            <div
              className="btn"
              style={{ display: "inline-flex", width: "auto" }}
            >
              <IconButton
                type="button"
                icon="refresh"
                label={loading ? "LOADING…" : "REFRESH"}
                onClick={() => loadBoard(boardKey)}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* TABLE CARD (keep .form-box styling here) */}
        <div className="form-box" style={{ padding: 0 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  <Th>#</Th>
                  <Th>Name</Th>
                  <Th>Points</Th>
                  <Th>ID</Th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <Td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: 18,
                        color: "#666",
                      }}
                    >
                      Loading…
                    </Td>
                  </tr>
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <Td
                      colSpan={4}
                      style={{
                        textAlign: "center",
                        padding: 18,
                        color: "#666",
                      }}
                    >
                      No entries yet.
                    </Td>
                  </tr>
                )}

                {!loading &&
                  rows.map((r, i) => (
                    <tr
                      key={r.id ?? `${i}`}
                      style={{ borderTop: "1px solid #2a2a2a" }}
                    >
                      <Td>
                        <strong>{i + 1}</strong>{" "}
                        {i < 3 && (
                          <span
                            className="material-symbols-outlined"
                            title="Top rank"
                            style={{ fontSize: 16, verticalAlign: "middle" }}
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
                        <code style={{ fontSize: 12, wordBreak: "break-all" }}>
                          {r.id}
                        </code>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// table cell helpers
const Th = ({ children }) => (
  <th
    style={{
      textAlign: "left",
      padding: "12px 14px",
      fontWeight: 600,
      fontSize: 14,
      borderBottom: "1px solid #eee",
    }}
  >
    {children}
  </th>
);
const Td = ({ children, ...rest }) => (
  <td {...rest} style={{ padding: "12px 14px", fontSize: 14 }}>
    {children}
  </td>
);

export default Leaderboard;
