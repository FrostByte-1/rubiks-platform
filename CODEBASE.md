# Rubik's Cube Platform — Codebase Reference

> **Purpose of this document:** Hand this file to an AI (e.g. Claude) and ask it to write the final `README.md` for GitHub. It covers every file, the full architecture, the data flow, and the tech stack.

---

## Project overview

A full-stack web application that lets users:
1. **Play with an interactive 3D Rubik's Cube** in the browser (keyboard controls + drag-to-rotate).
2. **Scan a physical cube** by uploading one photo per face — the backend detects sticker colors automatically using computer vision.
3. **Get a step-by-step solution** in two modes: Kociemba optimal (shortest path) or Layer-by-Layer (beginner-friendly stages).
4. **Race against the clock** in the Speedcubing Arena: receive a random scramble, solve it with keyboard moves, and submit your time to a live leaderboard.
5. **Learn solving methods** on the Learn page: notation guide, 5 popular techniques (Beginner LBL, CFOP, Roux, ZZ, Petrus) each with YouTube links.

The project is a **monorepo** with two independent sub-projects:

```
rubiks-platform/
├── backend/      Python / FastAPI REST API
└── frontend/     React / Vite SPA
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite |
| 3D rendering | Three.js via `@react-three/fiber` + `@react-three/drei` |
| Styling | Vanilla CSS with CSS custom properties (no Tailwind) |
| Routing | React Router v6 |
| Backend framework | FastAPI (Python 3.11+) |
| ASGI server | Uvicorn  | 
| Database | SQLite (local dev) / PostgreSQL (production via env var) |
| ORM | SQLAlchemy |
| Auth | JWT (python-jose) + bcrypt password hashing (passlib) |
| Computer vision | OpenCV + NumPy |
| Cube solver | `kociemba` Python library (two-phase algorithm) |
| Fonts | Google Fonts — Inter, Outfit, JetBrains Mono |

---

## Backend

### Entry point

**`backend/app/main.py`**
FastAPI application factory. Loads `.env`, creates all database tables on startup, registers CORS middleware (allows `localhost:5173`), and mounts the three API routers.

Run with:
```bash
uvicorn app.main:app --reload --port 5000
```

### Authentication — `backend/app/auth.py`

JWT-based stateless auth.

- **`hash_password(plain)`** — bcrypt hash.
- **`verify_password(plain, hashed)`** — safe compare.
- **`create_access_token(user_id)`** — signs a JWT with 30-day expiry.
- **`decode_access_token(token)`** — verifies signature, returns user ID.
- **`get_current_user(token, db)`** — FastAPI dependency; used by any route that requires login.

The secret key is read from `JWT_SECRET` environment variable. See `.env.example`.

---

### Database — `backend/app/db/`

**`database.py`**
SQLAlchemy engine setup. Reads `DATABASE_URL` from env (defaults to `sqlite:///./rubiks.db`). Provides a `get_db()` FastAPI dependency that yields a session and closes it after each request.

**`models.py`** — Two ORM models:

| Model | Table | Fields |
|---|---|---|
| `User` | `users` | id, username (unique), hashed_password, created_at |
| `SolveTime` | `solve_times` | id, user_id (FK), seconds (float), scramble (string), created_at |

`User` has a one-to-many relationship to `SolveTime` with cascade delete.

---

### API routes — `backend/app/api/`

**`auth_routes.py`** — `/register`, `/login`, `/me`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/register` | POST | No | Creates a new user, returns JWT |
| `/login` | POST | No | OAuth2 password form, returns JWT |
| `/me` | GET | Yes | Returns `{id, username}` of the current user |

Username rules: 3-30 chars, letters/numbers/underscore only.

**`solve_routes.py`** — `/scramble`, `/solve`, `/solve_state`, `/detect`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/scramble` | GET | No | Returns a random 20-move scramble |
| `/solve` | POST | No | Accepts `{faces: {U:[9], R:[9], ...}}`, returns solution |
| `/solve_state` | POST | No | Accepts `{state: "54-char string"}`, returns solution |
| `/detect` | POST | No | Accepts a face label + image file, returns 9 color labels |

Both `/solve` and `/solve_state` accept a `?mode=quick|lbl` query parameter.

**`leaderboard_routes.py`** — `/times`, `/leaderboard`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/times` | POST | Yes | Submits a solve time in seconds |
| `/leaderboard` | GET | No | Returns top-N times (default 20) |

---

### Solver — `backend/app/solver/`

**`cube_model.py`**
The heart of the cube engine. Represents the cube as a **54-character string** (`U[0..8] R[9..17] F[18..26] D[27..35] L[36..44] B[45..53]`, reading order per face). Defines `MOVE_CYCLES_CW`: for each of the 6 faces, 5 four-element cycles that encode where stickers move on a clockwise quarter-turn.

Key functions:
- `apply_move(state, move)` — returns new state after one move (handles `'` and `2` suffixes).
- `apply_moves(state, moves)` — applies a sequence.
- `is_solved(state)` — checks all faces are uniform.
- `invert_moves(moves)` — reverses a move sequence (used by the frontend to set up the visual cube).

