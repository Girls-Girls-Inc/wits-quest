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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    question: "",
    answer: "",
    timeLimit: "",
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

  useEffect(() => {
    loadHunts();
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
      toast.error(err.message, { id: t });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this hunt?")) return;
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
      toast.error(err.message, { id: t });
    }
  };

  return (
    <div className="quests-container">
      <Toaster />
      <div className="quests-header">
        <h1>Manage Hunts</h1>
        <IconButton icon="refresh" label="Refresh" onClick={loadHunts} />
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

      <div className="quest-list">
        {hunts.map((h) => (
          <div
            key={h.id}
            className="quest-card flex items-center gap-4 p-4 border rounded mb-2"
          >
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
                onClick={() => handleDelete(h.id)}
              />
            </div>
          </div>
        ))}
        <div className="mt-4">
          <IconButton
            type="button"
            icon="arrow_back"
            label="Back to Admin"
            onClick={() => navigate("/adminDashboard")}
          />
        </div>
      </div>
    </div>
  );
}
