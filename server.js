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

// Serve static assets from public/ and renders/
app.use(express.static(path.join(__dirname, 'public')));
app.use('/renders', express.static(path.join(__dirname, 'renders')));

// API Routes
app.use('/v1/projects', projectRoutes);
app.use('/v1/presets', presetRoutes);
app.use('/v1/renders', renderRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
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
