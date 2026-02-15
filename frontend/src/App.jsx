import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import Home from "./pages/Home";
import CreatePoll from "./pages/CreatePoll";
import PollRoom from "./pages/PollRoom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";

function buildNameFromUsername(username) {
  if (!username) return "User";
  const source = username.includes("@") ? username.split("@")[0] : username;
  return source
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getAvatarInitial(user) {
  const source = user?.name || user?.username || "U";
  return source.trim().charAt(0).toUpperCase();
}

function toTitleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDisplayName(value) {
  const normalized = (value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "User";

  const hasLowerCase = /[a-z]/.test(normalized);
  return hasLowerCase ? normalized : toTitleCase(normalized);
}

function navLinkClass(isActive) {
  return `inline-flex items-center justify-center min-w-[108px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? "bg-slate-900 text-white shadow-sm"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  }`;
}

function Layout({ children, user, onLogout }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profilePath = user ? "/profile" : "/login";
  const displayName = formatDisplayName(user?.name || buildNameFromUsername(user?.username));
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const timeoutId = setTimeout(() => setMobileMenuOpen(false), 0);
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  const handleLogoutFromMenu = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell min-h-screen flex flex-col text-slate-900">
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-10 xl:px-12">
        <nav className="rounded-2xl border border-slate-200/90 bg-white/90 shadow-lg backdrop-blur-xl">
          <div className="px-4 sm:px-5 lg:px-6">
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto] items-center h-16 gap-6">
            <Link to="/" className="flex items-center gap-3 min-w-0 justify-self-start">
              <img
                src="/favicon.ico"
                alt="PollRoom logo"
                className="h-9 w-9 rounded-xl object-cover shadow-sm"
              />
              <span className="display-font text-2xl font-bold tracking-tight text-slate-900 leading-none">
                PollRoom
              </span>
            </Link>

            <div className="flex items-center justify-self-end justify-end gap-3 lg:gap-4 min-w-0">
              {user ? (
                <>
                  <Link
                    to={profilePath}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-colors min-w-0"
                    aria-label="Open profile"
                  >
                    <span className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                      {getAvatarInitial(user)}
                    </span>
                    <span className="text-sm text-slate-700 max-w-[180px] lg:max-w-[220px] truncate">
                      {displayName}
                    </span>
                  </Link>
                  <button
                    onClick={onLogout}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    Signup
                  </Link>
                </div>
              )}
            </div>
          </div>

            <div className="md:hidden py-3">
              <div className="flex items-center justify-between gap-3">
                <Link to="/" className="flex items-center gap-2 min-w-0">
                  <img
                    src="/favicon.ico"
                    alt="PollRoom logo"
                    className="h-8 w-8 rounded-lg object-cover shadow-sm"
                  />
                  <span className="display-font text-xl font-bold tracking-tight text-slate-900">
                    PollRoom
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  className="h-9 w-9 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Toggle menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="hidden md:flex items-center justify-start pt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/85 p-1 shadow-md backdrop-blur-xl">
            <NavLink to="/" className={({ isActive }) => navLinkClass(isActive)}>
              Feed
            </NavLink>
            <NavLink to="/create" className={({ isActive }) => navLinkClass(isActive)}>
              Create
            </NavLink>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu backdrop"
          />
          <div className="absolute top-[74px] left-3 right-3 rounded-2xl border border-slate-200 bg-white shadow-xl p-4">
            {user ? (
              <Link
                to={profilePath}
                className="flex items-center gap-3 pb-3 border-b border-slate-100 rounded-xl px-1"
                aria-label="Open profile"
              >
                <span className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {getAvatarInitial(user)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-500 truncate">{user.username}</p>
                </div>
              </Link>
            ) : (
              <div className="pb-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900">Guest</p>
                <p className="text-xs text-slate-500">Login or Signup to continue</p>
              </div>
            )}

            <div className="pt-3 space-y-2">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                Feed
              </NavLink>
              <NavLink
                to="/create"
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                Create Poll
              </NavLink>
              {!user && (
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-semibold ${
                      isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`
                  }
                >
                  Login
                </NavLink>
              )}

              {user ? (
                <button
                  onClick={handleLogoutFromMenu}
                  className="block w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/register"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Signup
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow rise-in">{children}</main>
      <footer className="mt-8 border-t border-slate-200/80 bg-white/75 backdrop-blur-sm">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-12 py-4 sm:py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs sm:text-sm text-slate-600">
            Copyright &copy; {currentYear} PollRoom. All rights reserved.
          </p>
          <p className="text-xs sm:text-sm text-slate-600">
            Developed by{" "}
            <a
              href="https://github.com/sourav81R"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-teal-700 hover:text-teal-800 underline underline-offset-2"
            >
              Sourav Chowdhury
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    const name = localStorage.getItem("name");
    if (token && username) {
      return { username, name: name || buildNameFromUsername(username) };
    }
    return null;
  });

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
          <Route path="/profile" element={<Profile user={user} onLogout={logout} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
