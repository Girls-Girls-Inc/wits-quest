import React, { useEffect, useState } from "react";
import supabase from "../supabase/supabaseClient";
import IconButton from "../components/IconButton";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";

const Quests = () => {
  const [quests, setQuests] = useState([]);

  // --- Dummy quests for offline testing ---
  const dummyQuests = [
    {
      id: 101,
      name: "Campus Check-In",
      description: "Sometimes, just showing up is the adventure.",
      location: "Wits Campus",
      rewards: "100 points",
      imageUrl: "https://picsum.photos/200/300",
      createdAt: new Date().toISOString(),
    },
    {
      id: 102,
      name: "Library Explorer",
      description: "Find the hidden book in the library!",
      location: "Wits Library",
      rewards: "150 points",
      imageUrl: "https://picsum.photos/200/300",
      createdAt: new Date().toISOString(),
    },
  ];

  const loadQuests = async () => {
    const loadingToast = toast.loading("Loading quests...");

    try {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .order("createdAt", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuests(data);
        toast.success("Quests loaded successfully!", { id: loadingToast });
      } else {
        setQuests(dummyQuests);
        toast("No quests found, showing dummy quests", { id: loadingToast });
      }
    } catch (err) {
      toast.error(err.message || "Failed to load quests", { id: loadingToast });
      setQuests(dummyQuests);
    }
  };

  useEffect(() => {
    loadQuests();
  }, []);

  return (
    <div className="quests-container">
      <Toaster />
      <div className="quests-header">
        <h1>QUESTS</h1>
        <div className="quest-buttons">
          <button onClick={() => toast("Create Quest clicked!")}>
            Create Quest
          </button>
          <button onClick={loadQuests}>Refresh</button>
        </div>
      </div>

      <div className="quest-list">
        {quests.map((q) => (
          <div key={q.id} className="quest-card">
            <div className="quest-profile">
              <img
                src={q.imageUrl || "https://via.placeholder.com/100"}
                alt="Quest maker"
              />
              <p>Quest maker’s profile</p>
            </div>

            <div className="quest-info">
              <h2>{q.name}</h2>
              <p>
                <strong>Location:</strong> {q.location || "Unknown"}
              </p>
              <p>
                <strong>Rewards:</strong> {q.rewards || "100 points"}
              </p>
            </div>

            <div className="quest-action">
              <button onClick={() => toast(`Viewing ${q.name}`)}>
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Quests;
