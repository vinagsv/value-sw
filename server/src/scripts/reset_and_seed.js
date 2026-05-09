/**
 * ============================================================
 *  FULL DATABASE RESET + SEED SCRIPT
 *  Value Motor Agency — Billing System
 * ============================================================
 *  ⚠️  WARNING: This script PERMANENTLY deletes ALL data.
 *  Usage: node src/scripts/reset_and_seed.js
 * ============================================================
 */

import pkg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ADMIN_USERNAME = 'admin@value.com';
const ADMIN_PASSWORD = 'Value12*';

const log  = (msg) => console.log(`   ${msg}`);
const step = (n, msg) => console.log(`\n${n}️⃣  ${msg}`);
const ok   = (msg) => console.log(`   ✅ ${msg}`);

const dropAllTables = async (client) => {
  step(1, 'Dropping all existing tables...');
  // BUG FIX: gate_passes was missing from the DROP list, causing FK issues on re-seed
  await client.query(`
    DROP TABLE IF EXISTS
      audit_logs,
      external_bill_entries,
      external_bill_types,
      bill_line_items,
      gate_passes,
      bills,
      items,
      settings
    CASCADE;
  `);
  ok('All tables dropped.');
};

const createTables = async (client) => {
  step(2, 'Creating tables...');

  await client.query(`
    CREATE TABLE settings (
      key   VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  log('settings ✔');

  await client.query(`
    CREATE TABLE items (
      id                   SERIAL PRIMARY KEY,
      item_id              VARCHAR(100) UNIQUE NOT NULL,
      item_name            VARCHAR(255) NOT NULL,
      hsn_sac              VARCHAR(50),
      quantity_applicable  VARCHAR(10)  DEFAULT 'No',
      available_quantity   NUMERIC(10,2) DEFAULT 0,
      description          TEXT,
      rate                 VARCHAR(50)  DEFAULT '0',
      taxable              BOOLEAN      DEFAULT TRUE,
      product_type         VARCHAR(50)  DEFAULT 'goods',
      intra_state_tax_name VARCHAR(100),
      intra_state_tax_rate NUMERIC(5,2) DEFAULT 0,
      inter_state_tax_name VARCHAR(100),
      inter_state_tax_rate NUMERIC(5,2) DEFAULT 0,
      status               VARCHAR(50)  DEFAULT 'Active',
      created_at           TIMESTAMP    DEFAULT NOW()
    );
  `);
  log('items ✔');

  await client.query(`
    CREATE TABLE bills (
      id               SERIAL PRIMARY KEY,
      bill_no          VARCHAR(50) UNIQUE NOT NULL,
      date             DATE        NOT NULL,
      customer_name    VARCHAR(255) NOT NULL,
      customer_mobile  VARCHAR(20),
      customer_gstin   VARCHAR(15),
      is_interstate    BOOLEAN     NOT NULL DEFAULT false,
      job_card_no      VARCHAR(100),
      vehicle_reg_no   VARCHAR(50),
      narration        TEXT,
      discount_percent NUMERIC(5,2)  DEFAULT 0,
      discount_amount  NUMERIC(10,2) DEFAULT 0,
      subtotal         NUMERIC(10,2) NOT NULL,
      total_tax        NUMERIC(10,2) NOT NULL,
      grand_total      NUMERIC(10,2) NOT NULL,
      status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
      created_at       TIMESTAMP    DEFAULT NOW()
    );
  `);
  log('bills ✔');

  await client.query(`
    CREATE TABLE bill_line_items (
      id               SERIAL PRIMARY KEY,
      bill_id          INTEGER REFERENCES bills(id) ON DELETE CASCADE,
      item_id          INTEGER REFERENCES items(id) ON DELETE SET NULL,
      item_name        VARCHAR(255) NOT NULL,
      hsn_code         VARCHAR(20),
      tax_rate         NUMERIC(5,2)  NOT NULL,
      custom_rate      NUMERIC(10,2) NOT NULL,
      qty              NUMERIC(10,2),
      discount_percent NUMERIC(5,2)  DEFAULT 0,
      taxable_value    NUMERIC(10,2) NOT NULL,
      cgst_amt         NUMERIC(10,2) DEFAULT 0,
      sgst_amt         NUMERIC(10,2) DEFAULT 0,
      igst_amt         NUMERIC(10,2) DEFAULT 0,
      line_total       NUMERIC(10,2) NOT NULL
    );
  `);
  log('bill_line_items ✔');

  await client.query(`
    CREATE TABLE external_bill_types (
      id        SERIAL PRIMARY KEY,
      name      VARCHAR(100) NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true
    );
  `);
  log('external_bill_types ✔');

  await client.query(`
    CREATE TABLE external_bill_entries (
      id         SERIAL PRIMARY KEY,
      bill_id    INTEGER REFERENCES bills(id) ON DELETE CASCADE,
      type_id    INTEGER REFERENCES external_bill_types(id),
      ref_number VARCHAR(100),
      amount     NUMERIC(10,2) NOT NULL
    );
  `);
  log('external_bill_entries ✔');

  await client.query(`
    CREATE TABLE audit_logs (
      id         SERIAL PRIMARY KEY,
      action     VARCHAR(100) NOT NULL,
      details    TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  log('audit_logs ✔');

  // BUG FIX: gate_passes table was completely missing from this reset script
  await client.query(`
    CREATE TABLE gate_passes (
      id             SERIAL PRIMARY KEY,
      gate_pass_no   VARCHAR(50) UNIQUE NOT NULL,
      date           DATE NOT NULL,
      customer_name  VARCHAR(255) NOT NULL,
      customer_mobile VARCHAR(20),
      vehicle_reg_no VARCHAR(50),
      ref_bill_no    VARCHAR(50),
      ref_bill_id    INTEGER REFERENCES bills(id) ON DELETE SET NULL,
      created_at     TIMESTAMP DEFAULT NOW()
    );
  `);
  log('gate_passes ✔');

  ok('All tables created.');
};

const seedSettings = async (client, hashedPassword) => {
  step(3, 'Seeding settings...');
  await client.query(`
    INSERT INTO settings (key, value) VALUES
      ('auth_username',    $1),
      ('auth_password',    $2),
      ('bill_prefix',      'VMA/26/'),
      ('bill_counter',     '1'),
      ('gate_pass_prefix', 'GP/26/'),
      ('gate_pass_counter','1'),
      ('company_name',     'VALUE MOTOR AGENCY PVT LTD'),
      ('company_address',  '#16/A, MILLERS ROAD, VASANTH NAGAR, BANGALORE - 52'),
      ('company_gstin',    '29AACCV2521J1ZA'),
      ('company_phone',    '9845906084'),
      ('company_email',    'millers_road_suzuki@yahoo.com');
  `, [ADMIN_USERNAME, hashedPassword]);
  ok(`Settings seeded. Admin login → username: "${ADMIN_USERNAME}"  password: "${ADMIN_PASSWORD}"`);
};

const seedExternalBillTypes = async (client) => {
  step(4, 'Seeding external bill types...');
  await client.query(`
    INSERT INTO external_bill_types (name, is_active) VALUES
      ('CSI Bill', true),
      ('BC Bill',  true);
  `);
  ok('External bill types seeded (CSI Bill, BC Bill).');
};

const seedItems = async (client) => {
  step(5, 'Seeding inventory items...');

  const items = [
    ['1017418000000015228', 'CONSUMOBILES', '27101998', 'No', null, null, '178.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000016030', 'GEAR BOX OIL', '40169390', 'Yes', 12, null, '93.22', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000035076', '3 M ENGINE OIL PLUS 50ML', '526352', 'Yes', 12, null, '169.50', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311028', 'GENERAL SERVICE (Shampoo wash periodic Service)', null, 'Yes', 12, null, '450.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311037', 'Engine Sprocket', null, 'Yes', 12, null, '375.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311046', 'Drive Chain', null, 'Yes', 12, null, '623.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311055', 'Rear Sprocket', null, 'Yes', 12, null, '356.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311064', 'Front Master Cylinder Assy OH', null, 'Yes', 12, null, '276.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311073', 'wheel Rim replacement', null, 'Yes', 12, null, '450.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311082', 'Fork, Bracket Under & Upper bend removal', null, 'Yes', 12, null, '450.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311091', 'Rear Swinging Arm /Swing Arm Bush', null, 'Yes', 12, null, '386.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311100', 'Throttle Cable Assy', null, 'Yes', 12, null, '186.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311109', 'Clutch Cable Assy', null, 'Yes', 12, null, '180.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000311118', 'Other Outside Charges', null, 'No', null, null, '850.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000310189', 'TYRE MICHELIN  110/80-17', null, 'Yes', 12, null, '3550.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000379967', 'FRONT BUMPER', null, 'Yes', 12, null, '400.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000807029', 'EXIDE BATTERY 7LB', null, 'Yes', 12, null, '450.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000807038', 'FOOT REST', null, 'Yes', 12, null, '430.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000841031', 'SEAT COVER', null, 'Yes', 12, null, '280.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000000930009', 'STEPPING MOTOR', '87141090', 'Yes', 12, null, '1306.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001027071', 'CLUTCH OVERALL', null, 'Yes', 12, null, '230.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001205047', 'FRONT TYRE GIXXERER MRF', null, 'Yes', 12, null, '3500.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001343001', 'TANK CLINE', null, 'Yes', 12, null, '450.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001449041', 'NUMBER PLATE CLAMP', null, 'Yes', 12, null, '127.00', true, 'service', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001450001', 'CARBERATOR OVER ALL', null, 'Yes', 12, null, '250.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001450010', 'ENGINE OIL CHANGE LABOUR', null, 'No', null, null, '42.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001610063', 'CHROME MIRROR', null, 'Yes', 12, null, '500.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000001612081', 'WIRING SOLDRING', null, 'No', null, null, '1800.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000002692045', 'TEFLON COATING', null, 'No', null, null, '450.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000003234408', 'Extra Fitting Access', '871410', 'Yes', 12, 'All Round Guard', '2119.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000003857255', 'GRIP COVER', '123456', 'Yes', 12, null, '84.50', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000004003093', 'NUMBER PLATE BEEDING', '85319000', 'Yes', 12, null, '169.49', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000004008033', 'BUZZER', '123456', 'Yes', 12, null, '85.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000004026081', 'Extra Fitting Avenis', '871410', 'Yes', 12, 'All Round Guard', '2966.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000004026136', 'Extra Fitting Burgman', '871410', 'Yes', 12, 'All Round Guard', '2966.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000004522053', 'CLEANING CLOTH', '63071010', 'Yes', 12, null, '221.90', true, 'goods', 'GST5', 5, 'IGST5', 5, 'Active'],
    ['1017418000005174003', 'FRONT TYRE', '123456', 'Yes', 12, null, '1568.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000005174060', 'REAR TYRE', '123456', 'Yes', 12, null, '1483.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active'],
    ['1017418000005257037', 'BODY COVER', '123456', 'Yes', 12, null, '550.00', true, 'goods', 'GST18', 18, 'IGST18', 18, 'Active']
  ];

  let inserted = 0;
  for (const row of items) {
    await client.query(
      `INSERT INTO items (
        item_id, item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
        taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
        inter_state_tax_name, inter_state_tax_rate, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      row
    );
    inserted++;
  }

  await client.query(
    `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
    ['BULK_IMPORT_INVENTORY', `Database seed: ${inserted} items loaded from hardcoded array`]
  );

  ok(`${inserted} items successfully seeded.`);
};

const main = async () => {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   VALUE MOTOR AGENCY — Full Database Reset & Seed        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n⚠️  This will PERMANENTLY DELETE all existing data.\n');

  let client;
  try {
    client = await pool.connect();
    console.log('🔌 Connected to database.');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await client.query('BEGIN');

    await dropAllTables(client);
    await createTables(client);
    await seedSettings(client, hashedPassword);
    await seedExternalBillTypes(client);
    await seedItems(client);

    await client.query('COMMIT');

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✅  DATABASE RESET & SEED COMPLETE                     ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║   Username : ${ADMIN_USERNAME.padEnd(44)} ║`);
    console.log(`║   Password : ${ADMIN_PASSWORD.padEnd(44)} ║`);
    console.log('║   Bills    : 0 (clean slate)                             ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('\n❌ Reset failed — transaction rolled back.');
    console.error('   Error:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
};

main();