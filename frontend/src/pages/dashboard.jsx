import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
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

  const [dashboardData, setDashboardData] = useState({
    badgesCollected: 0,
    locationsVisited: 0,
    points: 0,
    questsCompleted: 0,
    latestBadge: "—",
    latestLocation: "—",
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  const leaderboard = [
    { rank: 1, name: "Person 1" },
    { rank: 2, name: "Person 2" },
    { rank: 3, name: "Me" },
    { rank: 4, name: "Person 3" },
    { rank: 5, name: "Person 4" },
    { rank: 6, name: "Person 5" },
  ];

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

  // Badge URL helper
  const makeBadgesUrl = () =>
    me?.id
      ? `${API_BASE}/users/${encodeURIComponent(me.id)}/collectibles`
      : null;

  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
      <rect width='100%' height='100%' fill='#eee'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#888'>Badge</text>
    </svg>`);

  // Fetch badges
  const loadBadges = async () => {
    const url = makeBadgesUrl();
    if (!accessToken || !url) {
      setBadges([]);
      setLoadingBadges(false);
      return;
    }

    setLoadingBadges(true);
    try {
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
          step: r.step ?? "0",
          isComplete: !!r.isComplete,
          completedAt: r.completedAt || null,
          name: j.name ?? `Quest ${r.questId}`,
          points: j.pointsAchievable ?? 0,
          location:
            j.location?.name ||
            j.locationName ||
            (typeof j.locationId !== "undefined"
              ? `Location ${j.locationId}`
              : "—"),
        };
      });

      setOngoing(rows.filter((q) => !q.isComplete));

      // Update dashboard stats
      setDashboardData((prev) => ({
        ...prev,
        questsCompleted: rows.filter((q) => q.isComplete).length,
        locationsVisited: new Set(rows.map((q) => q.location)).size,
      }));
    } catch (e) {
      setOngoing([]);
      toast.error(e.message || "Failed to load ongoing quests");
    } finally {
      setLoadingOngoing(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      loadBadges();
      loadOngoing();
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
      <Toaster />
      <main className="main-content" role="main" aria-label="Dashboard">
        <header className="dashboard-header">
          <h1>DASHBOARD</h1>
        </header>

        <section
          className="dashboard-grid"
          aria-label="User statistics and badges"
        >
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
                <div className="badge-name">{dashboardData.latestBadge}</div>
              </div>
            </div>

            <div className="badges-carousel">
              <div className="carousel-header">
                <button className="view-badges-btn">View Badges</button>
                <div className="carousel-controls">
                  <button onClick={prevSlide}>←</button>
                  <button onClick={nextSlide}>→</button>
                </div>
              </div>

              <div className="carousel-container">
                {loadingBadges ? (
                  <div>Loading badges...</div>
                ) : badges.length === 0 ? (
                  <div>No badges yet</div>
                ) : (
                  <div className="carousel-track">
                    {getBadgesToShow().map((badge) => (
                      <div key={badge.id} className="badge-item">
                        <img
                          src={badge.imageUrl || placeholder}
                          alt={badge.name || "badge"}
                          onError={(e) => (e.currentTarget.src = placeholder)}
                        />
                        <span className="badge-item-name">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Locations Card */}
          <article className="dashboard-card">
            <h3>Locations Visited</h3>
            <div className="stat-number">{dashboardData.locationsVisited}</div>
            <div className="latest-info">
              <div className="latest-box">
                <span>Latest Location</span>
                <div>{dashboardData.latestLocation}</div>
              </div>
            </div>
          </article>

          {/* Ongoing Quests */}
          <article className="dashboard-card quests-card">
            <h3>Ongoing Quests</h3>
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
                  <tr>
                    <td colSpan={5}>Loading quests…</td>
                  </tr>
                ) : ongoing.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No ongoing quests</td>
                  </tr>
                ) : (
                  ongoing.map((q) => (
                    <tr key={q.id}>
                      <td>{q.name}</td>
                      <td>{q.points}</td>
                      <td>{q.location}</td>
                      <td>{q.isComplete ? "Completed" : "In progress"}</td>
                      <td>
                        <button
                          onClick={() =>
                            navigate(`/quests/${q.questId}?uq=${q.id}`)
                          }
                          disabled={!q.questId}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </article>

          {/* Leaderboard */}
          <article className="dashboard-card leaderboard-card">
            <h3>Leaderboard</h3>
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((person) => (
                  <tr
                    key={person.rank}
                    className={person.name === "Me" ? "me" : ""}
                  >
                    <td>{person.rank}</td>
                    <td>{person.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
