import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from "react-router-dom";
import React, { useState, useEffect } from "react";
import Home from "./pages/Home";
import CreatePoll from "./pages/CreatePoll";
import PollRoom from "./pages/PollRoom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import { getRoleFromToken } from "./utils/authToken";

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
          <div className="flex flex-col items-start gap-2 sm:items-end">
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
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/sourav81R"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                title="GitHub"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-teal-600 hover:text-teal-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 .5C5.65.5.5 5.66.5 12.03c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.55-3.88-1.55-.52-1.34-1.28-1.7-1.28-1.7-1.04-.72.08-.71.08-.71 1.15.08 1.75 1.19 1.75 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.74.4-1.25.73-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.18a10.9 10.9 0 0 1 5.72 0c2.18-1.49 3.14-1.18 3.14-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.21c0 .31.21.68.8.56A11.54 11.54 0 0 0 23.5 12.03C23.5 5.66 18.35.5 12 .5Z" />
                </svg>
                <span className="sr-only">GitHub</span>
              </a>
              <a
                href="https://linkedin.com/in/souravchowdhury-2003r"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-teal-600 hover:text-teal-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5.01 2.5 2.5 0 0 0 0-5Zm-2 7h4v12h-4v-12ZM9.5 10.5h3.84v1.64h.05c.54-1.01 1.84-2.07 3.8-2.07 4.06 0 4.81 2.67 4.81 6.14v6.29h-4v-5.57c0-1.33-.02-3.05-1.86-3.05-1.87 0-2.16 1.46-2.16 2.95v5.67h-4v-12Z" />
                </svg>
                <span className="sr-only">LinkedIn</span>
              </a>
              <a
                href="https://portfolio-topaz-eight-91.vercel.app"
                target="_blank"
                rel="noreferrer"
                aria-label="Portfolio"
                title="Portfolio"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:border-teal-600 hover:text-teal-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                  <path d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2Zm7.93 9h-3.06a15.7 15.7 0 0 0-1.14-5.01A8.03 8.03 0 0 1 19.93 11Zm-7.93 9a13.55 13.55 0 0 1-2.09-7h4.18A13.55 13.55 0 0 1 12 20Zm0-9H9.91A13.55 13.55 0 0 1 12 4a13.55 13.55 0 0 1 2.09 7H12Zm-3.73-5.01A15.7 15.7 0 0 0 7.13 11H4.07a8.03 8.03 0 0 1 4.2-5.01ZM4.07 13h3.06a15.7 15.7 0 0 0 1.14 5.01A8.03 8.03 0 0 1 4.07 13Zm11.66 5.01A15.7 15.7 0 0 0 16.87 13h3.06a8.03 8.03 0 0 1-4.2 5.01Z" />
                </svg>
                <span className="sr-only">Portfolio</span>
              </a>
            </div>
          </div>
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
    const role = localStorage.getItem("role") || getRoleFromToken(token) || "user";
    if (token && username) {
      localStorage.setItem("role", role);
      return {
        username,
        name: name || buildNameFromUsername(username),
        role,
      };
    }
    return null;
  });

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("name");
    localStorage.removeItem("role");
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
