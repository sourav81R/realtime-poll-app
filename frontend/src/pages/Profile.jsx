import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/http";
import { buildVoterHeaders } from "../utils/voterIdentity";
import EditPollModal from "../components/EditPollModal";

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

function formatDateTime(value) {
  if (!value) return "Never";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function PollCard({ poll, type, canManage, onEdit, onDelete, isDeleting }) {
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
      {canManage && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(poll)}
            className="btn-soft rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(poll)}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </article>
  );
}

function AdminUserCard({ userItem, onDelete, isDeleting }) {
  const displayName = userItem.name || buildNameFromUsername(userItem.username);
  const isAdminUser = userItem.role === "admin";

  return (
    <article className="bg-white/85 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 truncate">{displayName}</p>
        <p className="text-xs text-slate-600 truncate">{userItem.username}</p>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mt-1">
          {isAdminUser ? "Admin" : "User"}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Joined: {formatDateTime(userItem.createdAt)}
        </p>
        <p className="text-[11px] text-slate-600">
          Last Login: {formatDateTime(userItem.lastLoginAt)}
        </p>
        <p className="text-[11px] text-slate-600">
          Last Active: {formatDateTime(userItem.lastActiveAt)}
        </p>
      </div>
      {isAdminUser ? (
        <span className="text-xs font-semibold text-slate-500">Protected</span>
      ) : (
        <button
          type="button"
          onClick={() => onDelete(userItem)}
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      )}
    </article>
  );
}

export default function Profile({ user, onLogout }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const username = user?.username || localStorage.getItem("username") || "";
  const name = user?.name || localStorage.getItem("name") || buildNameFromUsername(username);
  const role = user?.role || localStorage.getItem("role") || "user";
  const isAdmin = role === "admin";
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [createdPolls, setCreatedPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [mobileTab, setMobileTab] = useState("created");
  const [editingPoll, setEditingPoll] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingPollId, setDeletingPollId] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [clearingUsers, setClearingUsers] = useState(false);

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
        const data = await apiFetch("/api/polls/me/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  const loadAdminUsers = useCallback(async () => {
    if (!token || !isAdmin) return;

    setAdminLoading(true);
    setAdminError("");
    try {
      const data = await apiFetch("/api/auth/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setAdminError(err.message || "Failed to load users");
    } finally {
      setAdminLoading(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    loadAdminUsers();
  }, [loadAdminUsers]);

  const handleLogout = () => {
    onLogout();
    navigate("/");
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

      setCreatedPolls((prev) =>
        prev.map((poll) => (poll._id === editingPoll._id ? { ...poll, ...updatedPoll } : poll))
      );
      setVotedPolls((prev) =>
        prev.map((poll) => (poll._id === editingPoll._id ? { ...poll, ...updatedPoll } : poll))
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
      setCreatedPolls((prev) => prev.filter((item) => item._id !== poll._id));
      setVotedPolls((prev) => prev.filter((item) => item._id !== poll._id));
    } catch (err) {
      alert(err.message || "Failed to delete poll");
    } finally {
      setDeletingPollId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!isAdmin || !token || targetUser.role === "admin") return;

    const shouldDelete = window.confirm(
      `Delete user ${targetUser.username}? Their polls and votes will be removed.`
    );
    if (!shouldDelete) return;

    setDeletingUserId(targetUser._id);
    try {
      await apiFetch(`/api/auth/admin/users/${targetUser._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminUsers((prev) => prev.filter((userItem) => userItem._id !== targetUser._id));
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleClearAllUsers = async () => {
    if (!isAdmin || !token) return;

    const hasUsersToDelete = adminUsers.some((userItem) => userItem.role !== "admin");
    if (!hasUsersToDelete) {
      alert("No non-admin users found.");
      return;
    }

    const shouldClear = window.confirm(
      "Clear all non-admin users? This removes their accounts, polls, and votes."
    );
    if (!shouldClear) return;

    setClearingUsers(true);
    try {
      await apiFetch("/api/auth/admin/users", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdminUsers((prev) => prev.filter((userItem) => userItem.role === "admin"));
    } catch (err) {
      alert(err.message || "Failed to clear users");
    } finally {
      setClearingUsers(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        <div className="glass-panel card-lift rounded-2xl p-6 sm:p-8 text-center">
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
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-9 space-y-4 sm:space-y-5">
      <div className="glass-panel card-lift rounded-2xl p-4 sm:p-6">
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
        <section className="glass-panel card-lift rounded-2xl p-4">
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

        <section className="glass-panel card-lift rounded-2xl p-4">
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
                  <PollCard
                    key={poll._id}
                    poll={poll}
                    type={mobileTab}
                    canManage={mobileTab === "created"}
                    onEdit={(selectedPoll) => {
                      setEditingPoll(selectedPoll);
                      setEditError("");
                    }}
                    onDelete={handleDeletePoll}
                    isDeleting={deletingPollId === poll._id}
                  />
                ))
              )}
            </div>
          )}
        </section>

        {isAdmin && (
          <section className="glass-panel card-lift rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="display-font text-lg font-bold text-slate-900">Admin Panel</h2>
              <button
                type="button"
                onClick={handleClearAllUsers}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                disabled={clearingUsers}
              >
                {clearingUsers ? "Clearing..." : "Clear All"}
              </button>
            </div>

            {adminLoading ? (
              <p className="mt-4 text-sm text-slate-600">Loading users...</p>
            ) : adminError ? (
              <p className="mt-4 text-sm text-red-700">{adminError}</p>
            ) : adminUsers.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No users found.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {adminUsers.map((userItem) => (
                  <AdminUserCard
                    key={userItem._id}
                    userItem={userItem}
                    onDelete={handleDeleteUser}
                    isDeleting={deletingUserId === userItem._id}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="hidden md:grid grid-cols-12 gap-5">
        <aside className="col-span-4 xl:col-span-3 space-y-4">
          <section className="glass-panel card-lift rounded-2xl p-4">
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

          <section className="glass-panel card-lift rounded-2xl p-4">
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
          <section className="glass-panel card-lift rounded-2xl p-5">
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
                  <PollCard
                    key={poll._id}
                    poll={poll}
                    type="created"
                    canManage
                    onEdit={(selectedPoll) => {
                      setEditingPoll(selectedPoll);
                      setEditError("");
                    }}
                    onDelete={handleDeletePoll}
                    isDeleting={deletingPollId === poll._id}
                  />
                ))}
              </div>
            )}
          </section>

          {isAdmin ? (
            <section className="glass-panel card-lift rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="display-font text-xl sm:text-2xl font-bold text-slate-900">
                  Admin Panel
                </h2>
                <button
                  type="button"
                  onClick={handleClearAllUsers}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  disabled={clearingUsers}
                >
                  {clearingUsers ? "Clearing..." : "Clear All"}
                </button>
              </div>

              {adminLoading ? (
                <p className="mt-4 text-sm text-slate-600">Loading users...</p>
              ) : adminError ? (
                <p className="mt-4 text-sm text-red-700">{adminError}</p>
              ) : adminUsers.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No users found.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {adminUsers.map((userItem) => (
                    <AdminUserCard
                      key={userItem._id}
                      userItem={userItem}
                      onDelete={handleDeleteUser}
                      isDeleting={deletingUserId === userItem._id}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="glass-panel card-lift rounded-2xl p-5">
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
          )}
        </div>
      </div>

      <EditPollModal
        key={editingPoll?._id || "profile-edit-modal"}
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
