# Aptura AI — Smart Recruitment & Interview Analyzer

A real, multi-user recruitment platform: candidates register, verify their real Gmail via a real OTP
email, upload a real resume (PDF/DOCX), get an AI-based ATS score, apply to real HR-posted jobs with
an AI-computed match score, and take a real webcam/microphone mock interview with AI-generated
questions and AI-evaluated answers. HR gets a live dashboard, a real candidate pipeline, and per-job
shortlist/reject/schedule/notes actions. Nothing in this app shows fake candidates, fake scores, or
simulated processing — every number comes from your MongoDB database or a live Gemini API call.

## Architecture

```
backend/   Node + Express + TypeScript + MongoDB (Mongoose) + JWT auth + Nodemailer + Gemini
frontend/  React + TypeScript + Vite + Tailwind CSS + Recharts
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) — or a connection string to any MongoDB instance
- A Gmail account with an **App Password** (for sending real OTP emails)
- A **Google Gemini API key** (for resume analysis, job matching, and interview features)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/aptura
JWT_SECRET=<generate a long random string>
GMAIL_USER=youraddress@gmail.com
GMAIL_APP_PASSWORD=<16-character app password, not your normal Gmail password>
GEMINI_API_KEY=<your Gemini API key>
```

**Getting a Gmail App Password:** Google Account → Security → 2-Step Verification (must be enabled) →
App passwords → generate one for "Mail". This `GMAIL_USER` is only the app's *sender* account — any
number of different students/HR users can still register with their own separate Gmail addresses.

**Getting a Gemini API key:** [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key.

Run it:

```bash
npm run dev
```

You should see:
```
[server] Aptura API running on http://localhost:5000
```
If you see warnings about `GMAIL_USER`/`GEMINI_API_KEY` not being set, OTP emails and AI features will
fail with a clear error until you configure them — the app will never silently fall back to fake data.

## 2. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**.

## 3. Try the real end-to-end flow

1. Register as a **Candidate** with a real Gmail address → check your inbox for the real OTP email →
   verify → you're logged in and see your real name on the dashboard.
2. Upload a real PDF/DOCX resume → watch it actually upload, extract text, and get analyzed by Gemini
   → see your real, non-hardcoded ATS score.
3. In a second browser (or incognito window), register as **HR** → post a real job.
4. Back as the candidate, go to Jobs → see the real job HR posted → "Check my match" → real AI-computed
   match score.
5. Start a mock interview → grant real camera/mic permissions → answer real AI-generated questions →
   finish → get a real AI-evaluated report → download the real PDF.
6. As HR, go to Candidates → click through to the candidate's real profile → see their real resume,
   ATS score, job match, and interview report → shortlist/reject/schedule/add notes.

## What's real vs. explicitly not built yet

**Real and working:**
- Multi-user registration/login, JWT sessions, role-based authorization enforced server-side
- Real Gmail OTP via Nodemailer (register + forgot-password), with expiry, attempt limits, resend
  cooldown, and no OTP ever returned in an API response or printed in production logs
- Real PDF/DOCX upload, text extraction, and Gemini-based ATS analysis
- Real HR job CRUD and Gemini-based resume-vs-job matching with configurable match tiers
- Real Gemini-generated multi-round interview questions (HR/Technical/Behavioral/Problem-Solving),
  real webcam (`getUserMedia`) with permission-denied handling, real Web Speech API transcription
  with typed fallback, real Gemini answer evaluation
- Real HR dashboard stats (MongoDB aggregations, zero-state safe), real candidate table, real
  per-application shortlist/reject/schedule/notes
- CSV/JSON-ready export endpoint (`GET /api/hr/export`) for Power BI/Tableau
- Basic admin routes (`/api/admin/*`) for platform-wide counts and user/job management

**Explicitly not built (would need dedicated follow-up work, and I did not fake it):**
- **Facial-expression / eye-contact confidence indicators** — this needs a real computer-vision
  pipeline (OpenCV/DeepFace) analyzing video frames, which is a substantial separate subsystem.
  Nothing in this app currently claims to measure this — the "confidence" score you see is Gemini's
  text-based read of the answer content, clearly labeled as an AI-based indicator, not a video-derived one.
- **Admin frontend UI** — the API routes exist; there's no React admin panel yet.
- **Rich HR skill/pipeline filters, candidate ranking UI** — the ranking data exists (ATS + match +
  interview scores per candidate) but there's no dedicated "ranked list" view yet, just the sortable table.

## Security notes

- Passwords are hashed with bcrypt (12 salt rounds) — never stored in plain text.
- OTP codes are hashed before storage and are never returned by any API response.
- `GEMINI_API_KEY` and `GMAIL_APP_PASSWORD` live only in `backend/.env`, never sent to the frontend.
- All role-sensitive routes check `req.user.role` server-side via middleware — frontend route guards
  are for UX only, not the actual security boundary.
- Rate limiting is applied to auth, OTP, and AI-calling endpoints.

## Troubleshooting

- **"AI analysis is not configured on this server"** → set `GEMINI_API_KEY` in `backend/.env` and restart.
- **"Email sending is not configured"** → set `GMAIL_USER` + `GMAIL_APP_PASSWORD` in `backend/.env`.
- **Mongo connection refused** → make sure `mongod` is running locally, or update `MONGODB_URI` to point
  at MongoDB Atlas.
- **CORS errors in the browser** → make sure `CLIENT_ORIGIN` in `backend/.env` matches the URL the
  frontend is actually running on (default `http://localhost:5173`).