**`kociemba_solver.py`**
Wraps the `kociemba` Python library. Calls `kociemba.solve(state)`, sanitizes the output token list, collapses redundant consecutive moves (e.g. `R R` → `R2`), and verifies the result actually solves the cube before returning.

**`lbl_solver.py`**
Layer-by-Layer solver. Uses BFS (up to depth 8) to find the cross moves, then calls Kociemba for the remainder and buckets the solution into stages: **Cross → F2L → OLL → PLL**. Each stage has a label, a plain-English description, and a move list.

**`scramble.py`**
Generates random scrambles. Avoids same-face back-to-back moves and the `X Y X` pattern where X and Y are opposite faces (those commute and are wasteful). Returns a list of move strings.

---

### Vision — `backend/app/vision/`

**`color_detection.py`**
The color-detection pipeline. Given raw image bytes for one face of the cube:

1. Decode and resize to max 720px.
2. Convert to grayscale; apply CLAHE if image is dim (mean brightness < 110).
3. Combine Canny edge detection + adaptive threshold to find sticker boundaries.
4. Filter contours by area, aspect ratio, fill ratio, and polygon vertex count.
5. Deduplicate and keep the 9 best candidates.
6. If fewer than 9 candidates found, fall back to a rescue grid or a full-image grid.
7. Sort centers into reading order (top-left → bottom-right).
8. Sample a small patch at each center, compute trimmed median HSV + LAB values.
9. Classify each patch: **white first** (absolute saturation threshold `s < 85`), then hue-band matching for R/L/D/F/B.

Key design decisions:
- White detection is **absolute** (not relative/percentile), preventing the "everything is white" bug.
- Red vs Orange is separated purely by hue bands (`h < 8 or h >= 160` = Red; `8 ≤ h < 22` = Orange), not LAB.
- CLAHE only fires for genuinely dim photos; does not touch well-lit shots.

**`cube_state.py`**
Utility layer between the vision pipeline and the solver.
- `assemble_state(faces_dict)` — joins 6 face arrays (each 9 labels) into one 54-char string.
- `validate_state(state)` — checks length, each color appears exactly 9 times, centers match their face key.

---

## Frontend

### Entry point

**`frontend/index.html`** — minimal HTML shell. Loads Google Fonts and mounts `#root`.

**`frontend/src/main.jsx`** — renders `<App>` inside `BrowserRouter`, `ThemeProvider`, `CubeSettingsProvider`.

**`frontend/src/App.jsx`** — top-level layout: animated background, navigation bar, page `<Routes>`, settings panel, footer.

**`frontend/vite.config.js`** — Vite config (React plugin only).

---

### Pages — `frontend/src/pages/`

**`VirtualCubePage.jsx`**
An interactive 3D cube. Keyboard handler maps `U R F D L B` keys (+ Shift for prime) to cube moves. Buttons: Reset, Scramble (fetches from API), Solve current state (fetches solution from API and animates it), Scramble & Solve (demo mode).

**`ScanSolvePage.jsx`**
Two input modes (toggle):
- **Manual:** `ManualColorGrid` — paint stickers by clicking.
- **Photo:** `PhotoUploader` — upload one image per face; backend auto-detects colors.

Two solver modes (dropdown): Quick (Kociemba) and Layer-by-Layer. Displays the solution in a `SolutionPlayer` (step-through or play-all). Also accepts a pre-loaded cube state from the Arena via `pendingScan.js`.

**`ArenaPage.jsx`**
Speedcubing timer. Phases: `idle → solving → done`.
- Fetches a random scramble, applies it instantly to the 3D cube.
- Keyboard controls active during solving phase.
- Polls every 150ms to detect when the cube is solved.
- On completion, shows the time and an optional leaderboard submit button (requires login).
- "Quit & Learn" button saves current cube state to `pendingScan.js` and navigates to Scan & Solve.

**`LearnPage.jsx`**
Static educational content: notation cheat-sheet table, and 5 technique cards (Beginner LBL, CFOP, Roux, ZZ, Petrus), each with steps and a YouTube search link.

---

### Components — `frontend/src/components/`

**`cube/Cube3D.jsx`**
Three.js canvas via `@react-three/fiber`. Renders 26 cubies (all positions except center). Each `Cubie` component renders a `RoundedBox` body + up to 6 `Sticker` planes. Animation runs in `useFrame` — directly mutates the group ref for zero-flicker per-frame updates. Easing: cubic ease-in-out.

