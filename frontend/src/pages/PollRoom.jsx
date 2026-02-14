import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { socket, BACKEND_URL } from "../socket";

export default function PollRoom() {
  const { id: pollId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [activeTab, setActiveTab] = useState("vote");
  const [toastMessage, setToastMessage] = useState("");
  const [currentUserVote, setCurrentUserVote] = useState(null);
  const [showAuthPopup, setShowAuthPopup] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const toastCode = params.get("toast");

    if (toastCode === "auto_launch_success") {
      setToastMessage("Poll launched successfully after login.");
    } else if (toastCode === "launch_success") {
      setToastMessage("Poll launched successfully.");
    } else {
      return;
    }

    const timeout = setTimeout(() => {
      setToastMessage("");
    }, 3000);

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    return () => clearTimeout(timeout);
  }, [location.search]);

  useEffect(() => {
    const loadPoll = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${BACKEND_URL}/api/polls/${pollId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("Poll not found");
        const data = await res.json();
        setPoll(data);
        setCurrentUserVote(
          typeof data.currentUserVote === "number" ? data.currentUserVote : null
        );
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
    socket.emit("join_poll", pollId);

    const handleUpdate = (updatedPoll) => {
      setPoll((prev) => {
        if (!prev) return updatedPoll;
        return { ...prev, ...updatedPoll };
      });
    };

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("update_poll", handleUpdate);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("update_poll", handleUpdate);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [pollId]);

  const handleVote = async (optionIndex) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowAuthPopup(true);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ optionIndex }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Vote failed");

      setPoll((prev) => (prev ? { ...prev, ...data } : data));
      setCurrentUserVote(
        typeof data.currentUserVote === "number" ? data.currentUserVote : null
      );
    } catch (err) {
      alert(err.message || "Vote failed");
    }
  };

  const handleShare = async () => {
    const shareMessage = `Take a look at this poll and cast your vote: "${poll?.question}"`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Take a look at this poll",
          text: shareMessage,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      const shareContent = `${shareMessage}\n${window.location.href}`;
      navigator.clipboard.writeText(shareContent);
      alert("Poll invite text copied to clipboard.");
    }
  };

  const handleDownloadPDF = () => {
    if (!poll || !window.jspdf) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(poll.question, 10, 20, { maxWidth: 190 });

    doc.setFontSize(12);
    let y = 40;
    poll.options.forEach((opt) => {
      doc.text(`${opt.text}: ${opt.votes} votes`, 10, y, { maxWidth: 190 });
      y += 10;
    });

    doc.save(`poll_results_${pollId}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-600 font-semibold text-xl">
        {error}
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.options.reduce((acc, curr) => acc + curr.votes, 0);
  const hasVote = typeof currentUserVote === "number";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-14">
      {toastMessage && (
        <div className="fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-4 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="glass-panel rounded-2xl sm:rounded-3xl shadow-2xl border p-4 sm:p-10">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-slate-200 pb-6">
          <h1 className="display-font text-xl sm:text-3xl font-bold text-slate-900 leading-tight break-words">
            {poll.question}
          </h1>
          <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={handleDownloadPDF}
              className="btn-soft inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors w-full sm:w-auto"
            >
              Download PDF
            </button>
            <button
              onClick={handleShare}
              className="btn-soft inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-colors w-full sm:w-auto"
            >
              Share Link
            </button>
          </div>
        </div>

        <div className="flex space-x-1 rounded-xl bg-white/80 border border-slate-200 p-1 mb-6">
          <button
            onClick={() => setActiveTab("vote")}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === "vote"
                ? "bg-teal-700 text-white shadow"
                : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            Vote
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold transition-all ${
              activeTab === "results"
                ? "bg-teal-700 text-white shadow"
                : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
            }`}
          >
            Results
          </button>
        </div>

        {activeTab === "vote" ? (
          <div className="space-y-3">
            {poll.options.map((opt, idx) => {
              const percentage =
                totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
              const isActive = currentUserVote === idx;

              return (
                <button
                  key={idx}
                  onClick={() => handleVote(idx)}
                  className={`relative w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-200 ${
                    isActive
                      ? "border-teal-500 bg-teal-50"
                      : "border-slate-200 hover:border-teal-400 hover:shadow-md bg-white"
                  }`}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-teal-100/70 transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%` }}
                  />

                  <div className="relative z-10 p-3 sm:p-4 flex justify-between items-center gap-2 sm:gap-3">
                    <span className="font-semibold text-base sm:text-lg text-slate-800">
                      {opt.text}
                      {isActive ? (
                        <span className="ml-2 text-xs sm:text-sm font-bold text-teal-700">
                          (Your vote)
                        </span>
                      ) : null}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">
                        {opt.votes} votes
                      </span>
                      <span className="font-bold text-teal-800 bg-white/70 px-2 py-1 rounded-md min-w-[2.6rem] sm:min-w-[3rem] text-center text-xs sm:text-sm">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}

            <p className="text-xs sm:text-sm text-slate-600">
              {hasVote
                ? "You can change your vote by selecting another option, or revoke by selecting your current option again."
                : "Login/signup to vote. You can keep only one active vote at a time."}
            </p>
          </div>
        ) : (
          <div className="pt-4 pb-2">
            <div className="h-56 sm:h-64 flex items-end justify-between gap-2 sm:gap-4 px-1 sm:px-2 overflow-x-auto">
              {poll.options.map((opt, idx) => {
                const percentage =
                  totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-end h-full min-w-[54px] sm:min-w-0 flex-1"
                  >
                    <div className="relative w-full max-w-[60px] flex flex-col justify-end h-full">
                      <div className="text-xs text-slate-500 text-center mb-1 absolute -top-6 left-0 right-0">
                        {opt.votes}
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-teal-700 to-cyan-500 rounded-t-md transition-all duration-500 ease-out relative"
                        style={{ height: `${percentage}%` }}
                      >
                        {percentage > 10 && (
                          <span className="absolute top-2 left-0 right-0 text-center text-xs text-white font-bold">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="mt-2 text-xs text-slate-700 text-center font-semibold truncate w-full"
                      title={opt.text}
                    >
                      {opt.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-slate-600">
          <p>
            Total votes: <span className="font-bold text-slate-900">{totalVotes}</span>
          </p>
          <p
            className={`flex items-center font-semibold ${
              isConnected ? "text-teal-700" : "text-amber-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                isConnected ? "bg-teal-600 animate-pulse" : "bg-amber-500"
              }`}
            />
            {isConnected ? "Real-time connected" : "Connecting..."}
          </p>
        </div>
      </div>

      {showAuthPopup && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 w-full max-w-md">
            <h3 className="display-font text-lg sm:text-xl font-bold text-slate-900">
              Login or Signup Required
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Please login or signup first to vote in this poll.
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
