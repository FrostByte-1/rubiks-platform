# 🧩 Rubik's Cube Platform

A full-stack web app to **play, scan, and solve** a Rubik's Cube in your browser — featuring an interactive 3D cube, a computer-vision scanner that reads a real cube from photos, two solving engines, a speedcubing arena with a live leaderboard, and a learn section. Website : https://rubiks-platform.vercel.app/

---

## ✨ Features

- **🎮 Interactive 3D Cube** — A fully rendered Three.js cube you control with the keyboard (`U R F D L B`, hold Shift for prime moves) or drag to rotate.
- **📷 Scan a Real Cube (OpenCV)** — Upload one photo per face and the backend detects every sticker color automatically using a computer-vision pipeline (contour detection + HSV/LAB color classification).
- **🧠 Solver** — *Quick* mode (Kociemba two-phase, near-optimal)
- **⏱️ Speedcubing Arena** — Get a random scramble, solve against a live timer, and submit your time to a leaderboard.
- **📚 Learn Page** — Notation cheat-sheet and five solving methods (Beginner LBL, CFOP, Roux, ZZ, Petrus).
- **🎨 Themes & Customization** — Four themes (Neo, Sakura, Classy, Arctic), cube style options, and per-face color pickers.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| 3D rendering | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Routing | React Router v6 |
| Styling | Vanilla CSS with custom properties |
| Backend | FastAPI (Python 3.11+) |
| ASGI server | Uvicorn |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Computer vision | OpenCV + NumPy |
| Cube solver | `kociemba` (two-phase algorithm) |

---

## 🏗️ Architecture

A **monorepo** with two independent sub-projects:

```
rubiks-platform/
├── backend/      Python / FastAPI REST API
└── frontend/     React / Vite single-page app
```

The frontend is deployed on **Vercel**; the backend on **Render**.

### How the Scan & Solve flow works
```
Upload photo of a face
  → POST /detect (multipart image)
    → OpenCV: find sticker centers, sample patches, classify 9 colors
  → user corrects any mis-detected sticker
  → POST /solve  { faces: { U:[...], R:[...], ... } }
    → assemble 54-char cube state → validate → Kociemba / LBL solver
  → solution returned and animated on the 3D cube
```

---

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL to your backend URL (e.g. http://localhost:5000)
npm run dev
# Open http://localhost:5173
```

---

## 🌐 Deployment Notes

- **Frontend (Vercel):** Root Directory is set to `frontend`. SPA routing is handled by `frontend/vercel.json` rewriting all paths to `/index.html` so React Router works on refresh.
- **Backend (Render):** Set `DATABASE_URL` (PostgreSQL) and `JWT_SECRET` as environment variables. CORS allows the Vercel preview/production URLs.
- **Environment variables:**
  - Frontend: `VITE_API_URL` → your backend URL (no trailing slash)
  - Backend: `JWT_SECRET`, `DATABASE_URL`

---

## 📡 API Overview

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/register` | POST | No | Create a user, returns JWT |
| `/login` | POST | No | Log in, returns JWT |
| `/me` | GET | Yes | Current user info |
| `/scramble` | GET | No | Random 20-move scramble |
| `/solve` | POST | No | Solve from 6 face arrays |
| `/solve_state` | POST | No | Solve from a 54-char state string |
| `/detect` | POST | No | Detect 9 colors from a face photo |
| `/times` | POST | Yes | Submit a solve time |
| `/leaderboard` | GET | No | Top times |

`/solve` and `/solve_state` accept a `?mode=quick|lbl` query parameter.

---

## 🧠 How the Solvers Work

- **Kociemba (Quick):** Wraps the two-phase algorithm; collapses redundant moves (e.g. `R R` → `R2`) and verifies the result actually solves the cube.

---

## 👁️ How the OpenCV Scanner Works

For each uploaded face image, the pipeline:
1. Decodes and resizes to max 720px.
2. Applies CLAHE contrast enhancement only if the photo is dim.
3. Combines Canny edge detection + adaptive threshold to find sticker boundaries.
4. Filters contours by area, aspect ratio, and shape, keeping the 9 best.
5. Sorts centers into reading order and samples a patch at each.
6. Classifies each patch — white first (absolute saturation threshold), then hue-band matching for the five colors. Red vs Orange is separated purely by hue.

---

## 📌 Roadmap

- [ ] Persist leaderboard with PostgreSQL in production
- [ ] User profiles and solve history
- [ ] Mobile camera capture for scanning (live, not upload)
- [ ] More solving methods on the Learn page

---
