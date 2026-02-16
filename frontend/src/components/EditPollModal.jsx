import React, { useState } from "react";

export default function EditPollModal({
  poll,
  isSaving,
  error,
  onClose,
  onSave,
}) {
  const [question, setQuestion] = useState(() => poll?.question || "");
  const [options, setOptions] = useState(() => {
    if (!poll || !Array.isArray(poll.options)) {
      return ["", ""];
    }

    const normalizedOptions = poll.options.map((opt) => opt?.text || "");
    return normalizedOptions.length >= 2 ? normalizedOptions : ["", ""];
  });
  const [localError, setLocalError] = useState("");

  if (!poll) return null;

  const updateOption = (index, value) => {
    setOptions((prev) => prev.map((option, idx) => (idx === index ? value : option)));
  };

  const addOption = () => {
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (index) => {
    setOptions((prev) => (prev.length > 2 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setLocalError("");

    const normalizedQuestion = question.trim();
    const normalizedOptions = options
      .map((opt) => opt.trim())
      .filter(Boolean);

    if (!normalizedQuestion || normalizedOptions.length < 2) {
      setLocalError("Please provide a question and at least 2 options.");
      return;
    }

    onSave({
      question: normalizedQuestion,
      options: normalizedOptions,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="display-font text-xl font-bold text-slate-900">Edit Poll</h3>
        <p className="mt-1 text-sm text-slate-600">
          If you change options, existing votes are reset to keep results fair.
        </p>

        {(localError || error) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Poll Question
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-300 bg-white/90 p-3 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Options
            </label>

            {options.map((option, index) => (
              <div key={`${poll._id}_${index}`} className="flex items-center gap-2">
                <input
                  type="text"
                  className="flex-1 rounded-xl border border-slate-300 bg-white/90 p-3 outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-600"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="h-10 w-10 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200"
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
              className="text-sm font-semibold text-teal-700 hover:text-teal-900"
            >
              + Add another option
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-soft rounded-xl px-4 py-2.5 text-sm font-semibold"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
