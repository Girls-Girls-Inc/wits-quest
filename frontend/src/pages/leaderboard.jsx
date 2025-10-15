// src/pages/leaderboard.jsx
import React, { useEffect, useRef, useState } from "react";
import IconButton from "../components/IconButton";
import toast from "react-hot-toast";
import "../styles/login-signup.css";
import "../index.css";
import "../styles/leaderboard.css";
import "../styles/quests.css"; // reuse quests classes for the private-list look

const API_BASE = import.meta.env.VITE_WEB_URL || ""; // ensure this is set in your .env

const BOARDS = {
  year: { label: "Yearly", id: "12345", icon: "calendar_today" },
  month: { label: "Monthly", id: "1234", icon: "calendar_month" },
  week: { label: "Weekly", id: "123", icon: "calendar_view_week" },
};

/* --------------------- helper utilities (unchanged) --------------------- */

function detectAccessTokenFromLocalStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const lower = key.toLowerCase();
      if (
        lower.includes("supabase") ||
        lower.includes("sb:") ||
        lower.includes("token") ||
        lower.includes("auth")
      ) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
            const obj = JSON.parse(raw);
            if (obj?.access_token) return obj.access_token;
            if (obj?.currentSession?.access_token)
              return obj.currentSession.access_token;
            if (obj?.session?.access_token) return obj.session.access_token;
            if (obj?.data?.access_token) return obj.data.access_token;
            if (obj?.auth?.access_token) return obj.auth.access_token;
          } else {
            if (raw.length > 20 && raw.split(".").length >= 2) return raw;
          }
        } catch {
          continue;
        }
      }
    }
    const candidates = [
      "supabase.auth.token",
      "sb-access-token",
      "sb:token",
      "token",
      "auth_token",
      "access_token",
    ];
    for (const k of candidates) {
      const v = localStorage.getItem(k);
      if (!v) continue;
      try {
        const parsed = v.trim().startsWith("{") ? JSON.parse(v) : null;
        if (parsed?.access_token) return parsed.access_token;
        if (parsed?.token) return parsed.token;
        if (typeof v === "string" && v.length > 20) return v;
      } catch {
        if (v.length > 20) return v;
      }
    }
  } catch (err) {
    console.warn("token detection failed:", err);
  }
  return null;
}

async function safeFetchJson(url, opts = {}) {
  console.log("[safeFetchJson] ", opts.method ?? "GET", url, opts);

  const { includeAuth = false, ...fetchOpts } = opts;
  fetchOpts.headers = fetchOpts.headers ? { ...fetchOpts.headers } : {};

  if (includeAuth) {
    const token = detectAccessTokenFromLocalStorage();
    if (token) {
      fetchOpts.headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.debug("[safeFetchJson] no token detected in localStorage");
    }
  }

  const res = await fetch(url, fetchOpts);
  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  const trimmed = text == null ? "" : String(text).trim();

  if (!trimmed) {
    if (!res.ok) {
      const e = new Error(`Empty response with HTTP ${res.status}`);
      e.status = res.status;
      e.raw = trimmed;
      throw e;
    }
    return null;
  }

  const xssiPrefix = ")]}',";
  const content = trimmed.startsWith(xssiPrefix)
    ? trimmed.slice(xssiPrefix.length).trim()
    : trimmed;

  if (
    ct.includes("application/json") ||
    content.startsWith("{") ||
    content.startsWith("[") ||
    content === "null"
  ) {
    try {
      const json = JSON.parse(content);
      if (!res.ok) {
        const message = json?.error || json?.message || `HTTP ${res.status}`;
        const e = new Error(message);
        e.status = res.status;
        e.body = json;
        throw e;
      }
      return json;
    } catch {
      const e = new Error("Invalid JSON response from server");
      e.status = res.status;
      e.raw = content.slice(0, 2000);
      throw e;
    }
  }

  const snippet = content.slice(0, 2000);
  const e = new Error(
    `Expected JSON but got HTML/text. HTTP ${res.status}. Response snippet: ${snippet}`
  );
  e.status = res.status;
  e.raw = snippet;
  throw e;
}

/* --------------------- main component --------------------- */

