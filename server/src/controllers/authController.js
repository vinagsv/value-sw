import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db/index.js';

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Look up user in the users table
    const result = await db.query(
      `SELECT id, username, password, display_name, role, is_active
       FROM users
       WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_here',
      { expiresIn: '11h' }
    );

    res.json({
      token,
      username: user.username,
      displayName: user.display_name || user.username,
      role: user.role,
    });
  } catch (error) {
    next(error);
  }
};

// ── List users (admin only) ───────────────────────────────────────────────────
export const getUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, username, display_name, role, is_active, created_at
       FROM users
       ORDER BY role DESC, username ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

// ── Create user (admin only) ──────────────────────────────────────────────────
export const createUser = async (req, res, next) => {
  try {
    const { username, password, display_name, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Enforce single-admin rule
    if (role === 'admin') {
      const adminCheck = await db.query(
        `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
      );
      if (adminCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Only one admin account is allowed.' });
      }
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (username, password, display_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, display_name, role, is_active, created_at`,
      [username, hash, display_name || username, role || 'user']
    );

    await db.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['USER_CREATED', `Admin created user "${username}" with role "${role || 'user'}"`]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    next(error);
  }
};

// ── Update user (admin only) ──────────────────────────────────────────────────
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, password, display_name, role, is_active } = req.body;

    // Prevent changing the current requester's own role away from admin
    if (String(req.user.id) === String(id) && role && role !== 'admin') {
      return res.status(400).json({ error: 'Admin cannot demote themselves.' });
    }

    // Enforce single-admin rule when promoting
    if (role === 'admin') {
      const adminCheck = await db.query(
        `SELECT id FROM users WHERE role = 'admin' AND id <> $1 LIMIT 1`,
        [id]
      );
      if (adminCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Only one admin account is allowed.' });
      }
    }

    // Build dynamic SET clause
    const fields = [];
    const values = [];
    let idx = 1;

    if (username !== undefined) { fields.push(`username = $${idx++}`); values.push(username); }
    if (display_name !== undefined) { fields.push(`display_name = $${idx++}`); values.push(display_name); }
    if (role !== undefined) { fields.push(`role = $${idx++}`); values.push(role); }
    if (is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`);
      values.push(hash);
    }

    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, username, display_name, role, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['USER_UPDATED', `Admin updated user id=${id}`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Username already exists.' });
    }
    next(error);
  }
};

// ── Delete user (admin only) ──────────────────────────────────────────────────
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (String(req.user.id) === String(id)) {
      return res.status(400).json({ error: 'Admin cannot delete their own account.' });
    }

    const result = await db.query(
      `DELETE FROM users WHERE id = $1 RETURNING username, role`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await db.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['USER_DELETED', `Admin deleted user "${result.rows[0].username}" (role: ${result.rows[0].role})`]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};