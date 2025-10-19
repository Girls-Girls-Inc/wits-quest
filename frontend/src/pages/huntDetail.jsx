import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import supabase from "../supabase/supabaseClient";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import "../styles/quests.css";
import IconButton from "../components/IconButton";

const API_BASE = import.meta.env.VITE_WEB_URL;

const HuntDetail = () => {
  const [searchParams] = useSearchParams();
  const [hunt, setHunt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();
  const userHuntId = searchParams.get("uh");

  const calcRemaining = (closingAt) => {
    if (!closingAt) return "—";
    const now = new Date();
    const closing = new Date(closingAt);
    const diff = closing - now;
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 1000 / 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return `${minutes}m ${seconds}s`;
  };

  // --- Fetch user session
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
    })();
  }, []);

  // --- Fetch hunt details
  useEffect(() => {
    if (!accessToken || !userHuntId) return;

    const loadHunt = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/user-hunts/${userHuntId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        setHunt(data);
        if (data.closingAt) setRemainingTime(calcRemaining(data.closingAt));
      } catch (err) {
        console.error("Error loading hunt:", err);
        toast.error("Failed to load hunt details");
      } finally {
        setLoading(false);
      }
    };

    loadHunt();
  }, [accessToken, userHuntId]);

  // --- Countdown timer
  useEffect(() => {
    if (!hunt?.closingAt) return;
    const interval = setInterval(() => {
      setRemainingTime(calcRemaining(hunt.closingAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [hunt?.closingAt]);

  // --- Handle answer submission
  const checkAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    setSubmitting(true);
    setFeedback("");

    try {
      const res = await fetch(`${API_BASE}/user-hunts/${userHuntId}/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ answer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error checking answer");

      if (data.correct) {
        toast.success("✅ Correct! Collectible awarded 🎉", { duration: 4000 });

        // Mark hunt complete + award collectible
        try {
          await fetch(`${API_BASE}/user-hunts/${userHuntId}/complete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const collectibleId = hunt?.hunts?.collectibleId;
          if (collectibleId != null) {
            await fetch(
              `${API_BASE}/users/${encodeURIComponent(
                hunt.userId
              )}/collectibles/${encodeURIComponent(collectibleId)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
          }

          setTimeout(() => navigate("/dashboard"), 2000);
        } catch (err) {
          console.error("Error awarding collectible:", err);
          toast.error("Hunt completed, but collectible award failed.");
        }
      } else {
        setFeedback("❌ Incorrect answer, try again.");
      }
    } catch (err) {
      console.error("Error checking answer:", err);
      toast.error("Failed to check answer");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page flex justify-center items-center h-screen text-lg">
        <p>Loading hunt details…</p>
      </div>
    );
  }

  if (!hunt) return <p>Hunt not found</p>;
  const h = hunt.hunts || {};
  const isExpiredOrCompleted = hunt.isComplete || remainingTime === "Expired";

  return (
    <div className="admin-container">
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">{hunt?.hunts?.name || "Hunt"}</h1>
          <div className="admin-header__actions">
            <IconButton
              type="button"
              icon="arrow_back"
              label="Back to Dashboard"
              onClick={() => navigate("/dashboard")}
            />
          </div>
        </div>
      </div>

      <section className="quiz-section">
        <h3>Hunt Challenge</h3>
        <p>{h.description || "No description provided."}</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            checkAnswer();
          }}
        >
          <div className="quiz-options" style={{ marginTop: "20px" }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: "16px",
              }}
            >
              <span style={{ marginBottom: "8px", fontWeight: "500" }}>
                Question:
              </span>
              <span
                style={{ fontSize: "1rem", color: "#fff", fontWeight: "600" }}
              >
                {h.question || "?"}
              </span>
            </label>

            <label
              style={{
                display: "flex",
                flexDirection: "column",
                marginBottom: "16px",
              }}
            >
              <span style={{ marginBottom: "8px", fontWeight: "500" }}>
                Time Remaining:
              </span>
              <span
                style={{
                  fontSize: "0.95rem",
                  color: "#1E90FF",
                  fontWeight: "600",
                }}
              >
                {remainingTime || "Calculating..."}
              </span>
            </label>
          </div>

          {!isExpiredOrCompleted ? (
            <>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer here..."
              />

              {feedback && (
                <p
                  style={{
                    textAlign: "center",
                    fontWeight: "500",
                    marginTop: "12px",
                    color: feedback.includes("✅") ? "#22c55e" : "#ef4444",
                  }}
                >
                  {feedback}
                </p>
              )}

              <div className="action-buttons" style={{ marginTop: "20px" }}>
                <IconButton
                  type="submit"
                  icon={submitting ? "hourglass_bottom" : "send"}
                  label={submitting ? "Checking..." : "Submit Answer"}
                  disabled={submitting}
                />
                <IconButton
                  type="button"
                  icon="restart_alt"
                  label="Clear"
                  onClick={() => setAnswer("")}
                  disabled={submitting}
                />
              </div>
            </>
          ) : (
            <p
              style={{
                color: "#22c55e",
                fontWeight: "600",
                textAlign: "center",
                marginTop: "20px",
              }}
            >
              ✅ This hunt is completed or expired.
            </p>
          )}
        </form>
      </section>
    </div>
  );
};

export default HuntDetail;