**`cube/useCubeState.js`**
The shared cube state hook. Owns:
- `cubies` — array of 26 cubie objects with position, quaternion, and sticker flags.
- `stateRef` — the live 54-char string state (not React state — avoids re-renders).
- `queueRef` — move queue.
- `animatingRef` — the currently-playing animation.

Key exports: `useCubeState`, `parseMove`, `invertMoves`, `normalizeMoves`, `MOVE_DEFS`, `isCubieInLayer`.

**`cube/SceneEnvironment.jsx`**
Three.js lighting and fog setup. Reads CSS custom properties (`--scene-fog`, `--scene-ambient`, etc.) via a `MutationObserver` so it reacts to theme changes without a page reload. One rim light orbits slowly using `useFrame`.

**`scan/ManualColorGrid.jsx`**
Color picker + six 3×3 grids. Click a color from the palette, then click stickers to paint them. Centers are locked. Calls `onSubmit(faces)` when the user clicks Solve.

**`scan/PhotoUploader.jsx`**
One file input per face. On file selection, calls `api.detectFace(face, file)` and renders the returned 9-color grid for visual confirmation. The Submit button enables only when all 6 faces have been uploaded.

**`solve/SolutionPlayer.jsx`**
Prev / Next / Play-all / Reset controls for stepping through a move list. Each button press queues the appropriate move on the cube state. Displays the move list with highlighting for done/current/pending.

**`arena/Timer.jsx`**
Live timer that re-renders every 30ms using `setInterval`. Formats milliseconds as `M:SS.cs` or `SS.cs`. Exports `formatTime` for use in other components.

**`arena/Leaderboard.jsx`**
Fetches and renders the leaderboard table. Highlights the current user's rows. Shows medal icons for top 3. Re-fetches whenever `refreshKey` prop changes (after a new submission).

**`auth/AuthForm.jsx`**
Tabbed login/register form. Calls `api.login` or `api.register`, then `auth.setSession(token, user)`. Shows inline validation errors.

**`auth/UserBadge.jsx`**
Displays the logged-in username in the nav bar. Listens to `auth.onChange` custom event for live updates. Shows a Sign Out button.

**`background/AnimatedBackground.jsx`**
Conditionally renders `SakuraPetals` (sakura theme) or `Particles` (all other themes), or nothing if the user disables the background in settings.

**`background/SakuraPetals.jsx`**
Renders CSS-animated petal divs with randomized positions, sizes, and durations.

**`settings/SettingsPanel.jsx`**
Slide-in drawer (triggered by ⚙️ button in nav). Controls: theme switcher, background toggle, cube style selector, bevel radius slider, per-face color pickers with reset button. Closes on Escape key.

---

### Utilities — `frontend/src/`

**`api.js`**
Centralized HTTP client. `jfetch(path, opts, requireAuth)` attaches the Bearer token automatically if present in localStorage. Exports an `api` object with methods: `register`, `login`, `me`, `scramble`, `solveFromState`, `solveFromFaces`, `detectFace`, `submitTime`, `leaderboard`.

**`auth.js`**
Session manager. Stores `{access_token, user}` in `localStorage` under the key `cube_session`. Dispatches a custom `cube-auth-change` event on login/logout so all components can react synchronously.

**`pendingScan.js`**
Tiny `sessionStorage` bridge. `setPendingScan(state54)` saves a scrambled cube state; `takePendingScan()` reads and clears it. Used so the Arena can hand its current cube state to the Scan & Solve page when the user clicks "Quit & Learn".

---

### Theme system — `frontend/src/theme/`

**`themes.js`**
Defines 4 themes: **Neo** (dark neon), **Sakura** (light pink), **Classy** (glassmorphism slate), **Arctic** (light blue). Each theme is a flat object of CSS custom property key-value pairs covering background gradients, text colors, card styles, accent colors, timer glow, and 3D scene lighting.

**`ThemeProvider.jsx`**
React context. Persists the selected theme to `localStorage`. On theme change, applies all CSS variables to `document.documentElement` via `style.setProperty`. Also sets `data-theme` attribute for CSS selectors.

**`CubeSettingsProvider.jsx`**
React context for cube-specific settings: face colors, cube style (realistic/matte/glass/classic), bevel radius, and background toggle. Persists to `localStorage` under `cube_settings`. Provides update callbacks: `setFaceColor`, `setCubeStyle`, `setBevelRadius`, `setShowBackground`, `resetColors`.

---

## Data flow — Scan & Solve

