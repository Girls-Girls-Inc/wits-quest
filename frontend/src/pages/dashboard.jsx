import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import "../styles/dashboard.css";
import "../styles/leaderboard.css"; // add this line

const API_BASE = import.meta.env.VITE_WEB_URL;

const Dashboard = () => {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [me, setMe] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const dashboardData = {
    badgesCollected: 45,
    locationsVisited: 20,
    points: 50,
    questsCompleted: 35,
    latestBadge: "Explorer",
    latestLocation: "Central Park",
  };

  const ongoingQuests = [
    { id: 1, name: "Quest 1", location: "Downtown", timeLeft: "2h 30m" },
    { id: 2, name: "Quest 2", location: "Uptown", timeLeft: "1h 15m" },
    { id: 3, name: "Quest 3", location: "Midtown", timeLeft: "45m" },
  ];

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

  const makeUrl = () => {
    const userId = me?.id;
    if (!userId) return null;
    return `${API_BASE}/users/${encodeURIComponent(userId)}/collectibles`;
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
    const url = makeUrl();
    if (!accessToken || !url) {
      setBadges([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) loadBadges();
  }, [accessToken]);

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
          {/* Badges Collected Card */}
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
                <button
                  className="view-badges-btn"
                  aria-label="View all badges"
                >
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
                {loading ? (
                  <div
                    className="carousel-loading"
                    role="status"
                    aria-live="polite"
                  >
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

          {/* Locations Visited Card */}
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

          {/* Ongoing Quests Card */}
          <article
            className="dashboard-card quests-card"
            aria-labelledby="ongoing-quests-title"
          >
            <h3 id="ongoing-quests-title">Ongoing Quests</h3>
            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Quest</th>
                    <th>Location</th>
                    <th>Time Left</th>
                  </tr>
                </thead>
                <tbody>
                  {ongoingQuests.length === 0 && (
                    <tr>
                      <td colSpan={3} className="empty">
                        No ongoing quests
                      </td>
                    </tr>
                  )}
                  {ongoingQuests.map((quest) => (
                    <tr key={quest.id}>
                      <td>{quest.name}</td>
                      <td>{quest.location}</td>
                      <td>{quest.timeLeft}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Leaderboard Card */}
          {/* Leaderboard Card */}
          <article
            className="dashboard-card leaderboard-card"
            aria-labelledby="leaderboard-title"
          >
            <h3 id="leaderboard-title">Leaderboard</h3>

            <div className="leaderboard-table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={2} className="empty">
                        No entries yet
                      </td>
                    </tr>
                  )}

                  {leaderboard.map((person) => (
                    <tr
                      key={person.rank}
                      className={person.name === "Me" ? "me" : ""}
                    >
                      <td>
                        <strong>{person.rank}</strong>
                        {person.rank <= 3 && (
                          <span
                            className="material-symbols-outlined trophy"
                            title="Top rank"
                          >
                            emoji_events
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{person.name}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Points Card */}
          <article
            className="dashboard-card small-card"
            aria-labelledby="points-title"
          >
            <h3 id="points-title">Points</h3>
            <div className="stat-number" aria-live="polite">
              {dashboardData.points}
            </div>
          </article>

          {/* Quests Completed Card */}
          <article
            className="dashboard-card small-card"
            aria-labelledby="quests-completed-title"
          >
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
