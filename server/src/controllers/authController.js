import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    const result = await db.query(
      `SELECT key, value FROM settings WHERE key IN ('auth_username', 'auth_password')`
    );
    
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    if (username !== settings.auth_username) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, settings.auth_password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username }, 
      process.env.JWT_SECRET || 'your_jwt_secret_here', 
      { expiresIn: '11h' }
    );
    
    res.json({ token, username });
  } catch (error) {
    next(error);
  }
};