const Leaderboard = () => {
  const [boardKey, setBoardKey] = useState("year");

  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState("public");
  const latestReqId = useRef(0);
  const abortRef = useRef(null);

  const [privateLeaderboards, setPrivateLeaderboards] = useState([]);
  const [loadingPrivate, setLoadingPrivate] = useState(false);

  const [selectedPrivateId, setSelectedPrivateId] = useState(null);
  const [selectedPrivateDetails, setSelectedPrivateDetails] = useState(null);
  const [selectedStandings, setSelectedStandings] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPeriodKey, setDetailPeriodKey] = useState("year");
  const [detailShowCode, setDetailShowCode] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const periodDropdownRef = useRef(null);
  const scopeDropdownRef = useRef(null);

  const makePublicUrl = (key) =>
    `${API_BASE}/leaderboard?id=${encodeURIComponent(BOARDS[key].id)}`;

  /* ---------------- public board loader ---------------- */

  const loadBoard = async (key = boardKey, currentScope = scope) => {
    const reqId = ++latestReqId.current;
    setRows([]);
    try {
      abortRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    abortRef.current = ac;

    if (currentScope === "private") {
      await loadPrivateLeaderboards();
      return;
    }

    try {
      const url = makePublicUrl(key);
      const data = await safeFetchJson(url, {
        headers: { Accept: "application/json" },
        signal: ac.signal,
        credentials: "include",
        includeAuth: true,
      });

      if (reqId !== latestReqId.current) return;
      if (!Array.isArray(data))
        throw new Error("Public leaderboard API returned a non-array");
      setRows(data);
      // ✅ no loading/success toasts
    } catch (e) {
      if (e?.name === "AbortError") return;
      setRows([]);
      toast.error(
        e.status === 401
          ? "Unauthorized — please sign in."
          : e.message || "Failed to load leaderboard"
      );
      console.error("Error loading public leaderboard:", e);
    }
  };

  useEffect(() => {
    loadBoard("year", "public");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchBoard = async (key) => {
    setBoardKey(key);
    if (selectedPrivateId) {
      setDetailPeriodKey(key);
      await loadPrivateStandings(selectedPrivateId, key);
    } else {
      await loadBoard(key, scope);
    }
  };

  const switchScope = async (newScope) => {
    setScope(newScope);
    if (scopeDropdownRef.current)
      scopeDropdownRef.current.classList.remove("open");
    if (newScope === "public") {
      setSelectedPrivateId(null);
      await loadBoard(boardKey, "public");
    } else {
      try {
        abortRef.current?.abort();
      } catch {}
      setRows([]);
      await loadPrivateLeaderboards();
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

  /* ---------------- private list & member counts ---------------- */

  const loadPrivateLeaderboards = async () => {
    setLoadingPrivate(true);
    setPrivateLeaderboards([]);
    setSelectedPrivateId(null);
    setSelectedPrivateDetails(null);
    setSelectedStandings([]);
    setDetailShowCode(false);

    try {
      const url = `${API_BASE}/private-leaderboards`;
      const data = await safeFetchJson(url, {
        headers: { Accept: "application/json" },
        credentials: "include",
        includeAuth: true,
      });
      if (!Array.isArray(data))
        throw new Error("Private leaderboards API returned a non-array");

      const enriched = await Promise.all(
        data.map(async (lb) => {
          if (typeof lb.memberCount === "number") return lb;
          try {
            const members = await safeFetchJson(
              `${API_BASE}/private-leaderboards/${encodeURIComponent(
                lb.id
              )}/members`,
              {
                headers: { Accept: "application/json" },
                credentials: "include",
                includeAuth: true,
              }
            );
            if (Array.isArray(members))
              return { ...lb, memberCount: members.length };
          } catch {
            try {
              const standings = await safeFetchJson(
                `${API_BASE}/private-leaderboards/${encodeURIComponent(
                  lb.id
                )}/standings`,
                {
                  headers: { Accept: "application/json" },
                  credentials: "include",
                  includeAuth: true,
                }
              );
              if (Array.isArray(standings))
                return { ...lb, memberCount: standings.length };
            } catch (err2) {
              console.warn(
                "Could not fetch members or standings for",
                lb.id,
                err2
              );
            }
          }
          return { ...lb, memberCount: null };
        })
      );

      setPrivateLeaderboards(enriched);
    } catch (e) {
      toast.error(
        e.status === 401
          ? "Unauthorized — please sign in to view private leaderboards."
          : e.message || "Could not load private leaderboards"
      );
      setPrivateLeaderboards([]);
      console.error("loadPrivateLeaderboards error:", e);
    } finally {
      setLoadingPrivate(false);
    }
  };

  /* ---------------- private detail / standings ---------------- */

  const loadPrivateStandings = async (
    leaderboardId,
    periodKey = detailPeriodKey
  ) => {
    setDetailLoading(true);
    setSelectedPrivateId(leaderboardId);
    setSelectedPrivateDetails(null);
    setSelectedStandings([]);
    setDetailShowCode(false);

    try {
      const details = await safeFetchJson(
        `${API_BASE}/private-leaderboards/${encodeURIComponent(leaderboardId)}`,
        {
          headers: { Accept: "application/json" },
          credentials: "include",
          includeAuth: true,
        }
      );

      setSelectedPrivateDetails(details || null);

      const standingsUrl = `${API_BASE}/private-leaderboards/${encodeURIComponent(
        leaderboardId
      )}/standings?period=${encodeURIComponent(periodKey)}`;
      const standings = await safeFetchJson(standingsUrl, {
        headers: { Accept: "application/json" },
        credentials: "include",
        includeAuth: true,
      });

      if (Array.isArray(standings)) {
        setSelectedStandings(standings);
      } else {
        try {
          const members = await safeFetchJson(
            `${API_BASE}/private-leaderboards/${encodeURIComponent(
              leaderboardId
            )}/members`,
            {
              headers: { Accept: "application/json" },
              credentials: "include",
              includeAuth: true,
            }
          );
          if (Array.isArray(members)) {
            const mapped = members.map((m, i) => ({
              userId: m.userId,
              username: m.username || m.displayName || String(m.userId),
              points: m.points ?? 0,
              rank: i + 1,
            }));
            setSelectedStandings(mapped);
          } else {
            setSelectedStandings([]);
          }
        } catch (err) {
          setSelectedStandings([]);
          console.warn("fallback members failed", err);
        }
      }
    } catch (e) {
      toast.error(
        e.status === 401
          ? "Unauthorized — please sign in to view that leaderboard."
          : e.message || "Could not load leaderboard details"
      );
      console.error("Error loading private leaderboard details/standings:", e);
      setSelectedPrivateId(null);
      setSelectedPrivateDetails(null);
      setSelectedStandings([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewPrivateLeaderboard = async (leaderboardId) => {
    await loadPrivateStandings(leaderboardId, detailPeriodKey);
  };

  const toggleShowCode = async () => {
    const newState = !detailShowCode;
    setDetailShowCode(newState);
    if (newState && selectedPrivateDetails?.inviteCode) {
      try {
        await navigator.clipboard.writeText(selectedPrivateDetails.inviteCode);
        toast.success("Invite code copied to clipboard");
      } catch {
        // ignore clipboard errors
      }
    }
  };

  /* ---------------- create / join flows ---------------- */

  const createLeaderboard = async () => {
    if (!createName.trim())
      return toast.error("Please enter a leaderboard name");
    setCreating(true);
    try {
      const res = await safeFetchJson(`${API_BASE}/private-leaderboards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        includeAuth: true,
        body: JSON.stringify({ name: createName.trim() }),
      });

      toast.success("Leaderboard created!");
      setShowCreateModal(false);
      setCreateName("");
      await loadPrivateLeaderboards();

      if (res?.id) {
        await loadPrivateStandings(res.id, detailPeriodKey);
      }
    } catch (e) {
      toast.error(
        e.status === 401
          ? "Unauthorized — please sign in to create a leaderboard."
          : e.message || "Could not create leaderboard"
      );
      console.error("createLeaderboard error:", e);
    } finally {
      setCreating(false);
    }
  };

  const joinLeaderboard = async () => {
    if (!joinCode.trim()) return toast.error("Please enter an invite code");
    setJoining(true);
    try {
      const res = await safeFetchJson(`${API_BASE}/private-leaderboards/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        includeAuth: true,
        body: JSON.stringify({ code: joinCode.trim() }),
      });

      toast.success("Joined leaderboard!");
      setShowJoinModal(false);
      setJoinCode("");
      await loadPrivateLeaderboards();

      const joinedId =
        res?.member?.leaderboardId || res?.id || res?.leaderboardId;
      if (joinedId) await loadPrivateStandings(joinedId, detailPeriodKey);
    } catch (e) {
      toast.error(
        e.status === 401
          ? "Unauthorized — please sign in to join a leaderboard."
          : e.message || "Could not join leaderboard"
      );
      console.error("joinLeaderboard error:", e);
    } finally {
      setJoining(false);
    }
  };

  /* ---------------- UI rendering ---------------- */

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1>LEADERBOARD</h1>
        <h2>{BOARDS[selectedPrivateId ? detailPeriodKey : boardKey].label}</h2>
      </div>

      <div className="leaderboard-controls" style={{ gap: 12 }}>
        {/* Only show period dropdown when scope is "public" */}
        {scope === "public" && (
          <div className="dropdown" ref={periodDropdownRef}>
            <button className="dropdown-toggle" onClick={togglePeriodDropdown}>
              <span className="material-symbols-outlined">
                {BOARDS[selectedPrivateId ? detailPeriodKey : boardKey].icon}
              </span>
              {BOARDS[selectedPrivateId ? detailPeriodKey : boardKey].label}
              <span className="material-symbols-outlined caret">
                expand_more
              </span>
            </button>

            <ul className="dropdown-menu">
              {Object.keys(BOARDS).map((key) => (
                <li key={key}>
                  <button
                    className={`dropdown-item ${
                      (selectedPrivateId ? detailPeriodKey : boardKey) === key
                        ? "active"
                        : ""
                    }`}
                    onClick={async () => {
                      if (selectedPrivateId) {
                        setDetailPeriodKey(key);
                        await loadPrivateStandings(selectedPrivateId, key);
                      } else {
                        await switchBoard(key);
                      }
                      if (periodDropdownRef.current)
                        periodDropdownRef.current.classList.remove("open");
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
        )}

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
                className={`dropdown-item ${
                  scope === "public" ? "active" : ""
                }`}
                onClick={() => switchScope("public")}
              >
                <span className="material-symbols-outlined">public</span>
                Public
              </button>
            </li>
            <li>
              <button
                className={`dropdown-item ${
                  scope === "private" ? "active" : ""
                }`}
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
            icon="refresh"
            onClick={() => {
              if (selectedPrivateId)
                loadPrivateStandings(selectedPrivateId, detailPeriodKey);
              else loadBoard(boardKey, scope);
            }}
          />
        </div>
      </div>

      {/* ---------- PUBLIC TABLE ---------- */}
      {scope === "public" && !selectedPrivateId && (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table full-width">
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Name</Th>
                <Th>Points</Th>
              </tr>
            </thead>
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

      {/* ---------- PRIVATE: list or detail ---------- */}
      {scope === "private" && (
        <div>
          <div className="quests-header" style={{ marginBottom: 18 }}>
            <h1 style={{ margin: 0 }}>
              {selectedPrivateId
                ? selectedPrivateDetails?.name || "PRIVATE LEADERBOARD"
                : "PRIVATE LEADERBOARDS"}
            </h1>
          </div>

          {selectedPrivateId ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    className="btn primary"
                    onClick={() => {
                      setSelectedPrivateId(null);
                      setSelectedPrivateDetails(null);
                      setSelectedStandings([]);
                    }}
                  >
                    ← Back
                  </button>

                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--muted, #98a0aa)",
                    }}
                  >
                    {selectedPrivateDetails?.description ?? ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="btn primary" onClick={toggleShowCode}>
                    {detailShowCode ? "Hide Code" : "Show Code"}
                  </button>
                </div>
              </div>

              {detailShowCode && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--muted, #98a0aa)" }}>
                    Invite code:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "monospace",
                        padding: "6px 10px",
                        color: "black !important",
                        background: "var(--surface, #f6f7f8)",
                        borderRadius: 6,
                      }}
                    >
                      {selectedPrivateDetails?.inviteCode ?? "—"}
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => {
                        const code = selectedPrivateDetails?.inviteCode ?? "";
                        if (!code) return;
                        navigator.clipboard
                          ?.writeText(code)
                          .then(() => toast.success("Code copied"))
                          .catch(() => toast("Copy failed"));
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 8, color: "white" }}>
                {detailLoading ? (
                  <div>Loading standings…</div>
                ) : (
                  <table className="leaderboard-table full-width">
                    <thead>
                      <tr>
                        <Th>#</Th>
                        <Th>Name</Th>
                        <Th>Points</Th>
                      </tr>
                    </thead>
                    <tbody key={`${selectedPrivateId}-${detailPeriodKey}`}>
                      {selectedStandings.length === 0 && (
                        <tr>
                          <Td colSpan={3} className="empty">
                            No entries yet.
                          </Td>
                        </tr>
                      )}
                      {selectedStandings.map((r, i) => (
                        <tr key={r.userId ?? i}>
                          <Td>
                            <strong>{r.rank ?? i + 1}</strong>{" "}
                            {(r.rank ?? i) < 3 && (
                              <span
                                className="material-symbols-outlined trophy"
                                title="Top rank"
                              >
                                emoji_events
                              </span>
                            )}
                          </Td>
                          <Td>
                            <strong>
                              {r.username ?? r.label ?? String(r.userId)}
                            </strong>
                          </Td>
                          <Td>{r.points ?? 0}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <>
              {loadingPrivate ? (
                <div>Loading private leaderboards…</div>
              ) : (
                <>
                  {privateLeaderboards.length > 0 && (
                    <div className="quest-list" style={{ marginBottom: 20 }}>
                      {privateLeaderboards.map((b) => (
                        <div
                          key={b.id}
                          className="quest-card"
                          style={{ alignItems: "center" }}
                        >
                          <div
                            className="quest-profile"
                            style={{
                              minWidth: 72,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          />
                          <div className="quest-info" style={{ flex: 1 }}>
                            <h2 style={{ marginBottom: 6 }}>{b.name}</h2>
                            <p
                              style={{
                                margin: 0,
                                color: "var(--muted, #98a0aa)",
                              }}
                            >
                              {typeof b.memberCount === "number"
                                ? `${b.memberCount} member${
                                    b.memberCount === 1 ? "" : "s"
                                  }`
                                : "—"}
                            </p>
                          </div>
                          <div
                            className="quest-action"
                            style={{ alignSelf: "center" }}
                          >
                            <IconButton
                              icon="find_in_page"
                              label="View Details"
                              onClick={() => handleViewPrivateLeaderboard(b.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {privateLeaderboards.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--muted, #98a0aa)",
                        marginBottom: 20,
                      }}
                    >
                      You don't have any private leaderboards yet — create one
                      or join with a code.
                    </div>
                  )}

                  <section
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "12px 0 40px",
                      gap: 12,
                    }}
                  >
                    {/* Buttons side by side */}
                    <section
                      style={{
                        display: "flex",
                        gap: 20,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <IconButton
                        icon="login"
                        label="Join"
                        onClick={() => {
                          console.log("Join clicked");
                          setShowJoinModal(true);
                        }}
                      />

                      <IconButton
                        icon="group_add"
                        label="Create"
                        onClick={() => {
                          console.log("Create clicked");
                          setShowCreateModal(true);
                        }}
                      />
                    </section>

                    {/* Shared description */}
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--muted, #98a0aa)",
                        textAlign: "center",
                        marginTop: 8,
                        maxWidth: 340,
                      }}
                    >
                      Click <b>“Join”</b> to enter an invite code and join a
                      private leaderboard, or <b>“Create”</b> to start one and
                      invite your friends.
                    </p>
                  </section>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Create a leaderboard</h3>
            <input
              className="invite-input"
              autoFocus
              placeholder="Leaderboard name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createLeaderboard()}
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <IconButton
                icon="close"
                label="Cancel"
                className="ghost"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateName("");
                }}
              />

              <IconButton
                icon="add_circle"
                label={creating ? "Creating…" : "Create"}
                onClick={createLeaderboard}
                disabled={creating}
              />
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Join a leaderboard</h3>
            <input
              className="invite-input"
              autoFocus
              placeholder="Paste invite code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinLeaderboard()}
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <IconButton
                icon="close"
                label="Cancel"
                className="ghost"
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinCode("");
                }}
              />

              <IconButton
                icon="group_add"
                label="Join"
                onClick={joinLeaderboard}
                disabled={joining}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* --------------------- small helpers --------------------- */
const Th = ({ children }) => <th>{children}</th>;
const Td = ({ children, ...rest }) => <td {...rest}>{children}</td>;

export default Leaderboard;
