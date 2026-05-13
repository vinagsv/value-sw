-- Migration 009: Create users table for RBAC
-- Replaces auth_username/auth_password in settings with a proper users table.
-- The single admin account is seeded from existing settings values.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(100) UNIQUE NOT NULL,
  password     TEXT NOT NULL,          -- bcrypt hash
  display_name VARCHAR(150),
  role         VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('admin', 'user')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Seed the initial admin from the existing settings rows (run once).
-- If settings rows are missing the INSERT is a no-op.
DO $$
DECLARE
  v_username TEXT;
  v_password TEXT;
BEGIN
  SELECT value INTO v_username FROM settings WHERE key = 'auth_username';
  SELECT value INTO v_password FROM settings WHERE key = 'auth_password';

  IF v_username IS NOT NULL AND v_password IS NOT NULL THEN
    INSERT INTO users (username, password, display_name, role)
    VALUES (v_username, v_password, 'Administrator', 'admin')
    ON CONFLICT (username) DO NOTHING;
  END IF;
END $$;

-- Keep settings rows so existing /api/settings routes still work,
-- but the auth source of truth is now the users table.