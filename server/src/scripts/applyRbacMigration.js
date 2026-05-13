/**
 * ============================================================
 *  RBAC MIGRATION SCRIPT
 *  Value Motor Agency — Billing System
 * ============================================================
 *  Run ONCE on an existing database to add the users table
 *  and migrate the existing admin credentials from settings.
 *
 *  Usage:
 *    node src/scripts/applyRbacMigration.js
 *
 *  Safe to re-run — uses IF NOT EXISTS / ON CONFLICT DO NOTHING.
 * ============================================================
 */

import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const log  = msg => console.log(`   ${msg}`);
const step = (n, msg) => console.log(`\n${n}️⃣  ${msg}`);
const ok   = msg => console.log(`   ✅ ${msg}`);

const main = async () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   VALUE MOTOR AGENCY — RBAC Migration                    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── Step 1: Create users table ────────────────────────────────────────
    step(1, 'Creating users table (if not exists)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        username     VARCHAR(100) UNIQUE NOT NULL,
        password     TEXT NOT NULL,
        display_name VARCHAR(150),
        role         VARCHAR(20) NOT NULL DEFAULT 'user'
                      CHECK (role IN ('admin', 'user')),
        is_active    BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      );
    `);
    ok('users table ready.');

    // ── Step 2: Migrate existing admin from settings ──────────────────────
    step(2, 'Migrating existing admin credentials from settings table...');
    const settingsRes = await client.query(
      `SELECT key, value FROM settings WHERE key IN ('auth_username', 'auth_password')`
    );
    const settingsMap = settingsRes.rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});

    const existingAdminRes = await client.query(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);

    if (existingAdminRes.rows.length > 0) {
      log('Admin user already exists in users table — skipping migration.');
    } else if (settingsMap.auth_username && settingsMap.auth_password) {
      await client.query(
        `INSERT INTO users (username, password, display_name, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (username) DO NOTHING`,
        [settingsMap.auth_username, settingsMap.auth_password, 'Administrator']
      );
      ok(`Admin "${settingsMap.auth_username}" migrated to users table.`);
    } else {
      log('⚠️  No auth_username/auth_password found in settings. You will need to create an admin user manually.');
    }

    // ── Step 3: Log the migration ─────────────────────────────────────────
    step(3, 'Writing audit log entry...');
    await client.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['SYSTEM_MIGRATION', 'RBAC migration applied: users table created, admin credentials migrated']
    );
    ok('Audit log entry written.');

    await client.query('COMMIT');

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✅  RBAC MIGRATION COMPLETE                             ║');
    console.log('║                                                          ║');
    console.log('║   Next steps:                                            ║');
    console.log('║   1. Deploy updated server code                          ║');
    console.log('║   2. Deploy updated client code                          ║');
    console.log('║   3. Log in as admin and create additional users         ║');
    console.log('║      via Settings → User Management                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed — transaction rolled back.');
    console.error('   Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
};

main();