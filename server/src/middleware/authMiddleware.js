import jwt from 'jsonwebtoken';

export const protect = (req, res, next) => {
  // FIX: Previously the function would fall through to the "no token" block even
  // after already sending a 401 response inside the try/catch, causing a
  // "Cannot set headers after they are sent" crash on expired/invalid tokens.
  // Now we return early after every response send.

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_here');
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ error: 'Not authorized, no token' });
};