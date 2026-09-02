const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/renders', express.static(path.join(__dirname, 'renders')));

// Ensure renders directory exists
const rendersDir = path.join(__dirname, 'renders');
if (!fs.existsSync(rendersDir)) {
  fs.mkdirSync(rendersDir, { recursive: true });
}

// In-memory Database
const DB = {
  projects: {
    cf_8241: {
      id: 'cf_8241',
      title: 'Kyoto — Cut 02',
      rev: 11,
      updatedAt: Date.now(),
      clips: [
        { id: 'k1', name: 'Dawn Ridge', img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=70', orig: 4.2, in: 0, dur: 3.4 },
        { id: 'k2', name: 'Fog Line',   img: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=640&q=70', orig: 3.8, in: 0, dur: 2.8 },
        { id: 'k3', name: 'Pine Road',  img: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=640&q=70', orig: 4.6, in: 0, dur: 3.6 },
        { id: 'k4', name: 'Still Lake', img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=640&q=70', orig: 4.0, in: 0, dur: 3.0 },
        { id: 'k5', name: 'Night Peak', img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=640&q=70', orig: 3.5, in: 0, dur: 2.6 },
        { id: 'k6', name: 'Coast Line', img: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?auto=format&fit=crop&w=640&q=70', orig: 4.4, in: 0, dur: 3.2 }
      ],
      text: { content: 'CHASING\nDAYLIGHT', x: 50, y: 66, weight: 900, color: '#ffffff', align: 'center', anim: 'pop', upper: false },
      filter: 'kodak',
      speed: 1,
      ratio: 'portrait',
      track: 'alpine',
      volume: 0.72,
      muted: false
    }
  },
  presets: {
    filters: [
      { id: 'none',   name: 'Original',      css: 'none' },
      { id: 'kodak',  name: 'Kodak 2383',    css: 'contrast(1.12) saturate(1.26) sepia(.16) brightness(1.03)' },
      { id: 'teal',   name: 'Teal/Orange',   css: 'contrast(1.16) saturate(1.4) hue-rotate(-6deg)' },
      { id: 'noir',   name: 'Noir 400',      css: 'grayscale(1) contrast(1.3) brightness(.95)' },
      { id: 'fade',   name: 'Faded 35mm',    css: 'saturate(.72) contrast(.92) brightness(1.09) sepia(.14)' },
      { id: 'bleach', name: 'Bleach Bypass', css: 'saturate(.5) contrast(1.42) brightness(1.04)' }
    ],
    audio: [
      { id: 'alpine', name: 'Alpine Ambient', len: '2:14', bpm: 84 },
      { id: 'pulse',  name: 'Night Pulse',   len: '1:48', bpm: 122 },
      { id: 'tape',   name: 'Tape Hiss Loop', len: '0:58', bpm: 96 }
    ],
    codecs: [
      { id: 'h264',   name: 'H.264' },
      { id: 'hevc',   name: 'HEVC' },
      { id: 'prores', name: 'ProRes 422' }
    ]
  }
};

const JOBS = new Map();

// REST API Endpoints

// GET /v1/projects/:id
app.get('/v1/projects/:id', (req, res) => {
  const proj = DB.projects[req.params.id];
  if (!proj) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(proj);
});

// PUT /v1/projects/:id
app.put('/v1/projects/:id', (req, res) => {
  let proj = DB.projects[req.params.id];
  if (!proj) {
    proj = { id: req.params.id, rev: 0 };
    DB.projects[req.params.id] = proj;
  }
  proj.rev = (proj.rev || 0) + 1;
  proj.updatedAt = Date.now();
  Object.assign(proj, req.body, { rev: proj.rev, updatedAt: proj.updatedAt });

  const bytes = JSON.stringify(req.body).length;
  res.json({ rev: proj.rev, updatedAt: proj.updatedAt, bytes });
});

// GET /v1/presets
app.get('/v1/presets', (req, res) => {
  res.json(DB.presets);
});

// POST /v1/renders
app.post('/v1/renders', (req, res) => {
  const payload = req.body;
  const id = 'rnd_' + Math.random().toString(36).slice(2, 9);
  const job = {
    id,
    status: 'queued',
    progress: 0,
    stage: 0,
    payload,
    createdAt: Date.now()
  };

  JOBS.set(id, job);

  // Background processing emulation
  job._timer = setInterval(() => {
    job.progress = Math.min(100, job.progress + (job.progress < 6 ? 6 : job.progress < 78 ? 4 : 3) + Math.random() * 2);
    job.stage = job.progress < 15 ? 0 : job.progress < 60 ? 1 : job.progress < 92 ? 2 : 3;

    if (job.progress >= 100) {
      job.progress = 100;
      job.status = 'done';
      const host = req.get('host') || `localhost:${PORT}`;
      const protocol = req.protocol || 'http';
      const resName = payload.res || '1080p';
      const jobDir = path.join(rendersDir, job.id);
      if (!fs.existsSync(jobDir)) {
        fs.mkdirSync(jobDir, { recursive: true });
      }
      const filePath = path.join(jobDir, `${resName}.mp4`);
      fs.writeFileSync(filePath, 'CutFlow Rendered Video Sample File Placeholder');

      job.url = `${protocol}://${host}/renders/${job.id}/${resName}.mp4`;
      job.size = Math.round(28 + (payload.res === '2160p' ? 2.9 : 1) * 46) + ' MB';
      clearInterval(job._timer);
    }
  }, 100);

  res.status(201).json({ id, status: 'queued' });
});

// GET /v1/renders/:id
app.get('/v1/renders/:id', (req, res) => {
  const job = JOBS.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    url: job.url,
    size: job.size
  });
});

// DELETE /v1/renders/:id
app.delete('/v1/renders/:id', (req, res) => {
  const job = JOBS.get(req.params.id);
  if (job) {
    if (job._timer) clearInterval(job._timer);
    job.status = 'cancelled';
  }
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`CutFlow server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
