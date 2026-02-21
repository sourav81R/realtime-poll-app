import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/http";
import { buildVoterHeaders } from "../utils/voterIdentity";
import EditPollModal from "../components/EditPollModal";

function totalVotes(options) {
  return options.reduce((sum, option) => sum + option.votes, 0);
}

export default function Home() {
  const [polls, setPolls] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [editingPoll, setEditingPoll] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingPollId, setDeletingPollId] = useState(null);

  const loadFeed = async () => {
    setLoadingFeed(true);
    setFeedError("");

    try {
      const data = await apiFetch("/api/polls", {
        headers: buildVoterHeaders(),
      });
      setPolls(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedError(err.message || "Failed to load feed");
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  const handleVote = async (pollId, optionIndex) => {
    try {
      const data = await apiFetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: buildVoterHeaders({ includeJson: true }),
        body: JSON.stringify({ optionIndex }),
      });

      setPolls((prev) =>
        prev.map((poll) =>
          poll._id === pollId
            ? {
                ...poll,
                options: data.options,
                currentUserVote:
                  typeof data.currentUserVote === "number" ? data.currentUserVote : null,
              }
            : poll
        )
      );
    } catch (err) {
      alert(err.message || "Vote failed");
    }
  };

  const handleSaveEdit = async (payload) => {
    if (!editingPoll) return;

    setSavingEdit(true);
    setEditError("");

    try {
      const data = await apiFetch(`/api/polls/${editingPoll._id}`, {
        method: "PUT",
        headers: buildVoterHeaders({ includeJson: true }),
        body: JSON.stringify(payload),
      });
      const { message: _message, ...updatedPoll } = data;

      setPolls((prev) =>
        prev.map((poll) =>
          poll._id === editingPoll._id
            ? {
                ...poll,
                ...updatedPoll,
              }
            : poll
        )
      );

      setEditingPoll(null);
    } catch (err) {
      setEditError(err.message || "Failed to update poll");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePoll = async (poll) => {
    const shouldDelete = window.confirm(
      "Delete this poll permanently? This will remove all votes."
    );
    if (!shouldDelete) return;

    setDeletingPollId(poll._id);

    try {
      await apiFetch(`/api/polls/${poll._id}`, {
        method: "DELETE",
        headers: buildVoterHeaders(),
      });
      setPolls((prev) => prev.filter((item) => item._id !== poll._id));
    } catch (err) {
      alert(err.message || "Failed to delete poll");
    } finally {
      setDeletingPollId(null);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-12 pb-5">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="display-font text-[1.55rem] sm:text-3xl font-bold text-slate-900">
            Poll Feed
          </h2>
          <button
            onClick={loadFeed}
            className="btn-soft rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold"
          >
            Refresh
          </button>
        </div>

        {loadingFeed ? (
          <div className="glass-panel rounded-2xl p-6 text-slate-600">Loading polls...</div>
        ) : feedError ? (
          <div className="glass-panel rounded-2xl p-6 text-red-700">{feedError}</div>
        ) : polls.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-slate-600">
            No polls yet. Create the first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {polls.map((poll) => {
              const total = totalVotes(poll.options);
              const currentUserVote =
                typeof poll.currentUserVote === "number" ? poll.currentUserVote : null;

              return (
                <article
                  key={poll._id}
                  className="glass-panel card-lift rounded-2xl p-4 sm:p-5 border border-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="display-font text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                      {poll.question}
                    </h3>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <Link
                        to={`/poll/${poll._id}`}
                        className="btn-soft px-3 py-1.5 rounded-lg text-xs font-semibold"
                      >
                        Open
                      </Link>
                      {poll.isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPoll(poll);
                              setEditError("");
                            }}
                            className="btn-soft px-3 py-1.5 rounded-lg text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePoll(poll)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                            disabled={deletingPollId === poll._id}
                          >
                            {deletingPollId === poll._id ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {poll.options.map((option, optionIndex) => {
                      const percentage = total > 0 ? Math.round((option.votes / total) * 100) : 0;
                      const isActive = currentUserVote === optionIndex;

                      return (
                        <button
                          key={`${poll._id}_${optionIndex}`}
                          onClick={() => handleVote(poll._id, optionIndex)}
                          className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                            isActive
                              ? "border-teal-500 bg-teal-50"
                              : "border-slate-200 bg-white/90 hover:border-teal-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm sm:text-base font-semibold text-slate-800 break-words">
                              {option.text}
                            </span>
                            <span className="text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                              {option.votes} votes
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-600 to-cyan-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs sm:text-sm text-slate-600">
                    Total votes: <span className="font-bold">{total}</span>
                    {typeof currentUserVote === "number"
                      ? " - tap the same option to revoke or choose another option."
                      : " - vote by selecting one option."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-10 sm:pb-14 text-center">
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Live Poll Toolkit
        </span>
        <h1 className="display-font mt-5 sm:mt-6 text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          Build polls people
          <br className="hidden sm:block" />
          <span className="brand-gradient-text">want to interact with.</span>
        </h1>
        <p className="mt-4 sm:mt-5 max-w-2xl mx-auto text-base sm:text-xl text-slate-600 mb-8 sm:mb-10 px-1">
          Spin up a poll in seconds, share one link, and watch results animate
          live as your audience votes.
        </p>
        <div className="flex justify-center">
          <Link
            to="/create"
            className="btn-accent inline-flex items-center justify-center rounded-full w-full sm:w-auto px-7 sm:px-8 py-3 text-sm sm:text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Create a Poll
          </Link>
        </div>
      </div>

      <EditPollModal
        key={editingPoll?._id || "home-edit-modal"}
        poll={editingPoll}
        isSaving={savingEdit}
        error={editError}
        onClose={() => {
          if (savingEdit) return;
          setEditingPoll(null);
          setEditError("");
        }}
        onSave={handleSaveEdit}
      />

    </div>
  );
}
