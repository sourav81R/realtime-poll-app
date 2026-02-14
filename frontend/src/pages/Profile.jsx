import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../socket";

function buildNameFromUsername(username) {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitial(name, username) {
  const source = name || username || "U";
  return source.trim().charAt(0).toUpperCase();
}

function pollTotalVotes(options = []) {
  return options.reduce((sum, option) => sum + option.votes, 0);
}

function PollCard({ poll, type }) {
  const selectedOption =
    typeof poll.currentUserVote === "number" ? poll.options?.[poll.currentUserVote]?.text : null;

  return (
    <article className="bg-white/85 border border-slate-200 rounded-xl p-3">
      <p className="font-semibold text-slate-900 break-words">{poll.question}</p>
      <p className="mt-1 text-xs text-slate-600">
        {type === "voted"
          ? `Your vote: ${selectedOption || "Revoked"} | `
          : ""}
        Total votes: {pollTotalVotes(poll.options)}
      </p>
      <Link
        to={`/poll/${poll._id}`}
        className="inline-block mt-2 text-sm text-teal-700 font-semibold hover:underline"
      >
        Open Poll
      </Link>
    </article>
  );
}

export default function Profile({ user, onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = user?.username || localStorage.getItem("username") || "";
  const name = user?.name || localStorage.getItem("name") || buildNameFromUsername(username);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [createdPolls, setCreatedPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [mobileTab, setMobileTab] = useState("created");

  const createdCount = createdPolls.length;
  const votedCount = votedPolls.length;
  const totalVotesAcrossCreated = useMemo(
    () => createdPolls.reduce((sum, poll) => sum + pollTotalVotes(poll.options), 0),
    [createdPolls]
  );

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${BACKEND_URL}/api/polls/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load profile");
        setCreatedPolls(Array.isArray(data.createdPolls) ? data.createdPolls : []);
        setVotedPolls(Array.isArray(data.votedPolls) ? data.votedPolls : []);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  const handleLogout = () => {
    onLogout();
    navigate("/");
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center">
          <h2 className="display-font text-2xl sm:text-3xl font-bold text-slate-900">Profile</h2>
          <p className="mt-3 text-slate-600">Please login or signup to access your profile.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn-accent rounded-xl px-6 py-2.5 font-semibold">
              Login
            </Link>
            <Link to="/register" className="btn-soft rounded-xl px-6 py-2.5 font-semibold">
              Signup
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-5">
      <div className="glass-panel rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 text-white text-lg font-bold flex items-center justify-center shrink-0">
              {getInitial(name, username)}
            </div>
            <div className="min-w-0">
              <h1 className="display-font text-xl sm:text-2xl font-bold text-slate-900 truncate">
                {name}
              </h1>
              <p className="text-sm text-slate-600 truncate">{username}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-soft rounded-xl px-4 py-2 text-sm font-semibold">
            Logout
          </button>
        </div>
      </div>

      <div className="md:hidden space-y-4">
        <section className="glass-panel rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/85 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Created</p>
              <p className="text-lg font-bold text-slate-900">{createdCount}</p>
            </div>
            <div className="bg-white/85 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Voted</p>
              <p className="text-lg font-bold text-slate-900">{votedCount}</p>
            </div>
            <div className="bg-white/85 border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Votes</p>
              <p className="text-lg font-bold text-slate-900">{totalVotesAcrossCreated}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link to="/" className="btn-soft rounded-xl px-3 py-2 text-sm font-semibold text-center">
              Poll Feed
            </Link>
            <Link to="/create" className="btn-accent rounded-xl px-3 py-2 text-sm font-semibold text-center">
              Create Poll
            </Link>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMobileTab("created")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                mobileTab === "created"
                  ? "bg-teal-700 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Created Polls
            </button>
            <button
              onClick={() => setMobileTab("voted")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
                mobileTab === "voted"
                  ? "bg-teal-700 text-white"
                  : "bg-white border border-slate-200 text-slate-700"
              }`}
            >
              Voted Polls
            </button>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-600">Loading profile data...</p>
          ) : error ? (
            <p className="mt-4 text-sm text-red-700">{error}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(mobileTab === "created" ? createdPolls : votedPolls).length === 0 ? (
                <p className="text-sm text-slate-600">
                  {mobileTab === "created"
                    ? "You have not created any polls yet."
                    : "You have not voted in any polls yet."}
                </p>
              ) : (
                (mobileTab === "created" ? createdPolls : votedPolls).map((poll) => (
                  <PollCard key={poll._id} poll={poll} type={mobileTab} />
                ))
              )}
            </div>
          )}
        </section>
      </div>

      <div className="hidden md:grid grid-cols-12 gap-5">
        <aside className="col-span-4 xl:col-span-3 space-y-4">
          <section className="glass-panel rounded-2xl p-4">
            <h2 className="display-font text-xl font-bold text-slate-900">Dashboard</h2>
            <div className="mt-3 space-y-2">
              <div className="bg-white/85 border border-slate-200 rounded-xl p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Created Polls</p>
                <p className="text-2xl font-bold text-slate-900">{createdCount}</p>
              </div>
              <div className="bg-white/85 border border-slate-200 rounded-xl p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Voted Polls</p>
                <p className="text-2xl font-bold text-slate-900">{votedCount}</p>
              </div>
              <div className="bg-white/85 border border-slate-200 rounded-xl p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Votes Received</p>
                <p className="text-2xl font-bold text-slate-900">{totalVotesAcrossCreated}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-slate-700">Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <Link to="/" className="btn-soft rounded-xl px-4 py-2 text-sm font-semibold text-center block">
                View Poll Feed
              </Link>
              <Link to="/create" className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold text-center block">
                Create New Poll
              </Link>
            </div>
          </section>
        </aside>

        <div className="col-span-8 xl:col-span-9 grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="glass-panel rounded-2xl p-5">
            <h2 className="display-font text-xl sm:text-2xl font-bold text-slate-900">
              Your Created Polls
            </h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-600">Loading profile data...</p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-700">{error}</p>
            ) : createdPolls.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">You have not created any polls yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {createdPolls.map((poll) => (
                  <PollCard key={poll._id} poll={poll} type="created" />
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-2xl p-5">
            <h2 className="display-font text-xl sm:text-2xl font-bold text-slate-900">
              Polls You Voted
            </h2>
            {loading ? (
              <p className="mt-4 text-sm text-slate-600">Loading profile data...</p>
            ) : error ? (
              <p className="mt-4 text-sm text-red-700">{error}</p>
            ) : votedPolls.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">You have not voted in any polls yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {votedPolls.map((poll) => (
                  <PollCard key={poll._id} poll={poll} type="voted" />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
