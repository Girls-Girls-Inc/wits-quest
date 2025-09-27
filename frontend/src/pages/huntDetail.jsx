import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import supabase from "../supabase/supabaseClient";

const API_BASE = import.meta.env.VITE_WEB_URL;

const HuntDetail = () => {
  const [searchParams] = useSearchParams();
  const [hunt, setHunt] = useState(null);
  const [loading, setLoading] = useState(true);

  const userHuntId = searchParams.get("uh");
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token || null);
    })();
  }, []);

    useEffect(() => {
    if (!accessToken || !userHuntId) return;

    const loadHunt = async () => {
        setLoading(true);
        try {
        const res = await fetch(`${API_BASE}/user-hunts/${userHuntId}`, {
            headers: {
            Authorization: `Bearer ${accessToken}`,
            },
        });
        const data = await res.json();
        console.log("Hunt data:", data); // <-- add this
        setHunt(data);
        } catch (err) {
        console.error(err);
        } finally {
        setLoading(false);
        }
    };
    loadHunt();
    }, [accessToken, userHuntId]);


  if (loading) return <p>Loading hunt details…</p>;
  if (!hunt) return <p>Hunt not found</p>;

  const h = hunt.hunts || {}; // <-- fix here

    return (
    <div>
        <h2>{h.name}</h2>
        <p><strong>Description:</strong> {h.description}</p>
        <p><strong>Question:</strong> {h.question}</p>
        <p><strong>Answer:</strong> {h.answer}</p>
        <p><strong>Status:</strong> {hunt.isActive ? "Active" : "Inactive"}</p>
    </div>
    );
};

export default HuntDetail;
