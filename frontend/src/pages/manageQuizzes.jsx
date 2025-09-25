import React, { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import supabase from "../supabase/supabaseClient";
import "../styles/quests.css";
import "../styles/layout.css";
import "../styles/login-signup.css";
import "../styles/button.css";
import InputField from "../components/InputField";
import IconButton from "../components/IconButton";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_WEB_URL;
const DEFAULT_OPTIONS = ["", ""];

const cloneDefaultOptions = () => [...DEFAULT_OPTIONS];

const ensureOptionCount = (options, questionType) => {
  if (questionType !== "mcq") return options ?? cloneDefaultOptions();
  const next = [...(options || [])];
  while (next.length < 2) next.push("");
  return next.length ? next : cloneDefaultOptions();
};

const syncCorrectAnswer = (options, questionType, currentAnswer) => {
  if (questionType !== "mcq") return currentAnswer;
  const trimmed = (options || []).map((opt) => opt.trim()).filter(Boolean);
  return trimmed.includes((currentAnswer || "").trim()) ? currentAnswer : "";
};

export default function ManageQuizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [formData, setFormData] = useState({
    questionText: "",
    questionType: "text",
    options: cloneDefaultOptions(),
    correctAnswer: "",
  });

  const availableAnswers = useMemo(() => {
    if (formData.questionType !== "mcq") return [];
    const unique = new Set(
      (formData.options || [])
        .map((opt) => opt.trim())
        .filter(Boolean)
    );
    return Array.from(unique);
  }, [formData.options, formData.questionType]);

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const loadQuizzes = async () => {
    const toastId = toast.loading("Loading quizzes...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch(`${API_BASE}/quizzes`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to fetch quizzes");
      }
      const payload = await res.json();
      const rows = Array.isArray(payload) ? payload : [];
      setQuizzes(
        rows.map((q) => ({
          ...q,
          questionType: (q.questionType || "text").toLowerCase(),
          options: Array.isArray(q.options) ? q.options : [],
        }))
      );
      toast.success("Quizzes loaded", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Failed to load quizzes", { id: toastId });
      setQuizzes([]);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, []);

  const resetForm = () => {
    setEditingQuiz(null);
    setFormData({
      questionText: "",
      questionType: "text",
      options: cloneDefaultOptions(),
      correctAnswer: "",
    });
  };

  const handleEditClick = (quiz) => {
    if (!quiz?.id) return toast.error("Invalid quiz selected");
    const questionType = (quiz.questionType || "text").toLowerCase();
    const options = ensureOptionCount(quiz.options, questionType);
    setEditingQuiz({ ...quiz, questionType });
    setFormData({
      questionText: quiz.questionText || "",
      questionType,
      options,
      correctAnswer:
        questionType === "mcq"
          ? syncCorrectAnswer(options, questionType, quiz.correctAnswer || "")
          : quiz.correctAnswer || "",
    });
  };

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuestionTypeChange = (value) => {
    const nextType = String(value || "text").toLowerCase();
    if (!["text", "mcq"].includes(nextType)) return;
    setFormData((prev) => {
      if (nextType === "mcq") {
        const options = ensureOptionCount(prev.options, "mcq");
        const correctAnswer = syncCorrectAnswer(options, "mcq", prev.correctAnswer);
        return {
          ...prev,
          questionType: "mcq",
          options,
          correctAnswer,
        };
      }
      return {
        questionText: prev.questionText,
        questionType: "text",
        options: cloneDefaultOptions(),
        correctAnswer: "",
      };
    });
  };

  const handleOptionChange = (index, value) => {
    setFormData((prev) => {
      const options = [...(prev.options || [])];
      options[index] = value;
      const padded = ensureOptionCount(options, prev.questionType);
      const correctAnswer = syncCorrectAnswer(padded, prev.questionType, prev.correctAnswer);
      return { ...prev, options: padded, correctAnswer };
    });
  };

  const handleAddOption = () => {
    setFormData((prev) => {
      const options = ensureOptionCount([...(prev.options || []), ""], prev.questionType);
      const correctAnswer = syncCorrectAnswer(options, prev.questionType, prev.correctAnswer);
      return { ...prev, options, correctAnswer };
    });
  };

  const handleRemoveOption = (index) => {
    setFormData((prev) => {
      const options = [...(prev.options || [])];
      options.splice(index, 1);
      const padded = ensureOptionCount(options, prev.questionType);
      const correctAnswer = syncCorrectAnswer(padded, prev.questionType, prev.correctAnswer);
      return { ...prev, options: padded, correctAnswer };
    });
  };

  const handleSave = async () => {
    if (!editingQuiz?.id) return toast.error("Invalid quiz selected");

    const questionText = formData.questionText.trim();
    const questionType = (formData.questionType || "text").toLowerCase();
    if (!questionText) return toast.error("Question text is required");
    if (!["text", "mcq"].includes(questionType)) return toast.error("Unsupported question type");

    let options = [];
    if (questionType === "mcq") {
      options = (formData.options || [])
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (options.length < 2) return toast.error("Provide at least two options");
    }

    const correctAnswer = (formData.correctAnswer || "").trim();
    if (!correctAnswer) return toast.error("Correct answer is required");
    if (questionType === "mcq" && !options.includes(correctAnswer)) {
      return toast.error("Correct answer must match one of the options");
    }

    const toastId = toast.loading("Saving quiz...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");

      const payload = {
        questionText,
        questionType,
        correctAnswer,
      };
      if (questionType === "mcq") {
        payload.options = options;
      }

      const res = await fetch(`${API_BASE}/quiz/${editingQuiz.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Failed to update quiz");

      toast.success("Quiz updated", { id: toastId });
      const updated = {
        ...body.quiz,
        questionType: (body.quiz?.questionType || "text").toLowerCase(),
        options: Array.isArray(body.quiz?.options) ? body.quiz.options : [],
      };
      setQuizzes((prev) =>
        prev.map((q) => (q.id === editingQuiz.id ? updated : q))
      );
      resetForm();
    } catch (err) {
      toast.error(err.message || "Failed to update quiz", { id: toastId });
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!confirm("Delete this quiz?")) return;
    const toastId = toast.loading("Deleting quiz...");
    try {
      const token = await getToken();
      if (!token) throw new Error("Session expired. Please sign in again.");
      const res = await fetch(`${API_BASE}/quiz/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to delete quiz");
      }
      toast.success("Quiz deleted", { id: toastId });
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      if (editingQuiz?.id === id) {
        resetForm();
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete quiz", { id: toastId });
    }
  };

  return (
    <div className="quests-container">
      <Toaster />
      <div className="quests-header">
        <h1>Manage Quizzes</h1>
        <div className="flex gap-2">
          <IconButton icon="refresh" label="Refresh" onClick={loadQuizzes} />
          <IconButton icon="add" label="New Quiz" onClick={() => navigate("/addQuiz")} />
        </div>
      </div>

      {editingQuiz && (
        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <InputField
            type="text"
            name="questionText"
            placeholder="Question Text"
            value={formData.questionText}
            onChange={(event) => handleFieldChange("questionText", event.target.value)}
            icon="help"
            required
          />

          <div className="input-box">
            <label htmlFor="questionType">Question Type</label>
            <select
              id="questionType"
              name="questionType"
              value={formData.questionType}
              onChange={(event) => handleQuestionTypeChange(event.target.value)}
            >
              <option value="text">Text / Short Answer</option>
              <option value="mcq">Multiple Choice</option>
            </select>
          </div>

          {formData.questionType === "mcq" && (
            <div className="input-box">
              <label>Options</label>
              {(formData.options || []).map((option, index) => (
                <div key={index} className="flex gap-2 mb-2 items-center">
                  <InputField
                    type="text"
                    name={`option-${index}`}
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(event) => handleOptionChange(index, event.target.value)}
                    icon="list"
                    required
                  />
                  {(formData.options || []).length > 2 && (
                    <button
                      type="button"
                      className="icon-button btn-red"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <i className="material-symbols-outlined">delete</i>
                    </button>
                  )}
                </div>
              ))}
              <IconButton
                type="button"
                icon="add"
                label="Add Option"
                onClick={handleAddOption}
              />
            </div>
          )}

          {formData.questionType === "mcq" ? (
            <div className="input-box">
              <label htmlFor="correctAnswer">Correct Answer</label>
              <select
                id="correctAnswer"
                name="correctAnswer"
                value={formData.correctAnswer}
                onChange={(event) => handleFieldChange("correctAnswer", event.target.value)}
              >
                <option value="">Select correct option</option>
                {availableAnswers.map((answer) => (
                  <option key={answer} value={answer}>
                    {answer}
                  </option>
                ))}
              </select>
              <small>Tip: Correct answer must match one of the options above.</small>
            </div>
          ) : (
            <InputField
              type="text"
              name="correctAnswer"
              placeholder="Correct Answer"
              value={formData.correctAnswer}
              onChange={(event) => handleFieldChange("correctAnswer", event.target.value)}
              icon="check"
              required
            />
          )}

          <div className="btn flex gap-2">
            <IconButton type="submit" icon="save" label="Save Quiz" />
            <IconButton
              type="button"
              icon="arrow_back"
              label="Cancel"
              onClick={resetForm}
            />
          </div>
        </form>
      )}

      <div className="quest-list">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="quest-card flex items-start gap-4 p-4 border rounded mb-2"
          >
            <div className="quest-info flex-1">
              <h2 className="font-bold">{quiz.questionText}</h2>
              <p><strong>Type:</strong> {(quiz.questionType || "text").toUpperCase()}</p>
              {quiz.questionType === "mcq" && (
                <p>
                  <strong>Options:</strong> {(quiz.options || []).join(", ") || "-"}
                </p>
              )}
              <p><strong>Correct Answer:</strong> {quiz.correctAnswer || "-"}</p>
            </div>
            <div className="quest-action flex gap-2">
              <IconButton icon="edit" label="Edit" onClick={() => handleEditClick(quiz)} />
              <IconButton icon="delete" label="Delete" onClick={() => handleDelete(quiz.id)} />
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



