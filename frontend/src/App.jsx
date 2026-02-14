import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import Home from "./pages/Home";
import CreatePoll from "./pages/CreatePoll";
import PollRoom from "./pages/PollRoom";
import Login from "./pages/Login";
import Register from "./pages/Register";

function buildNameFromUsername(username) {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function Layout({ children, user, onLogout }) {
  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:h-16 sm:py-0">
            <div className="flex items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg btn-accent">
                  P
                </div>
                <span className="display-font text-lg sm:text-xl font-bold tracking-tight">
                  PollRoom
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 ml-auto flex-wrap justify-end">
              {user ? (
                <>
                  <span className="text-xs sm:text-sm text-slate-600 hidden md:block max-w-[220px] truncate">
                    Hi, {user.name || buildNameFromUsername(user.username)}
                  </span>
                  <button
                    onClick={onLogout}
                    className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
                >
                  Login
                </Link>
              )}
              <Link
                to="/create"
                className="btn-soft rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors"
              >
                Create Poll
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-grow rise-in">{children}</main>
      <footer className="pb-5 pt-3 px-4">
        <p className="text-center text-xs sm:text-sm text-slate-600">
          Made by{" "}
          <a
            href="https://github.com/sourav81R"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-2"
          >
            Sourav
          </a>
        </p>
      </footer>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const name = localStorage.getItem("name");
    if (token && username) {
      setUser({ username, name: name || buildNameFromUsername(username) });
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreatePoll />} />
          <Route path="/poll/:id" element={<PollRoom />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register onLogin={setUser} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
