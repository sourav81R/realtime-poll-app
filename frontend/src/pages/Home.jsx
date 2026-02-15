import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/http";

function totalVotes(options) {
  return options.reduce((sum, option) => sum + option.votes, 0);
}

export default function Home() {
  const [polls, setPolls] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const navigate = useNavigate();

  const loadFeed = async () => {
    setLoadingFeed(true);
    setFeedError("");

    try {
      const token = localStorage.getItem("token");
      const data = await apiFetch("/api/polls", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    try {
      const data = await apiFetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <div className="relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <h2 className="display-font text-2xl sm:text-3xl font-bold text-slate-900">
            Poll Feed
          </h2>
          <button
            onClick={loadFeed}
            className="btn-soft rounded-full px-4 py-2 text-xs sm:text-sm font-semibold"
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
                  className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="display-font text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                      {poll.question}
                    </h3>
                    <Link
                      to={`/poll/${poll._id}`}
                      className="btn-soft px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                    >
                      Open
                    </Link>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-12 sm:pb-16 text-center">
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-3 sm:px-4 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Live Poll Toolkit
        </span>
        <h1 className="display-font mt-5 sm:mt-6 text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
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
            className="btn-accent inline-flex items-center justify-center rounded-full w-full sm:w-auto px-8 py-3 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5"
          >
            Create a Poll
          </Link>
        </div>
      </div>

      {showAuthPopup && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 w-full max-w-md">
            <h3 className="display-font text-lg sm:text-xl font-bold text-slate-900">
              Login or Signup Required
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Please login or signup first to vote in the poll feed.
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
