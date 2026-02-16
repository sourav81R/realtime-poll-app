# PollRoom - Real-Time Polling App

PollRoom is a full-stack real-time polling application where users can create polls, vote, change/revoke votes, and see live updates.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express + MongoDB + Mongoose
- Auth: JWT + Google OAuth (optional)
- Realtime: Socket.IO

## Project Structure

```text
realtime-poll-app/
|-- backend/
|   |-- config/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- server.js
|-- frontend/
|   |-- src/
|   |-- index.html
|   |-- vite.config.js
|-- README.md
```

## Features

- User registration/login with JWT
- Optional Google OAuth login
- Create polls with multiple options
- Vote on polls (single active vote per poll per participant identity)
- Change vote or revoke vote
- Poll feed with latest polls
- Profile dashboard for created/voted polls
- Real-time result updates with Socket.IO
- Responsive UI for desktop/mobile

## Setup

### Prerequisites

- Node.js 18+ (recommended)
- MongoDB running locally or a MongoDB URI

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd realtime-poll-app

cd backend
npm install

cd ../frontend
npm install
```

### 2. Backend environment variables

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/pollroom
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173

# Optional (for Google OAuth)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/auth/google/callback
```

### 3. Frontend API URL

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
```

For production (Vercel), set `VITE_BACKEND_URL` to your deployed backend URL in project environment variables.
The frontend requires this variable in production and will not fallback to the Vercel frontend domain.

## Run Locally

Use two terminals.

### Terminal 1 - backend

```bash
cd backend
npm run dev
```

### Terminal 2 - frontend

```bash
cd frontend
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000`

## API Overview

- `POST /api/auth/register` - register user
- `POST /api/auth/login` - login user
- `GET /api/auth/google` - start Google OAuth
- `GET /api/polls` - poll feed (optional auth for personalized vote state)
- `POST /api/polls` - create poll (auth required)
- `PUT /api/polls/:id` - edit poll (owner only)
- `DELETE /api/polls/:id` - delete poll (owner only)
- `GET /api/polls/:id` - get poll details
- `POST /api/polls/:id/vote` - vote/change/revoke vote (works with or without auth)
- `GET /api/polls/me/dashboard` - profile dashboard (auth required)

## Notes

### 1) Fairness / Anti-Abuse Mechanisms (2)

1. One active vote per participant identity per poll:
   Backend resolves a voter identity (`user:<id>` for authenticated users, `guest:<token>` for guests, with IP fallback) and enforces one active vote per poll with DB-level unique indexes.
2. Rate limiting on abuse-prone actions:
   `express-rate-limit` is applied on poll creation and voting endpoints to reduce scripted/spam traffic from the same IP.

### 2) Edge Cases Handled

- Invalid poll IDs return `400` instead of crashing.
- Invalid/missing option indices are validated.
- Poll-not-found returns `404`.
- Share-link visitors can vote without authentication.
- Revoke vote flow is supported by selecting the same option again.
- Poll owners can edit or delete their own polls.
- Changing poll options resets existing votes to keep vote-option mapping consistent.
- Vote decrements are clamped with `Math.max(0, ...)` to avoid negative counts.
- Feed/profile pages handle loading, error, and empty states.
- Non-auth users trying protected actions get guided to login/signup UI.
- Create-poll intent is preserved in session storage and auto-launches after login.
- Web Share fallback copies invite text to clipboard when native share is unavailable.

### 3) Known Limitations / Next Improvements

- Determined attackers can still bypass browser/device identity by rotating IPs or using many devices.
- CORS is currently open (`origin: "*"`) and should be restricted for production.
- No automated tests yet (unit/integration/e2e).
- Poll close/end-time scheduling is not implemented.

## Credits

Built and maintained by Sourav Chowdhury.
