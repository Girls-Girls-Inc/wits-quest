import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import supabase from "../supabase/supabaseClient";

const HuntDetail = () => {
  const [searchParams] = useSearchParams();
  const [hunt, setHunt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remainingTime, setRemainingTime] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [accessToken, setAccessToken] = useState(null);

  const userHuntId = searchParams.get("uh");

  // --- helper: calculate remaining time ---
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

  // Fetch session
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("Supabase session:", session);
        setAccessToken(session?.access_token || null);
      } catch (err) {
        console.error("Error fetching session:", err);
      }
    })();
  }, []);

  // Fetch hunt
  useEffect(() => {
    if (!accessToken || !userHuntId) return;

    const loadHunt = async () => {
      setLoading(true);
      try {
        console.log("Fetching hunt for userHuntId:", userHuntId);
        const res = await fetch(
          `${import.meta.env.VITE_WEB_URL}/user-hunts/${userHuntId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        console.log("Raw response:", res);
        const data = await res.json();
        console.log("Parsed hunt data:", data);
        setHunt(data);

        // set initial remaining time right away
        if (data.closingAt) {
          setRemainingTime(calcRemaining(data.closingAt));
        }
      } catch (err) {
        console.error("Error loading hunt:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHunt();
  }, [accessToken, userHuntId]);

  // Countdown updater
  useEffect(() => {
    if (!hunt?.closingAt) return;

    const interval = setInterval(() => {
      setRemainingTime(calcRemaining(hunt.closingAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [hunt?.closingAt]);

  if (loading) return <p>Loading hunt details…</p>;
  if (!hunt) return <p>Hunt not found</p>;

  const h = hunt.hunts || {};
  console.log("Current hunt object:", h);

  // Submit answer to backend
  const checkAnswer = async () => {
    setFeedback("");
    if (!answer) return;

    try {
      console.log("Submitting answer:", answer);
      const res = await fetch(
        `${import.meta.env.VITE_WEB_URL}/user-hunts/${userHuntId}/check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ answer }),
        }
      );

      console.log("Check answer response:", res);
      const data = await res.json();
      console.log("Check answer parsed data:", data);

      if (!res.ok) throw new Error(data?.message || "Error checking answer");

      if (data.correct) {
        setFeedback("✅ Correct! Hunt completed.");
        setHunt((prev) => ({ ...prev, isComplete: true, isActive: false }));
      } else {
        setFeedback("❌ Incorrect answer, try again.");
      }
    } catch (err) {
      console.error("Error checking answer:", err);
      setFeedback("Error checking answer, try again later.");
    }
  };

  const isExpiredOrCompleted = hunt.isComplete || remainingTime === "Expired";

  return (
    <div>
      <h2>{h.name || "fillerOne"}</h2>
      <p>
        <strong>Description:</strong> {h.description || "to be replaced"}
      </p>
      <p>
        <strong>Question:</strong> {h.question || "?"}
      </p>
      <p>
        <strong>Time Remaining:</strong> {remainingTime || "Calculating..."}
      </p>

      {!isExpiredOrCompleted ? (
        <div>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
          />
          <button onClick={checkAnswer}>Check</button>
          {feedback && <p>{feedback}</p>}
        </div>
      ) : (
        <p>✅ This hunt is completed or expired.</p>
      )}
    </div>
  );
};

export default HuntDetail;
