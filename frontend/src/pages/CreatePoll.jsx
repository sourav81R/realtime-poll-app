import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/http";

const PENDING_POLL_PAYLOAD_KEY = "pending_poll_payload";
const PENDING_POLL_SHOULD_LAUNCH_KEY = "pending_poll_should_launch";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const navigate = useNavigate();
  const autoLaunchAttemptedRef = useRef(false);

  const addOption = () => setOptions([...options, ""]);

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const clearPendingPoll = useCallback(() => {
    sessionStorage.removeItem(PENDING_POLL_PAYLOAD_KEY);
    sessionStorage.removeItem(PENDING_POLL_SHOULD_LAUNCH_KEY);
  }, []);

  const launchPoll = useCallback(
    async (payload, autoLaunch = false) => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const data = await apiFetch("/api/polls", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        clearPendingPoll();
        const toastCode = autoLaunch ? "auto_launch_success" : "launch_success";
        navigate(`/poll/${data._id}?toast=${toastCode}`);
      } catch (err) {
        setError(
          err.message === "Failed to fetch"
            ? "Unable to connect to the server. Check backend URL and deployment status."
            : err.message
        );
      } finally {
        setLoading(false);
      }
    },
    [clearPendingPoll, navigate]
  );

  useEffect(() => {
    const shouldAutoLaunch =
      sessionStorage.getItem(PENDING_POLL_SHOULD_LAUNCH_KEY) === "1";
    const token = localStorage.getItem("token");
    const rawPayload = sessionStorage.getItem(PENDING_POLL_PAYLOAD_KEY);

    if (!shouldAutoLaunch || !token || !rawPayload || autoLaunchAttemptedRef.current) {
      return;
    }

    try {
      const payload = JSON.parse(rawPayload);
      const validQuestion = payload?.question?.trim();
      const validOptions = Array.isArray(payload?.options)
        ? payload.options.filter((opt) => typeof opt === "string" && opt.trim() !== "")
        : [];

      if (!validQuestion || validOptions.length < 2) {
        clearPendingPoll();
        return;
      }

      setQuestion(validQuestion);
      setOptions(validOptions);
      autoLaunchAttemptedRef.current = true;
      launchPoll({ question: validQuestion, options: validOptions }, true);
    } catch {
      clearPendingPoll();
    }
  }, [clearPendingPoll, launchPoll]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const validOptions = options.filter((o) => o.trim() !== "");
    const validQuestion = question.trim();

    if (!validQuestion || validOptions.length < 2) {
      setError("Please provide a question and at least 2 options.");
      return;
    }

    const payload = { question: validQuestion, options: validOptions };
    const token = localStorage.getItem("token");

    if (!token) {
      sessionStorage.setItem(PENDING_POLL_PAYLOAD_KEY, JSON.stringify(payload));
      sessionStorage.setItem(PENDING_POLL_SHOULD_LAUNCH_KEY, "1");
      setShowAuthPopup(true);
      return;
    }

    await launchPoll(payload, false);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8 sm:py-14">
      <div className="glass-panel rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-teal-700 to-cyan-600 px-4 sm:px-6 py-4 sm:py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100 font-semibold">
            New Session
          </p>
          <h2 className="display-font text-xl sm:text-2xl font-bold text-white mt-1">
            Create a New Poll
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Poll Question
            </label>
            <input
              type="text"
              className="w-full rounded-xl border-slate-300 bg-white/80 p-3 border text-base sm:text-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Which framework should we pick for v2?"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Answer Options
            </label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 rounded-xl border-slate-300 bg-white/80 p-3 border transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
                    aria-label="Remove option"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="mt-2 text-sm text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors"
            >
              + Add another option
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-accent w-full py-3 px-4 rounded-xl text-sm sm:text-base font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
            >
              {loading ? "Creating..." : "Launch Poll"}
            </button>
          </div>
        </form>
      </div>

      {showAuthPopup && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 w-full max-w-md">
            <h3 className="display-font text-lg sm:text-xl font-bold text-slate-900">
              Login or Signup Required
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Please login or create an account first. After that, your poll will
              launch automatically.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="btn-accent flex-1 rounded-xl py-2.5 font-semibold"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="btn-soft flex-1 rounded-xl py-2.5 font-semibold"
              >
                Signup
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAuthPopup(false)}
              className="w-full mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
