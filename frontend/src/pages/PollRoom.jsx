import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { socket, BACKEND_URL } from "../socket";

export default function PollRoom() {
  const { id: pollId } = useParams();
  const location = useLocation();
  const [poll, setPoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [activeTab, setActiveTab] = useState("vote");
  const [toastMessage, setToastMessage] = useState("");

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
    const voted = localStorage.getItem(`voted_${pollId}`);
    if (voted) setHasVoted(true);

    fetch(`${BACKEND_URL}/api/polls/${pollId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Poll not found");
        return res.json();
      })
      .then((data) => {
        setPoll(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    socket.emit("join_poll", pollId);

    const handleUpdate = (updatedPoll) => {
      setPoll(updatedPoll);
    };

    const handleError = (msg) => {
      alert(msg);
    };

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("update_poll", handleUpdate);
    socket.on("error", handleError);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("update_poll", handleUpdate);
      socket.off("error", handleError);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [pollId]);

  const handleVote = (index) => {
    if (hasVoted) return;
    socket.emit("vote", { pollId, optionIndex: index });
    setHasVoted(true);
    localStorage.setItem(`voted_${pollId}`, "true");
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

              return (
                <button
                  key={idx}
                  onClick={() => handleVote(idx)}
                  disabled={hasVoted}
                  className={`relative w-full overflow-hidden rounded-xl border-2 text-left transition-all duration-200 ${
                    hasVoted
                      ? "border-transparent bg-slate-50 cursor-default"
                      : "border-slate-200 hover:border-teal-500 hover:shadow-md bg-white"
                  }`}
                >
                  {hasVoted && (
                    <div
                      className="absolute top-0 left-0 h-full bg-teal-100 transition-all duration-700 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative z-10 p-3 sm:p-4 flex justify-between items-center gap-2 sm:gap-3">
                    <span
                      className={`font-semibold text-base sm:text-lg ${
                        hasVoted
                          ? "text-slate-800"
                          : "text-slate-700 group-hover:text-teal-700"
                      }`}
                    >
                      {opt.text}
                    </span>
                    {hasVoted && (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <span className="text-xs sm:text-sm text-slate-600 font-medium whitespace-nowrap">
                          {opt.votes} votes
                        </span>
                        <span className="font-bold text-teal-800 bg-white/70 px-2 py-1 rounded-md min-w-[2.6rem] sm:min-w-[3rem] text-center text-xs sm:text-sm">
                          {percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
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
            Total votes:{" "}
            <span className="font-bold text-slate-900">{totalVotes}</span>
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
    </div>
  );
}
