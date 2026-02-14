import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../socket";

export default function CreatePoll() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const validOptions = options.filter((o) => o.trim() !== "");
    if (!question.trim() || validOptions.length < 2) {
      setError("Please provide a question and at least 2 options.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, options: validOptions }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create poll");
      }
      if (data._id) {
        navigate(`/poll/${data._id}`);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to the server. Is backend running on port 5000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-teal-700 to-cyan-600 px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100 font-semibold">
            New Session
          </p>
          <h2 className="display-font text-2xl font-bold text-white mt-1">
            Create a New Poll
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
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
              className="w-full rounded-xl border-slate-300 bg-white/80 p-3 border text-lg focus:border-teal-600 focus:ring-2 focus:ring-teal-200 outline-none"
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
                    className="h-11 w-11 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition-colors"
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
              className="btn-accent w-full py-3 px-4 rounded-xl text-base font-bold shadow-lg disabled:opacity-70 disabled:cursor-not-allowed transition-transform active:scale-[0.99]"
            >
              {loading ? "Creating..." : "Launch Poll"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
