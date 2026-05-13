import jwt from 'jsonwebtoken';

// ── Authenticate any valid token ──────────────────────────────────────────────
export const protect = (req, res, next) => {
  if (req.headers.authorization?.startsWith('Bearer')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
      req.user = decoded; // { id, username, role }
      return next();
    } catch {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }
  return res.status(401).json({ error: 'Not authorized, no token' });
};

// ── Require admin role ────────────────────────────────────────────────────────
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return next();
};