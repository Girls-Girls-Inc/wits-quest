import React, { useEffect, useRef, useState } from "react";
import IconButton from "../components/IconButton";
import toast from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css";
import "../styles/quests.css"; // reuse quests classes for the private-list look

const API_BASE = import.meta.env.VITE_WEB_URL;

const BOARDS = {
  year: { label: "Yearly", id: "12345", icon: "calendar_today" },
  month: { label: "Monthly", id: "1234", icon: "calendar_month" },
  week: { label: "Weekly", id: "123", icon: "calendar_view_week" },
};

const DUMMY_PRIVATE = [
  { id: "d1", name: "Dummy 1", members: "2 members" },
  { id: "d2", name: "Dummy 2", members: "5 members" },
  { id: "d3", name: "Dummy 3", members: "12 members" },
];

const Leaderboard = () => {
  const [boardKey, setBoardKey] = useState("year");
  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState("public"); // "public" | "private"
  const latestReqId = useRef(0);
  const abortRef = useRef(null);

  // refs for dropdowns
  const periodDropdownRef = useRef(null);
  const scopeDropdownRef = useRef(null);

  const makeUrl = (key) =>
    `${API_BASE}/leaderboard?id=${encodeURIComponent(BOARDS[key].id)}`;

  const loadBoard = async (key = boardKey, currentScope = scope) => {
    const reqId = ++latestReqId.current;
    setRows([]);
    try {
      abortRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    abortRef.current = ac;

    // If private scope, show placeholder/dummy list (don't call public API)
    if (currentScope === "private") {
      setRows([]); // keep table rows empty (we render dummy private list instead)
      return;
    }

    const loadingToast = toast.loading("Loading leaderboard…");
    try {
      const res = await fetch(makeUrl(key), {
        headers: { Accept: "application/json" },
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("API did not return an array");

      if (reqId !== latestReqId.current) return; // stale
      setRows(data);
      toast.success("Leaderboard loaded!", { id: loadingToast });
    } catch (e) {
      if (e?.name === "AbortError") return;
      setRows([]);
      toast.error(e.message || "Failed to load leaderboard", {
        id: loadingToast,
      });
    }
  };

  useEffect(() => {
    loadBoard("year", "public");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchBoard = async (key) => {
    setBoardKey(key);
    await loadBoard(key, scope);
  };

  const switchScope = async (newScope) => {
    setScope(newScope);
    if (scopeDropdownRef.current) scopeDropdownRef.current.classList.remove("open");
    if (newScope === "public") {
      await loadBoard(boardKey, "public");
    } else {
      try { abortRef.current?.abort(); } catch {}
      setRows([]);
    }
  };

  const togglePeriodDropdown = () => {
    const el = periodDropdownRef.current;
    if (!el) return;
    el.classList.toggle("open");
  };
  const toggleScopeDropdown = () => {
    const el = scopeDropdownRef.current;
    if (!el) return;
    el.classList.toggle("open");
  };

  // placeholder handlers for view/join/create
  const handleViewPrivate = (id) => {
    toast(`View private leaderboard ${id} (not wired yet)`);
  };
  const handleJoin = () => {
    toast("Open Join modal (not wired yet)");
  };
  const handleCreate = () => {
    toast("Open Create modal (not wired yet)");
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>LEADERBOARD</h1>
        <h2>{BOARDS[boardKey].label}</h2>
      </div>

      <div className="leaderboard-controls" style={{ gap: 12 }}>
        {/* period selector */}
        <div className="dropdown" ref={periodDropdownRef}>
          <button className="dropdown-toggle" onClick={togglePeriodDropdown}>
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
                  className={`dropdown-item ${boardKey === key ? "active" : ""}`}
                  onClick={() => {
                    switchBoard(key);
                    if (periodDropdownRef.current) periodDropdownRef.current.classList.remove("open");
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

        {/* scope selector (public / private) */}
        <div className="dropdown" ref={scopeDropdownRef}>
          <button className="dropdown-toggle" onClick={toggleScopeDropdown}>
            <span className="material-symbols-outlined">
              {scope === "public" ? "public" : "lock"}
            </span>
            {scope === "public" ? "Public" : "Private"}
            <span className="material-symbols-outlined caret">expand_more</span>
          </button>

          <ul className="dropdown-menu">
            <li>
              <button
                className={`dropdown-item ${scope === "public" ? "active" : ""}`}
                onClick={() => switchScope("public")}
              >
                <span className="material-symbols-outlined">public</span>
                Public
              </button>
            </li>
            <li>
              <button
                className={`dropdown-item ${scope === "private" ? "active" : ""}`}
                onClick={() => switchScope("private")}
              >
                <span className="material-symbols-outlined">lock</span>
                Private
              </button>
            </li>
          </ul>
        </div>

        <div style={{ flex: 1 }} />

        <div className="btn">
          <IconButton
            type="button"
            label="Refresh"
            icon="refresh"
            onClick={() => loadBoard(boardKey, scope)}
          />
        </div>
      </div>

      {/* ---------- PUBLIC: existing leaderboard table ---------- */}
      {scope === "public" && (
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
            <tbody key={`${boardKey}-${scope}`}>
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
      )}

      {/* ---------- PRIVATE: full-width quests-like list of private leaderboards ---------- */}
      {scope === "private" && (
        <div className="leaderboard-table-wrapper">
          <div className="quests-header" style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0 }}>PRIVATE LEADERBOARDS</h1>
          </div>

          <div className="quest-list" style={{ marginBottom: 20 }}>
            {DUMMY_PRIVATE.map((b) => (
              <div key={b.id} className="quest-card" style={{ alignItems: "center" }}>
                {/* left spacer preserved for layout */}
                <div className="quest-profile" style={{ minWidth: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {/* intentionally left blank (no pics) */}
                </div>

                <div className="quest-info" style={{ flex: 1 }}>
                  <h2 style={{ marginBottom: 6 }}>{b.name}</h2>
                  <p style={{ margin: 0, color: "var(--muted, #98a0aa)" }}>{b.members}</p>
                </div>

                <div className="quest-action" style={{ alignSelf: "center" }}>
                  <IconButton
                    icon="find_in_page"
                    label="View Details"
                    onClick={() => handleViewPrivate(b.id)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Join and Create buttons at bottom, each with captions below */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", justifyContent: "center", padding: "12px 0 40px" }}>
            <div style={{ textAlign: "center", width: 260 }}>
              <IconButton icon="login" label="Join" onClick={handleJoin} />
              <div style={{ fontSize: 13, color: "var(--muted, #98a0aa)", marginTop: 8 }}>
                Enter an invite code to join a private leaderboard.
              </div>
            </div>

            <div style={{ textAlign: "center", width: 260 }}>
              <IconButton icon="group_add" label="Create" onClick={handleCreate} />
              <div style={{ fontSize: 13, color: "var(--muted, #98a0aa)", marginTop: 8 }}>
                Create a private leaderboard and invite friends.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Th = ({ children }) => <th>{children}</th>;
const Td = ({ children, ...rest }) => <td {...rest}>{children}</td>;

export default Leaderboard;
