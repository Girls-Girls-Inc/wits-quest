import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";
import "../styles/leaderboard.css";

const API_BASE = import.meta.env.VITE_WEB_URL;

const Dashboard = () => {
  const navigate = useNavigate();

  const [accessToken, setAccessToken] = useState(null);
  const [me, setMe] = useState(null);

  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  const [ongoing, setOngoing] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);

  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  // --- inside Dashboard component ---

  const [hunts, setHunts] = useState([]);
  const [loadingHunts, setLoadingHunts] = useState(true);

  // Fetch hunts
  const loadHunts = async () => {
    try {
      setLoadingHunts(true);
      const res = await fetch(`${API_BASE}/hunts`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      setHunts(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error("Hunts fetch failed:", e.message);
      setHunts([]);
      toast.error(e.message || "Failed to load hunts");
    } finally {
      setLoadingHunts(false);
    }
  };

  // call loadHunts together with other loaders
  useEffect(() => {
    if (accessToken) {
      loadBadges();
      loadOngoing();
      loadLeaderboard();
      loadHunts(); // 👈 added
    }
  }, [accessToken]);

  const [dashboardData, setDashboardData] = useState({
    badgesCollected: 0,
    locationsVisited: 0,
    points: 0,
    questsCompleted: 0,
    latestBadge: "—",
    latestLocation: "—",
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch Supabase session
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

  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
      <rect width='100%' height='100%' fill='#eee'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#888'>Badge</text>
    </svg>`);

  // Fetch badges
  const loadBadges = async () => {
    if (!accessToken || !me?.id) {
      setBadges([]);
      setLoadingBadges(false);
      return;
    }
    setLoadingBadges(true);
    try {
      const url = `${API_BASE}/users/${encodeURIComponent(me.id)}/collectibles`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBadges(data || []);
      setDashboardData((prev) => ({
        ...prev,
        badgesCollected: data.length,
        latestBadge: data[data.length - 1]?.name || "—",
      }));
    } catch (e) {
      setBadges([]);
      toast.error(e.message || "Failed to load badges");
    } finally {
      setLoadingBadges(false);
    }
  };

  // Fetch ongoing quests
  const loadOngoing = async () => {
    if (!accessToken) {
      setOngoing([]);
      setLoadingOngoing(false);
      return;
    }
    setLoadingOngoing(true);
    try {
      const res = await fetch(`${API_BASE}/user-quests`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

      const rows = (Array.isArray(json) ? json : []).map((r) => {
        const j = r.quests || {};
        return {
          id: r.id,
          questId: r.questId,
          userId: r.userId,
          step: r.step ?? "0",
          isComplete: !!r.isComplete,
          completedAt: r.completedAt || null,
          name: j.name ?? `Quest ${r.questId}`,
          points: j.pointsAchievable ?? 0,
          location:
            j.locations?.name ||
            (typeof j.locationId !== "undefined"
              ? `Location ${j.locationId}`
              : "—"),
        };
      });

      setOngoing(rows.filter((q) => !q.isComplete));
      const completedQuests = rows.filter((q) => q.isComplete);
      const uniqueLocations = new Set(
        completedQuests
          .map((q) => q.location)
          .filter((loc) => loc && loc !== "—")
      );
      const completedRows = rows.filter(
        (q) => q.isComplete && q.userId === me?.id
      );

      const totalPoints = completedQuests.reduce((sum, q) => sum + q.points, 0);
      const latestRow = completedRows.sort(
        (a, b) => new Date(b.completedAt) - new Date(a.completedAt)
      )[0];
      const latestLocation = latestRow?.location || "—";

      setDashboardData((prev) => ({
        ...prev,
        questsCompleted: completedRows.length,
        locationsVisited: uniqueLocations.size,
        points: totalPoints,
        latestLocation,
      }));
    } catch (e) {
      setOngoing([]);
      toast.error(e.message || "Failed to load ongoing quests");
    } finally {
      setLoadingOngoing(false);
    }
  };

  // Fetch leaderboard
  const loadLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const res = await fetch(`${API_BASE}/leaderboard?id=12345`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("API did not return an array");
      const rows = data.map((r, i) => ({
        rank: i + 1,
        name: r.username,
        points: r.points,
      }));
      setLeaderboard(rows);
    } catch (e) {
      console.error("Leaderboard fetch failed:", e.message);
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadBadges();
      loadOngoing();
      loadLeaderboard();
    }
  }, [accessToken]);

  const nextSlide = () => {
    if (badges.length > 0)
      setCurrentSlide((prev) => (prev + 1) % Math.ceil(badges.length / 4));
  };

  const prevSlide = () => {
    if (badges.length > 0)
      setCurrentSlide(
        (prev) =>
          (prev - 1 + Math.ceil(badges.length / 4)) %
          Math.ceil(badges.length / 4)
      );
  };

  const getBadgesToShow = () => {
    const itemsPerSlide = 4;
    return badges.slice(
      currentSlide * itemsPerSlide,
      currentSlide * itemsPerSlide + itemsPerSlide
    );
  };

  return (
    <div className="dashboard-container">
      <main className="main-content" role="main" aria-label="Dashboard">
        <header className="dashboard-header">
          <h1>DASHBOARD</h1>
        </header>

        <section
          className="dashboard-grid"
          aria-label="User statistics and badges"
        >
          {/* Ongoing Quests */}
          <article className="dashboard-card quests-card">
            <h3>Ongoing Quests</h3>
            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Quest</th>
                    <th>Points</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingOngoing ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={5} className="skeleton-row"></td>
                      </tr>
                    ))
                  ) : ongoing.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No ongoing quests</td>
                    </tr>
                  ) : (
                    ongoing.map((q) => (
                      <tr key={q.id}>
                        <td>
                          <button
                            aria-label="Quests feature"
                            className="dash-btn"
                            onClick={() =>
                              navigate(`/displayQuests/${q.questId}?uq=${q.id}`)
                            }
                            disabled={!q.questId}
                          >
                            View
                          </button>
                        </td>
                        <td className="truncate">{q.name}</td>
                        <td>{q.points}</td>
                        <td className="truncate">{q.location}</td>
                        <td>{q.isComplete ? "Completed" : "In progress"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
          {/* Hunts */}
          <article className="dashboard-card quests-card">
            <h3>Available Hunts</h3>
            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Question</th>
                    <th>Time Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingHunts ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={4} className="skeleton-row"></td>
                      </tr>
                    ))
                  ) : hunts.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No hunts available</td>
                    </tr>
                  ) : (
                    hunts.map((h) => (
                      <tr key={h.id}>
                        <td className="truncate">{h.name}</td>
                        <td className="truncate">{h.description || "—"}</td>
                        <td className="truncate">{h.question || "—"}</td>
                        <td>{h.timeLimit ? `${h.timeLimit}s` : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Badges Card */}
          <article className="dashboard-card badges-card">
            <div className="card-header">
              <h3>Badges Collected</h3>
              <div className="badge-count">{dashboardData.badgesCollected}</div>
            </div>
            <div className="latest-badge">
              <div
                className="badge-circle"
                aria-label={`Latest badge: ${dashboardData.latestBadge}`}
              >
                <span>Latest badge</span>
                <div className="badge-name truncate">
                  {dashboardData.latestBadge}
                </div>
              </div>
            </div>

            <div className="badges-carousel">
              <div className="carousel-header">
                <button className="view-badges-btn" aria-label="View badges">
                  View Badges
                </button>
                <div className="carousel-controls">
                  <button
                    aria-label="Scroll left on badges"
                    className="carousel-btn"
                    onClick={prevSlide}
                  >
                    ←
                  </button>
                  <button
                    aria-label="Scroll right on badges"
                    className="carousel-btn"
                    onClick={nextSlide}
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="carousel-container">
                {loadingBadges ? (
                  <div className="skeleton-badges">Loading…</div>
                ) : badges.length === 0 ? (
                  <div>No badges yet</div>
                ) : (
                  <div className="carousel-track">
                    {getBadgesToShow().map((badge) => (
                      <div key={badge.id} className="badge-item">
                        <img
                          src={badge.imageUrl || placeholder}
                          alt={badge.name || "badge"}
                          width={120}
                          height={120}
                          onError={(e) => (e.currentTarget.src = placeholder)}
                        />
                        <span className="badge-item-name truncate">
                          {badge.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Leaderboard */}
          <article className="dashboard-card leaderboard-card">
            <h3>Leaderboard</h3>
            <div className="leaderboard-scroll">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLeaderboard ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={3} className="skeleton-row"></td>
                      </tr>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={3}>No leaderboard data</td>
                    </tr>
                  ) : (
                    leaderboard.map((person) => (
                      <tr
                        key={person.rank}
                        className={
                          person.name === me?.user_metadata?.username
                            ? "me"
                            : ""
                        }
                      >
                        <td>{person.rank}</td>
                        <td className="truncate">{person.name}</td>
                        <td>{person.points}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Points */}
          <article className="dashboard-card small-card">
            <h3>Points</h3>
            <div className="stat-number">{dashboardData.points}</div>
          </article>

          {/* Quests Completed */}
          <article className="dashboard-card small-card">
            <h3>Quests Completed</h3>
            <div className="stat-number">{dashboardData.questsCompleted}</div>
          </article>
          {/* Locations Card */}
          <article className="dashboard-card">
            <h3>Locations Visited</h3>
            <div className="stat-number">{dashboardData.locationsVisited}</div>
            <div className="latest-info">
              <div className="latest-box">
                <span>Latest Location</span>
                <div className="truncate">{dashboardData.latestLocation}</div>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