```
User uploads photo
  → frontend PhotoUploader
    → POST /detect?face=U  (multipart image)
      → color_detection.detect_face_from_bytes()
        → find sticker centers (contour detection)
        → sample + classify 9 patches
        → return ["U","L","R",...]   ← 9 labels
  → user can correct any wrong sticker in ManualColorGrid
  → click "Solve"
    → POST /solve  {faces: {U:[...], R:[...], ...}}
      → cube_state.assemble_state()  → 54-char string
      → cube_state.validate_state()
      → kociemba_solver.solve(state)  OR  lbl_solver.solve_lbl(state)
      → return {moves: [...]}  OR  {stages: [...]}
  → frontend applies inverse of solution to 3D cube (visual matches physical)
  → user steps through moves with SolutionPlayer
```

## Data flow — Arena

```
User clicks "New Scramble"
  → GET /scramble  → 20 random moves
  → cube.applyMovesInstant(moves)  (visual scrambled)
  → timer starts
  → keyboard events → cube.queueMove()
  → every 150ms: check cube.isSolved()
  → when solved: stop timer, show time
  → POST /times  {seconds, scramble}  (if logged in)
  → GET /leaderboard → refresh table
```

---

## Security notes for GitHub

- `.env` files are excluded by `.gitignore`. They contain `JWT_SECRET` and `DATABASE_URL`.
- Never commit a real `JWT_SECRET`. Use `.env.example` (committed) to document the required variables.
- `rubiks.db` (the SQLite database) is excluded — it's a runtime artefact containing user data.
- `venv/` and `node_modules/` are excluded — they are large and reproducible.
- The `JWT_SECRET` in `.env.example` is a placeholder string, not a real key.

---

## How to run locally

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env: set a real JWT_SECRET (any long random string)
uvicorn app.main:app --reload --port 5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Open http://localhost:5173
```

---

## File tree (source files only)

```
rubiks-platform/
├── .gitignore
├── CODEBASE.md                          ← this file
│
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── main.py                      ← FastAPI app factory
│       ├── auth.py                      ← JWT + bcrypt
│       ├── api/
│       │   ├── auth_routes.py           ← /register /login /me
│       │   ├── solve_routes.py          ← /scramble /solve /detect
│       │   └── leaderboard_routes.py    ← /times /leaderboard
│       ├── db/
│       │   ├── database.py              ← SQLAlchemy engine + session
│       │   └── models.py               ← User, SolveTime models
│       ├── solver/
│       │   ├── cube_model.py            ← 54-char state + move cycles
│       │   ├── kociemba_solver.py       ← optimal solver wrapper
│       │   ├── lbl_solver.py            ← layer-by-layer solver
│       │   └── scramble.py              ← random scramble generator
│       └── vision/
│           ├── color_detection.py       ← CV pipeline (OpenCV)
│           └── cube_state.py            ← assemble + validate state
│
└── frontend/
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx                     ← app root + providers
        ├── App.jsx                      ← nav + routes + layout
        ├── api.js                       ← HTTP client
        ├── auth.js                      ← session manager (localStorage)
        ├── pendingScan.js               ← arena→scan state bridge
        ├── App.css                      ← global styles
        ├── index.css                    ← CSS reset + base
        ├── pages/
        │   ├── VirtualCubePage.jsx      ← keyboard-controlled 3D cube
        │   ├── ScanSolvePage.jsx        ← photo/manual input + solution
        │   ├── ArenaPage.jsx            ← speedcubing timer + leaderboard
        │   └── LearnPage.jsx            ← static edu content
        ├── components/
        │   ├── cube/
        │   │   ├── Cube3D.jsx           ← Three.js canvas + cubie rendering
        │   │   ├── useCubeState.js      ← shared cube state hook
        │   │   └── SceneEnvironment.jsx ← lighting + fog
        │   ├── scan/
        │   │   ├── ManualColorGrid.jsx  ← paint stickers manually
        │   │   └── PhotoUploader.jsx    ← upload photos per face
        │   ├── solve/
        │   │   └── SolutionPlayer.jsx   ← step-through move player
        │   ├── arena/
        │   │   ├── Timer.jsx            ← live solve timer
        │   │   └── Leaderboard.jsx      ← top times table
        │   ├── auth/
        │   │   ├── AuthForm.jsx         ← login/register form
        │   │   └── UserBadge.jsx        ← nav user display
        │   ├── background/
        │   │   ├── AnimatedBackground.jsx
        │   │   └── SakuraPetals.jsx
        │   └── settings/
        │       └── SettingsPanel.jsx    ← theme/style drawer
        └── theme/
            ├── themes.js               ← 4 theme definitions (CSS vars)
            ├── ThemeProvider.jsx        ← theme context + localStorage
            └── CubeSettingsProvider.jsx ← cube style/color context
```
