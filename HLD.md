# CutFlow — High-Level Design (HLD)

## 1. Executive Summary

**CutFlow** is a modern, mobile-first video editor web application. It combines an intuitive mobile editor UI with a responsive canvas preview, real-time audio synthesis (Web Audio API), interactive timeline scrubbing, and a server-backed render and storage service.

---

## 2. System Architecture

CutFlow follows a layered architecture with clear separation between the presentation layer, application backend, database persistence, and render output pipeline:

```
+-------------------------------------------------------------------------+
|                              Client Browser                             |
|                                                                         |
|  +------------------+  +-------------------+  +----------------------+  |
|  |   UI / Canvas    |  | Web Audio Engine  |  |  State Management    |  |
|  |  (public/js/ui)  |  | (public/js/audio) |  |  (public/js/state)   |  |
|  +--------+---------+  +---------+---------+  +----------+-----------+  |
|           |                      |                       |              |
|           +----------------------+-----------------------+              |
|                                  |                                      |
|                            API Client (public/js/api.js)                |
+----------------------------------+--------------------------------------+
                                   | HTTP REST API
                                   v
+-------------------------------------------------------------------------+
|                           Express Backend Server                        |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                   Routes (/v1/projects, /v1/renders, /v1/presets)  |  |
|  +-----------------------------------+-------------------------------+  |
|                                      |                                  |
|  +-----------------------------------v-------------------------------+  |
|  |              Controllers (Project, Render, Preset)                 |  |
|  +-----------------------------------+-------------------------------+  |
|                                      |                                  |
|  +-----------------------------------v-------------------------------+  |
|  |              Services (ProjectService, RenderService)               |  |
|  +-----------------+---------------------------------+---------------+  |
|                    |                                 |                  |
|  +-----------------v---------------+  +--------------v---------------+  |
|  | Project & Preset Repositories   |  |     Render Processing        |  |
|  +-----------------+---------------+  +--------------+---------------+  |
+--------------------+---------------------------------|------------------+
                     | SQLite SQL                       | Render File Output
                     v                                  v
           +-------------------+               +-------------------+
           | SQLite Database   |               | Render Storage    |
           |   (cutflow.db)    |               |  (public/renders/)|
           +-------------------+               +-------------------+
```

---

## 3. Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla ES Modules (No heavy framework overhead)
- **Audio:** Web Audio API (`AudioContext`, Oscillator, Noise Buffer, Biquad Filter)
- **Backend:** Node.js, Express.js
- **Database:** SQLite3 (`cutflow.db` via `sqlite3` driver)
- **Testing:** Native Node.js test runner (`tests/api.test.js`)
- **Verification:** Playwright E2E UI verification

---

## 4. Frontend Component Breakdown

The client is structured into focused ES modules located in `public/js/`:

1. **`app.js`**: Application bootstrap, clock updates, event bindings, sheet toggles, and initialization workflow.
2. **`ui.js`**: DOM rendering, canvas frame transitions, timeline ruler & clip layout, tool panel rendering (`Trim`, `Text`, `Stickers`, `BG`, `Ratio`, `Grade`, `Audio`, `Speed`), and canvas interactions (dragging text/stickers).
3. **`state.js`**: Central application state store, project snapshot history (undo/redo), time seeking, and current tool selection.
4. **`audio.js`**: Web Audio API engine providing real-time synth audio loops, volume scaling, and ducking for selected soundtracks (`Alpine Ambient`, `Night Pulse`, `Tape Hiss Loop`).
5. **`api.js`**: Centralized HTTP client wrapper communicating with the Express API backend.

---

## 5. Backend Component Breakdown

The Express server follows a clean, layered architecture:

- **`server.js`**: Server setup, static asset hosting, middleware configuration, and lifecycle management.
- **`src/db/database.js`**: SQLite database connection, table initialization, and seeding default projects and presets.
- **`src/routes/`**: Express routers mapping HTTP endpoints to controllers:
  - `projectRoutes.js`: `/v1/projects`
  - `presetRoutes.js`: `/v1/presets`
  - `renderRoutes.js`: `/v1/renders`
- **`src/controllers/`**: Request/response handler logic and validation.
- **`src/services/`**: Business logic, project state transformations, render job polling state machine, and simulated video rendering process.
- **`src/repositories/`**: SQLite query abstraction (`projectRepository.js`, `presetRepository.js`).

---

## 6. Database Schema

The SQLite database (`cutflow.db`) contains two primary tables:

### 6.1 `projects` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique project identifier (e.g., `cf_8241`) |
| `title` | TEXT | NOT NULL | Project display title |
| `rev` | INTEGER | DEFAULT 1 | Project revision counter for optimistic concurrency |
| `updated_at` | INTEGER | NOT NULL | Unix epoch timestamp of last update |
| `data` | TEXT | NOT NULL | JSON string encoding project timeline (clips, text, filter, speed, ratio, track, volume, muted, stickers, background) |

### 6.2 `presets` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | Unique preset key (e.g., `filters`, `audio`, `codecs`) |
| `data` | TEXT | NOT NULL | JSON string encoding preset options and metadata |

---

## 7. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/projects/:id` | Fetch project document by ID |
| `PUT` | `/v1/projects/:id` | Save project state and increment revision |
| `GET` | `/v1/presets` | Retrieve preset catalogue (LUT filters, audio tracks, codecs) |
| `POST` | `/v1/renders` | Create a video rendering job |
| `GET` | `/v1/renders/:id` | Poll render job status, progress percentage, stage, and output CDN link |
| `DELETE` | `/v1/renders/:id` | Cancel an active render job |

---

## 8. Core Features & Capabilities

### 8.1 Timeline & Editing Engine
- Non-destructive clip trimming (`In` point and `Duration` controls).
- Split clip at playhead position.
- Clip duplication and deletion.
- Retiming / playback rate control ($0.5\times$ to $2.0\times$).

### 8.2 Interactive Canvas Layers
- **Text Layer:** Multiline editable text with font weight selection, uppercase transform, color swatches, and drag-and-drop canvas positioning.
- **Stickers Layer:** Multi-sticker overlay support. Add stickers from a catalog, drag to move on canvas, scale size, rotate, and delete.

### 8.3 Background & Formatting
- **Aspect Ratio Formatting:** Instant aspect ratio switching for standard platforms (9:16 Reels/TikTok, 4:5 Instagram, 1:1 Feed, 16:9 YouTube, 21:9 Cinema, 4:3 Classic).
- **Background Styling:** Customizable frame backgrounds including video blur with adjustable blur radius, solid color fills, linear gradients, and fit modes (`Cover` vs `Contain`).

### 8.4 Web Audio Engine
- Synthesizes background audio stems directly in the browser using Web Audio API nodes (`AudioContext`, gain nodes, oscillators, filters).
- Master volume slider, mute toggle, and automatic audio ducking simulation.

### 8.5 Server Render Pipeline
- Asynchronous job execution tracking progress ($0\% - 100\%$) across four render stages:
  1. *Preparing media*
  2. *Rendering effects*
  3. *Encoding H.264 / HEVC / ProRes*
  4. *Packaging*
- Generates playable sample video artifacts in `public/renders/` served via express static route.

---

## 9. Verification & Testing

- **Backend API Test Suite:** `node tests/api.test.js` tests project persistence, revision tracking, preset fetching, render job creation, polling, and cancellation.
- **Frontend Verification:** Automated Playwright scripts verify UI elements, canvas interactions, sticker rendering, background controls, and console logging.
