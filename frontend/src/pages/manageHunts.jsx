import React, { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;

export default function ManageHunts() {
  const navigate = useNavigate();
  const [hunts, setHunts] = useState([]);
  const [editingHunt, setEditingHunt] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [collectibles, setCollectibles] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    question: "",
    answer: "",
    timeLimit: "",
    collectibleId: "",
    pointsAchievable: "",
  });

  const loadHunts = async () => {
    const t = toast.loading("Loading hunts...");
    try {
      const res = await fetch(`${API_BASE}/hunts`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch hunts");
      const data = await res.json();
      setHunts(Array.isArray(data) ? data : []);
      toast.success("Hunts loaded", { id: t });
    } catch (err) {
      toast.error(err.message || "Failed to load hunts", { id: t });
      setHunts([]);
    }
  };

  const loadCollectibles = async () => {
    try {
      const res = await fetch(`${API_BASE}/collectibles`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch collectibles");
      const data = await res.json();
      setCollectibles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCollectibles([]);
    }
  };


  useEffect(() => {
    loadHunts();
    loadCollectibles();
  }, []);

  const handleEditClick = (hunt) => {
    if (!hunt?.id) return toast.error("Invalid hunt selected");
    setEditingHunt({ ...hunt });
    setFormData({
      name: hunt.name || "",
      description: hunt.description || "",
      question: hunt.question || "",
      answer: hunt.answer || "",
      timeLimit: hunt.timeLimit || "",
      collectibleId: hunt.collectibleId || "",
      pointsAchievable: hunt.pointsAchievable || "",
    });
  };

  const handleSave = async () => {
    if (!editingHunt?.id) return toast.error("Invalid hunt selected");
    const t = toast.loading("Saving hunt...");
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        question: formData.question,
        answer: formData.answer,
        timeLimit: formData.timeLimit ? Number(formData.timeLimit) : null,
        collectibleId: formData.collectibleId
          ? Number(formData.collectibleId)
          : null,
        pointsAchievable: formData.pointsAchievable
          ? Number(formData.pointsAchievable)
          : 0,
      };
      const huntId = Number(editingHunt.id);
      const resp = await fetch(`${API_BASE}/hunts/${huntId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || "Failed to update hunt");

      setHunts(hunts.map((h) => (h.id === huntId ? { ...json.hunt } : h)));
      toast.success("Hunt updated", { id: t });
      setEditingHunt(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update hunt", { id: t });
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    setPendingDelete(null);
    const t = toast.loading("Deleting hunt...");
    try {
      const resp = await fetch(`${API_BASE}/hunts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!resp.ok) throw new Error("Failed to delete hunt");
      setHunts(hunts.filter((h) => h.id !== id));
      if (editingHunt?.id === id) setEditingHunt(null);
      toast.success("Hunt deleted", { id: t });
    } catch (err) {
      toast.error(err?.message || "Failed to delete hunt", { id: t });
    }
  };

  const requestDelete = (hunt) => setPendingDelete(hunt);
  const cancelDeletePrompt = () => setPendingDelete(null);
  const confirmDelete = () => {
    if (!pendingDelete?.id) return;
    handleDelete(pendingDelete.id);
  };

  return (
    <div className="quests-container">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#002d73",
            color: "#ffb819",
          },
          success: {
            style: {
              background: "green",
              color: "white",
            },
          },
          error: {
            style: {
              background: "red",
              color: "white",
            },
          },
          loading: {
            style: {
              background: "#002d73",
              color: "#ffb819",
            },
          },
        }}
      />
      <div className="quests-header">
        <h1>Manage Hunts</h1>
        <div className="quest-buttons">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
          <IconButton icon="refresh" label="Refresh" onClick={loadHunts} />
          <IconButton
            icon="add"
            label="New Hunt"
            onClick={() =>
              navigate("/adminDashboard", {
                state: { selectedTask: "Hunt Creation" },
              })
            }
          />
        </div>
      </div>

      {editingHunt && (
        <div className="modal-backdrop" onClick={() => setEditingHunt(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setEditingHunt(null)}
            >
              ✖
            </button>

            <div className="modal-body">
              <form
                className="login-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
                <div className="form-row">
                  <label htmlFor="name">Hunt Name</label>
                  <InputField
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Hunt Name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="description">Hunt Description</label>
                  <InputField
                    type="text"
                    id="description"
                    name="description"
                    placeholder="Hunt Description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="question">Question</label>
                  <InputField
                    type="text"
                    id="question"
                    name="question"
                    placeholder="Question"
                    value={formData.question}
                    onChange={(e) =>
                      setFormData({ ...formData, question: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="answer">Answer</label>
                  <InputField
                    type="text"
                    id="answer"
                    name="answer"
                    placeholder="Answer"
                    value={formData.answer}
                    onChange={(e) =>
                      setFormData({ ...formData, answer: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="collectibleId">Collectible</label>
                  <select
                    id="collectibleId"
                    name="collectibleId"
                    value={formData.collectibleId}
                    onChange={(e) =>
                      setFormData({ ...formData, collectibleId: e.target.value })
                    }
                  >
                    <option value="">Select a collectible</option>
                    {collectibles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>


                <div className="form-row">
                  <label htmlFor="timeLimit">Time Limit (seconds)</label>
                  <InputField
                    type="number"
                    id="timeLimit"
                    name="timeLimit"
                    placeholder="Time Limit (seconds)"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, timeLimit: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <label htmlFor="pointsAchievable">Points Achievable</label>
                  <InputField
                    type="number"
                    id="pointsAchievable"
                    name="pointsAchievable"
                    placeholder="Points Achievable"
                    value={formData.pointsAchievable}
                    onChange={(e) =>
                      setFormData({ ...formData, pointsAchievable: e.target.value })
                    }
                  />
                </div>

                <div className="btn">
                  <IconButton type="submit" icon="save" label="Save Hunt" />
                  <IconButton
                    type="button"
                    icon="arrow_back"
                    label="Cancel"
                    onClick={() => setEditingHunt(null)}
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-hunt-title"
          onClick={cancelDeletePrompt}
        >
          <div className="modal login-required" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <h2 id="delete-hunt-title">Delete Hunt?</h2>
              <p>
                Are you sure you want to delete "
                <strong>{pendingDelete.name}</strong>"? This action cannot be undone.
              </p>
              <div className="modal-actions">
                <IconButton icon="delete" label="Delete Hunt" onClick={confirmDelete} />
                <IconButton icon="close" label="Cancel" onClick={cancelDeletePrompt} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="quest-list">
        {hunts.map((h) => (
          <div
            key={h.id}
            className="quest-card flex items-center gap-4 p-4 border rounded mb-2"
          >
            <div className="quest-profile">
              <img
                src={
                  collectibles.find((c) => c.id === h.collectibleId)?.imageUrl ||
                  "https://via.placeholder.com/100"
                }
                alt={h.name}
                className="w-16 h-16 object-cover rounded"
              />
            </div>

            <div className="quest-info flex-1">
              <h2 className="font-bold">{h.name}</h2>
              <p>{h.description || "-"}</p>
              <p>
                <strong>Question:</strong> {h.question || "-"}
              </p>
              <p>
                <strong>Answer:</strong> {h.answer || "-"}
              </p>
              <p>
                <strong>Time Limit:</strong> {h.timeLimit ?? "-"}
              </p>
              <p>
                <strong>Points:</strong> {h.pointsAchievable ?? "-"}
              </p>
              <p>
                <strong>Collectible:</strong>{" "}
                {collectibles.find((c) => c.id === h.collectibleId)?.name || "-"}
              </p>
            </div>
            <div className="quest-action flex gap-2">
              <IconButton
                onClick={() => handleEditClick(h)}
                icon="edit"
                label="Edit"
              />
              <IconButton
                icon="delete"
                label="Delete"
                onClick={() => requestDelete(h)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
