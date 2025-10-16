import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
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
  const navigate = useNavigate();

  // helper: calculate remaining time
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
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
    })();
  }, []);

  // Fetch hunt
  useEffect(() => {
    if (!accessToken || !userHuntId) return;

    const loadHunt = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_WEB_URL}/user-hunts/${userHuntId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        setHunt(data);

        if (data.closingAt) setRemainingTime(calcRemaining(data.closingAt));
      } catch (err) {
        console.error("Error loading hunt:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHunt();
  }, [accessToken, userHuntId]);

  // Countdown timer
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

  // Submit answer
  const checkAnswer = async () => {
    setFeedback("");
    if (!answer) return;

    try {
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

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error checking answer");

      if (data.correct) {
        setFeedback("✅ Correct! Hunt completed.");

        try {
          // Step 1: Mark hunt as complete
          await fetch(
            `${import.meta.env.VITE_WEB_URL}/user-hunts/${userHuntId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          // Step 2: Award collectible (if any)
          const collectibleId = h.collectibleId;
          if (collectibleId != null) {
            await fetch(
              `${import.meta.env.VITE_WEB_URL}/users/${encodeURIComponent(
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

          // ✅ Toast message
          toast.success("✅ Correct! Collectible awarded 🎉", {
            duration: 4000,
          });

          // Delay before redirect
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } catch (err) {
          console.error("Error awarding collectible:", err);
          toast.error("Hunt completed, but collectible award failed.");
        }
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
      <Toaster position="top-center" />
      <h2>{h.name || "Hunt"}</h2>
      <p>
        <strong>Description:</strong> {h.description || "N/A"}
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
