// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../styles/dashboard.css";

const API_BASE = import.meta.env.VITE_WEB_URL;

const Dashboard = () => {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  const [accessToken, setAccessToken] = useState(null);
  const [me, setMe] = useState(null);

  const [currentSlide, setCurrentSlide] = useState(0);

  // NEW: ongoing quests from API
  const [ongoing, setOngoing] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);

  const dashboardData = {
    badgesCollected: 45,
    locationsVisited: 20,
    points: 50,
    questsCompleted: 35,
    latestBadge: "Explorer",
    latestLocation: "Central Park",
  };

  const leaderboard = [
    { rank: 1, name: "Person 1" },
    { rank: 2, name: "Person 2" },
    { rank: 3, name: "Me" },
    { rank: 4, name: "Person 3" },
    { rank: 5, name: "Person 4" },
    { rank: 6, name: "Person 5" },
  ];

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

  // ---------- BADGES ----------
  const makeBadgesUrl = () => {
    const userId = me?.id;
    if (!userId) return null;
    return `${API_BASE}/users/${encodeURIComponent(userId)}/collectibles`;
    // ^ keeps your existing route shape
  };

  const placeholder =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
        <rect width='100%' height='100%' fill='#eee'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#888'>Badge</text>
      </svg>`
    );

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
      if (!Array.isArray(data)) throw new Error("API did not return an array");
      setBadges(data);
    } catch (e) {
      setBadges([]);
      toast.error(e.message || "Failed to load badges");
    } finally {
      setLoadingBadges(false);
    }
  };

  // ---------- ONGOING QUESTS ----------
  // Load from /user-quests; join provides quests.{name, pointsAchievable}
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

      // json is an array of userQuests rows; normalize for UI
      const rows = (Array.isArray(json) ? json : []).map((r) => {
        const j = r.quests || {}; // joined quests row
        return {
          id: r.id,
          questId: r.questId,
          step: r.step ?? "0",
          isComplete: !!r.isComplete,
          completedAt: r.completedAt || null,
          // what you asked for:
          name: j.name ?? `Quest ${r.questId}`,
          points: j.pointsAchievable ?? 0,
        };
      });

      // show only "current" (incomplete) quests
      setOngoing(rows.filter((q) => !q.isComplete));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // ---------- badges carousel helpers ----------
  const nextSlide = () => {
    if (badges.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % Math.ceil(badges.length / 4));
    }
  };

  const prevSlide = () => {
    if (badges.length > 0) {
      setCurrentSlide(
        (prev) =>
          (prev - 1 + Math.ceil(badges.length / 4)) %
          Math.ceil(badges.length / 4)
      );
    }
  };

  const getBadgesToShow = () => {
    const itemsPerSlide = 4;
    const start = currentSlide * itemsPerSlide;
    return badges.slice(start, start + itemsPerSlide);
  };

  return (
    <div className="dashboard-container">
      <Toaster />

      <main className="main-content" role="main" aria-label="Dashboard">
        <header className="dashboard-header">
          <h1>DASHBOARD</h1>
        </header>

        {/* Dashboard Cards Grid */}
        <section
          className="dashboard-grid"
          aria-label="User statistics and badges"
        >
          {/* Badges Collected */}
          <article
            className="dashboard-card badges-card"
            aria-labelledby="badges-collected-title"
          >
            <div className="card-header">
              <h3 id="badges-collected-title">Badges collected</h3>
              <div className="badge-count" aria-live="polite">
                {dashboardData.badgesCollected}
              </div>
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

            {/* Badges Carousel */}
            <div
              className="badges-carousel"
              role="region"
              aria-label="Collected badges carousel"
            >
              <div className="carousel-header">
                <button className="view-badges-btn" aria-label="View all badges">
                  View Badges
                </button>
                <div className="carousel-controls">
                  <button
                    onClick={prevSlide}
                    className="carousel-btn"
                    aria-label="Previous badges"
                  >
                    ←
                  </button>
                  <button
                    onClick={nextSlide}
                    className="carousel-btn"
                    aria-label="Next badges"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="carousel-container">
                {loadingBadges ? (
                  <div className="carousel-loading" role="status" aria-live="polite">
                    Loading badges...
                  </div>
                ) : badges.length === 0 ? (
                  <div className="no-badges">No badges yet</div>
                ) : (
                  <div className="carousel-track">
                    {getBadgesToShow().map((badge) => (
                      <div
                        key={badge.id}
                        className="badge-item"
                        role="group"
                        aria-label={`Badge: ${badge.name}`}
                      >
                        <img
                          src={badge.imageUrl || placeholder}
                          alt={badge.name || "badge"}
                          onError={(e) => {
                            e.currentTarget.src = placeholder;
                          }}
                        />
                        <span className="badge-item-name">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Locations Visited */}
          <article
            className="dashboard-card"
            aria-labelledby="locations-visited-title"
          >
            <h3 id="locations-visited-title">Locations Visited</h3>
            <div className="stat-number" aria-live="polite">
              {dashboardData.locationsVisited}
            </div>
            <div className="latest-info">
              <div className="latest-box">
                <span>Latest Location</span>
                <div>{dashboardData.latestLocation}</div>
              </div>
            </div>
          </article>

          {/* Ongoing Quests */}
          <article
            className="dashboard-card quests-card"
            aria-labelledby="ongoing-quests-title"
          >
            <h3 id="ongoing-quests-title">Ongoing Quests</h3>
            <div className="quests-table" role="table" aria-label="Ongoing quests">
              {loadingOngoing ? (
                <div className="carousel-loading">Loading quests...</div>
              ) : ongoing.length === 0 ? (
                <div className="no-badges">No ongoing quests</div>
              ) : (
                <>
                  <div className="quest-row quest-header" role="row">
                    <span className="quest-name" role="columnheader">Quest</span>
                    <span className="quest-points" role="columnheader">Points</span>
                    <span className="quest-step" role="columnheader">Step</span>
                    <span className="quest-status" role="columnheader">Status</span>
                  </div>
                  {ongoing.map((q) => (
                    <div key={q.id} className="quest-row" role="row">
                      <span className="quest-name" role="cell">{q.name}</span>
                      <span className="quest-points" role="cell">{q.points}</span>
                      <span className="quest-step" role="cell">{q.step}</span>
                      <span className="quest-status" role="cell">
                        {q.isComplete ? "Completed" : "In progress"}
                      </span>
                      <button
                        className="quest-view-btn"
                        onClick={() => navigate(`/quests/${q.questId}?uq=${q.id}`)}
                        aria-label={`Open ${q.name}`}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </article>

          {/* Leaderboard */}
          <article
            className="dashboard-card leaderboard-card"
            aria-labelledby="leaderboard-title"
          >
            <h3 id="leaderboard-title">Leaderboard</h3>
            <div className="leaderboard-list" role="list">
              {leaderboard.map((person) => (
                <div
                  key={person.rank}
                  className={`leaderboard-row ${person.name === "Me" ? "me" : ""}`}
                  role="listitem"
                  aria-label={`Rank ${person.rank}, ${person.name}`}
                >
                  <span className="rank">{person.rank}</span>
                  <span className="name">{person.name}</span>
                </div>
              ))}
            </div>
          </article>

          {/* Points */}
          <article className="dashboard-card small-card" aria-labelledby="points-title">
            <h3 id="points-title">Points</h3>
            <div className="stat-number" aria-live="polite">
              {dashboardData.points}
            </div>
          </article>

          {/* Quests Completed */}
          <article className="dashboard-card small-card" aria-labelledby="quests-completed-title">
            <h3 id="quests-completed-title">Quests Completed</h3>
            <div className="stat-number" aria-live="polite">
              {dashboardData.questsCompleted}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
