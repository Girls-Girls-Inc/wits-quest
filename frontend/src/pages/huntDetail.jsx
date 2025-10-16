import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import supabase from "../supabase/supabaseClient";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/adminDashboard.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";

const API_BASE = import.meta.env.VITE_WEB_URL;
const TOAST_OPTIONS = {
  style: {
    background: "#002d73",
    color: "#ffb819",
  },
  success: {
    style: { background: "green", color: "white" },
  },
  error: {
    style: { background: "red", color: "white" },
  },
  loading: {
    style: { background: "#002d73", color: "#ffb819" },
  },
};

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
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />

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


      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          checkAnswer();
        }}
      >


        <InputField
          type="text"
          name="description"
          placeholder="Description"
          value={h.description || "No description provided."}
          icon="description"
          readOnly
        />

        <InputField
          type="text"
          name="question"
          placeholder="Question"
          value={h.question || "?"}
          icon="help"
          readOnly
        />

        <div className="input-box">
          <label>Time Remaining</label>
          <div className="text-sm font-semibold text-blue-600">
            {remainingTime || "Calculating..."}
          </div>
        </div>

        {!isExpiredOrCompleted ? (
          <>
            <div className="input-box">
              <label>Your Answer</label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                className="input"
              />
            </div>

            {feedback && (
              <p
                className={`text-center font-medium ${
                  feedback.includes("✅")
                    ? "text-green-600"
                    : "text-red-500"
                }`}
              >
                {feedback}
              </p>
            )}

            <div className="btn flex gap-2 mt-4">
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
          <p className="text-green-600 font-semibold text-center mt-6">
            ✅ This hunt is completed or expired.
          </p>
        )}
      </form>
    </div>
  );
};

export default HuntDetail;
