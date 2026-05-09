import db from '../db/index.js';
import bcrypt from 'bcrypt';

export const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM settings');
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    
    // Do not send password hash to client
    delete settings.auth_password;
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const getNextBillNumber = async (req, res) => {
  try {
    const result = await db.query(`SELECT key, value FROM settings WHERE key IN ('bill_prefix', 'bill_counter')`);
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const prefix = settings.bill_prefix || '';
    const counter = String(settings.bill_counter || '1').padStart(4, '0');
    
    res.json({ 
      prefix, 
      counter,
      next_bill_no: `${prefix}${counter}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate next bill number' });
  }
};

export const getNextGatePassNumber = async (req, res) => {
  try {
    const result = await db.query(`SELECT key, value FROM settings WHERE key IN ('gate_pass_prefix', 'gate_pass_counter')`);
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const prefix = settings.gate_pass_prefix || '';
    const counter = String(settings.gate_pass_counter || '1').padStart(4, '0');
    
    res.json({ 
      prefix, 
      counter,
      next_gate_pass_no: `${prefix}${counter}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate next gate pass number' });
  }
};

export const updateSettings = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      // BUG FIX: Ignore the password key completely if the admin left it blank.
      // Previously, this overwrote the password hash with an empty string!
      if (key === 'auth_password' && !value) {
        continue;
      }

      let finalValue = value;
      
      if (key === 'auth_password' && value) {
        finalValue = await bcrypt.hash(value, 10);
      }
      
      // Update or insert setting
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, finalValue]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Settings Error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  } finally {
    client.release();
  }
};