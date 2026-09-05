function validateRenderPayload(req, res, next) {
  const { res: resolution, fps } = req.body || {};
  if (resolution && !['720p', '1080p', '1440p', '2160p'].includes(resolution)) {
    return res.status(400).json({ error: { message: 'Invalid resolution format', status: 400 } });
  }
  if (fps && (typeof fps !== 'number' || fps < 10 || fps > 120)) {
    return res.status(400).json({ error: { message: 'Invalid fps rate', status: 400 } });
  }
  next();
}

function validateProjectPayload(req, res, next) {
  if (req.method === 'PUT' && !req.body) {
    return res.status(400).json({ error: { message: 'Missing request body', status: 400 } });
  }
  next();
}

module.exports = {
  validateRenderPayload,
  validateProjectPayload
};
