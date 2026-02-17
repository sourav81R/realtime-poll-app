import React, { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { apiFetch } from "../api/http";
import { startGoogleOAuth } from "../api/oauth";
import { getRoleFromToken } from "../utils/authToken";

const PENDING_POLL_SHOULD_LAUNCH_KEY = "pending_poll_should_launch";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.3-1.9 3.1l3 2.3c1.8-1.6 2.8-4 2.8-6.8 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3-2.3c-.8.6-1.9 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2l-3.1 2.4C4.9 19.7 8.2 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.3 14c-.2-.6-.4-1.3-.4-2s.1-1.4.4-2L3.2 7.6C2.4 9 2 10.5 2 12s.4 3 1.2 4.4L6.3 14z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.8c1.4 0 2.7.5 3.7 1.4l2.7-2.7C16.8 3 14.6 2 12 2 8.2 2 4.9 4.3 3.2 7.6L6.3 10c.8-2.4 3.1-4.2 5.7-4.2z"
      />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.6 6.3A10.7 10.7 0 0112 6c6 0 9.5 6 9.5 6a15.9 15.9 0 01-4 4.3M6.5 9.1A15.9 15.9 0 002.5 12s3.5 6 9.5 6c1.1 0 2.2-.2 3.1-.5"
      />
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isGoogleStarting, setIsGoogleStarting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const oauthError = new URLSearchParams(location.search).get("error");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const username = params.get("username");
    const name = params.get("name");
    const role = params.get("role") || getRoleFromToken(token) || "user";
    if (token && username) {
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      localStorage.setItem("name", name || username.split("@")[0] || "User");
      localStorage.setItem("role", role);
      onLogin({ username, name: name || username.split("@")[0] || "User", role });
      const goToCreate =
        sessionStorage.getItem(PENDING_POLL_SHOULD_LAUNCH_KEY) === "1";
      navigate(goToCreate ? "/create" : "/", { replace: true });
      return;
    }
  }, [location.search, navigate, onLogin]);

  const displayError =
    error || (oauthError ? "Google login failed. Please try again." : "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const role = data.role || getRoleFromToken(data.token) || "user";
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("name", data.name || data.username?.split("@")[0] || "User");
      localStorage.setItem("role", role);
      onLogin({
        username: data.username,
        name: data.name || data.username?.split("@")[0] || "User",
        role,
      });
      const goToCreate =
        sessionStorage.getItem(PENDING_POLL_SHOULD_LAUNCH_KEY) === "1";
      navigate(goToCreate ? "/create" : "/");
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Unable to connect to server. Is backend running?"
          : err.message
      );
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsGoogleStarting(true);

    try {
      await startGoogleOAuth();
    } catch (err) {
      setError(err.message || "Google login is unavailable.");
      setIsGoogleStarting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-6 sm:mt-10 px-3 sm:px-0">
      <div className="p-5 sm:p-8 glass-panel rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200">
      <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-semibold text-center">
        Welcome Back
      </p>
      <h2 className="display-font text-2xl sm:text-3xl font-bold mb-6 text-center text-slate-900">
        Login
      </h2>
      {displayError && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl mb-4 text-sm">
          {displayError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700">Email</label>
          <input
            type="email"
            className="mt-1 w-full p-3 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-teal-200 focus:border-teal-600 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700">Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full p-3 pr-11 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-teal-200 focus:border-teal-600 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-teal-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="btn-accent w-full py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg"
        >
          Login
        </button>
      </form>
      <div className="my-4 flex items-center">
        <div className="h-px bg-slate-200 flex-1" />
        <span className="px-3 text-xs text-slate-400 font-semibold">OR</span>
        <div className="h-px bg-slate-200 flex-1" />
      </div>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isGoogleStarting}
        className="w-full inline-flex items-center justify-center gap-2 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl hover:bg-teal-50 hover:border-teal-300 transition text-sm sm:text-base font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {isGoogleStarting ? "Connecting to server..." : "Continue with Google"}
      </button>
      <p className="mt-4 text-center text-sm text-slate-600">
        Don't have an account?{" "}
        <Link to="/register" className="text-teal-700 font-semibold hover:underline">
          Register
        </Link>
      </p>
    </div>
    </div>
  );
}
