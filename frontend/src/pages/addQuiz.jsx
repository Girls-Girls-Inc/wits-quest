import React, { useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
};
const DEFAULT_OPTIONS = ["", ""];

const cloneDefaultOptions = () => [...DEFAULT_OPTIONS];

const AddQuiz = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    questionText: "",
    questionType: "text",
    options: cloneDefaultOptions(),
    correctAnswer: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const ensureOptionCount = (opts, typeOverride, currentType) => {
    const type = typeOverride ?? currentType ?? form.questionType;
    const next = [...(opts || [])];
    if (type === "mcq") {
      while (next.length < 2) next.push("");
    }
    return next.length ? next : cloneDefaultOptions();
  };

  const syncAnswerWithOptions = (opts, typeOverride, currentAnswer) => {
    const type = typeOverride ?? form.questionType;
    if (type !== "mcq") return currentAnswer;
    const trimmed = (opts || []).map((opt) => opt.trim()).filter(Boolean);
    const answer = (currentAnswer || "").trim();
    return trimmed.includes(answer) ? currentAnswer : "";
  };

  const availableAnswers = useMemo(() => {
    if (form.questionType !== "mcq") return [];
    const unique = new Set(
      (form.options || [])
        .map((opt) => opt.trim())
        .filter(Boolean)
    );
    return Array.from(unique);
  }, [form.options, form.questionType]);

  const handleFieldChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleQuestionTypeChange = (nextType) => {
    if (nextType === form.questionType) return;
    if (nextType === "mcq") {
      setForm((prev) => {
        const options = ensureOptionCount(prev.options, "mcq", prev.questionType);
        const nextAnswer = syncAnswerWithOptions(options, "mcq", prev.correctAnswer);
        return {
          ...prev,
          questionType: "mcq",
          options,
          correctAnswer: nextAnswer,
        };
      });
    } else {
      setForm((prev) => ({
        questionText: prev.questionText,
        questionType: "text",
        options: cloneDefaultOptions(),
        correctAnswer: "",
      }));
    }
  };

  const handleOptionChange = (index, value) => {
    setForm((prev) => {
      const nextOptions = [...(prev.options || [])];
      nextOptions[index] = value;
      const padded = ensureOptionCount(nextOptions, prev.questionType, prev.questionType);
      const nextAnswer = syncAnswerWithOptions(padded, prev.questionType, prev.correctAnswer);
      return { ...prev, options: padded, correctAnswer: nextAnswer };
    });
  };

  const handleAddOption = () => {
    setForm((prev) => {
      const nextOptions = ensureOptionCount(
        [...(prev.options || []), ""],
        prev.questionType,
        prev.questionType
      );
      const nextAnswer = syncAnswerWithOptions(nextOptions, prev.questionType, prev.correctAnswer);
      return { ...prev, options: nextOptions, correctAnswer: nextAnswer };
    });
  };

  const handleRemoveOption = (index) => {
    setForm((prev) => {
      const nextOptions = [...(prev.options || [])];
      nextOptions.splice(index, 1);
      const padded = ensureOptionCount(nextOptions, prev.questionType, prev.questionType);
      const nextAnswer = syncAnswerWithOptions(padded, prev.questionType, prev.correctAnswer);
      return { ...prev, options: padded, correctAnswer: nextAnswer };
    });
  };

  const resetForm = () => {
    setForm({
      questionText: "",
      questionType: "text",
      options: cloneDefaultOptions(),
      correctAnswer: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const questionText = form.questionText.trim();
    if (!questionText) {
      toast.error("Question text is required");
      return;
    }

    const questionType = form.questionType;
    let options = [];
    if (questionType === "mcq") {
      options = (form.options || [])
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (options.length < 2) {
        toast.error("Provide at least two options");
        return;
      }
    }

    const correctAnswer = form.correctAnswer.trim();
    if (!correctAnswer) {
      toast.error("Correct answer is required");
      return;
    }
    if (questionType === "mcq" && !options.includes(correctAnswer)) {
      toast.error("Correct answer must match one of the options");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const payload = {
        questionText,
        questionType,
        correctAnswer,
      };
      if (questionType === "mcq") {
        payload.options = options;
      }


      const res = await fetch(`${API_BASE}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || "Failed to create quiz");
      }

      toast.success("Quiz created successfully");
      resetForm();
    } catch (err) {
      toast.error(err?.message || "Failed to create quiz");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-container">
      <Toaster position="top-center" toastOptions={TOAST_OPTIONS} />
      <div className="admin-header admin-header--with-actions">
        <div className="admin-header__row">
          <h1 className="heading">Create Quiz</h1>
          <div className="admin-header__actions">
            <IconButton
              type="button"
              icon="arrow_back"
              label="Back to Admin"
              onClick={() => navigate("/adminDashboard")}
            />
          </div>
        </div>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <InputField
          type="text"
          name="questionText"
          placeholder="Question Text"
          value={form.questionText}
          onChange={(event) => handleFieldChange("questionText", event.target.value)}
          icon="help"
          required
        />

        <div className="input-box">
          <label htmlFor="questionType">Question Type</label>
          <select
            id="questionType"
            name="questionType"
            value={form.questionType}
            onChange={(event) => handleQuestionTypeChange(event.target.value)}
          >
            <option value="text">Text / Short Answer</option>
            <option value="mcq">Multiple Choice</option>
          </select>
        </div>

        {form.questionType === "mcq" && (
          <div className="input-box">
            <label>Options</label>
            {(form.options || []).map((option, index) => (
              <div key={index} className="flex gap-2 mb-2 items-center">
                <InputField
                  type="text"
                  name={"option-" + index}
                  placeholder={"Option " + (index + 1)}
                  value={option}
                  onChange={(event) => handleOptionChange(index, event.target.value)}
                  icon="list"
                  required
                />
                {(form.options || []).length > 2 && (
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

        {form.questionType === "mcq" ? (
          <div className="input-box">
            <label htmlFor="correctAnswer">Correct Answer</label>
            <select
              id="correctAnswer"
              name="correctAnswer"
              value={form.correctAnswer}
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
            value={form.correctAnswer}
            onChange={(event) => handleFieldChange("correctAnswer", event.target.value)}
            icon="check"
            required
          />
        )}



        <div className="btn flex gap-2">
          <IconButton
            type="submit"
            icon={submitting ? "hourglass_bottom" : "save"}
            label={submitting ? "Creating..." : "Create Quiz"}
            disabled={submitting}
          />
          <IconButton
            type="button"
            icon="restart_alt"
            label="Reset"
            onClick={resetForm}
            disabled={submitting}
          />
        </div>
      </form>
    </div>
  );
};

export default AddQuiz;











