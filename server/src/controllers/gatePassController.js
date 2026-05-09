import db from '../db/index.js';

export const createGatePass = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { gate_pass_no, date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no } = req.body;

    const result = await client.query(
      `INSERT INTO gate_passes (gate_pass_no, date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [gate_pass_no, date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no || null]
    );

    await client.query(
      `UPDATE settings SET value = (CAST(value AS INTEGER) + 1)::TEXT WHERE key = 'gate_pass_counter'`
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, gatePass: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Gate Pass Error:', error.message);
    
    // FIX: Catch the double-click duplicate constraint and return a friendly error
    if (error.code === '23505' && error.constraint === 'gate_passes_gate_pass_no_key') {
      return res.status(409).json({ 
        error: `Gate Pass ${req.body.gate_pass_no} already exists! If you clicked twice, it is safely saved.` 
      });
    }

    res.status(500).json({ error: 'Failed to create gate pass' });
  } finally {
    client.release();
  }
};

export const updateGatePass = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no } = req.body;

    const result = await db.query(
      `UPDATE gate_passes 
       SET date=$1, customer_name=$2, customer_mobile=$3, vehicle_reg_no=$4, ref_bill_no=$5
       WHERE id=$6 RETURNING *`,
      [date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no || null, id]
    );

    res.json({ success: true, gatePass: result.rows[0] });
  } catch (error) {
    console.error('Update Gate Pass Error:', error);
    res.status(500).json({ error: 'Failed to update gate pass' });
  }
};

export const getGatePasses = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM gate_passes WHERE 1=1`;
    const params = [];

    if (search) {
      query += ` AND (gate_pass_no ILIKE $1 OR customer_name ILIKE $1 OR vehicle_reg_no ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Gate Passes Error:", error);
    res.status(500).json({ error: 'Failed to fetch gate passes' });
  }
};

export const deleteGatePass = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM gate_passes WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Gate pass deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete gate pass' });
  }
};