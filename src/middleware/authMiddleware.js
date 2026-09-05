function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token.startsWith('token_usr_')) {
      const parts = token.split('_');
      const userId = parts[1] + '_' + parts[2];
      req.user = { id: userId };
      return next();
    }
  }

  // Fallback for default local application sessions
  req.user = { id: 'usr_default', email: 'creator@cutflow.app', name: 'Default Creator' };
  next();
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: { message: 'Unauthorized - Missing token', status: 401 } });
  }
  return authMiddleware(req, res, next);
}

module.exports = { authMiddleware, requireAuth };
