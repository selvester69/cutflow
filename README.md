# CutFlow — Mobile Video Editor

CutFlow is a modern, mobile-first video editor web application built with a modular Express backend, SQLite persistence, Web Audio API sound synthesis, and real-time interactive canvas editing.

---

## 🚀 Quick Start

### Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start Server:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

3. **Run API Integration Tests:**
   ```bash
   npm test
   ```

---

## 🐳 Docker Deployment

### Using Docker Compose
```bash
docker-compose up -d --build
```
The server will run on `http://localhost:3000`.

---

## 📁 Architecture & Directory Layout

```
.
├── server.js               # Express application entrypoint
├── Dockerfile              # Container definition
├── docker-compose.yml      # Container orchestration
├── .github/workflows/      # CI/CD pipelines
├── public/                 # Static frontend assets
│   ├── index.html          # Mobile editor shell
│   └── js/                 # Vanilla ES Modules
│       ├── app.js          # App bootstrap & events
│       ├── api.js          # API client
│       ├── audio.js        # Web Audio API engine
│       ├── state.js        # State store & undo history
│       └── ui.js           # UI & Canvas rendering
├── src/                    # Backend modular layers
│   ├── controllers/        # Request controllers
│   ├── db/                 # SQLite database connection & init
│   ├── repositories/       # Query data access
│   ├── routes/             # REST route handlers
│   └── services/           # Business logic & render jobs
├── tests/                  # Integration test suite
└── HLD.md                  # High-Level Design & Architecture Roadmap
```

---

## 🛠 Features

- **Timeline & Trimming:** Non-destructive trim, split, duplicate, delete, and retiming ($0.5\times - 2.0\times$).
- **Canvas Overlay Layers:** Interactive text and stickers layer with scale, rotate, and drag-and-drop.
- **Platform Ratios:** Reels/TikTok (9:16), IG Post (4:5), Square Feed (1:1), YouTube (16:9), Cinema (21:9), Classic (4:3).
- **Background Styling:** Video blur (intensity slider), solid colors, linear gradients, and fit modes (Cover/Contain).
- **Web Audio Engine:** Real-time synthesis of audio soundtracks with volume & ducking support.
- **Server Render Queue:** Background rendering jobs with polled progress and CDN links.

---

## 📋 Senior Design Review & Roadmap

See [HLD.md](./HLD.md) for the full Senior Design Review, 6-Month Roadmap, Tier 1-3 Improvements, and Risk Matrix.
