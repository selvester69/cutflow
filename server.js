const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/db/database');

const projectRoutes = require('./src/routes/projectRoutes');
const presetRoutes = require('./src/routes/presetRoutes');
const renderRoutes = require('./src/routes/renderRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Structured HTTP Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent') || 'unknown'
    }));
  });
  next();
});

// Serve static assets from public/ and renders/
app.use(express.static(path.join(__dirname, 'public')));
app.use('/renders', express.static(path.join(__dirname, 'renders')));

// API Routes
app.use('/v1/projects', projectRoutes);
app.use('/v1/presets', presetRoutes);
app.use('/v1/renders', renderRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'API_ERROR',
    status: err.status || 500,
    message: err.message || 'Internal Server Error',
    stack: err.stack
  }));
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      status
    }
  });
});

if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`CutFlow Modular Server running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
