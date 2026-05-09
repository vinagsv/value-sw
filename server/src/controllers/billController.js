import db from '../db/index.js';

export const createBill = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const {
      bill_no, date, customer_name, customer_mobile, customer_gstin, is_interstate, job_card_no, vehicle_reg_no,
      narration, discount_percent, discount_amount, subtotal, total_tax, grand_total,
      line_items, external_bills, include_gate_pass
    } = req.body;

    const billResult = await client.query(
      `INSERT INTO bills 
      (bill_no, date, customer_name, customer_mobile, customer_gstin, is_interstate, job_card_no, vehicle_reg_no, narration, discount_percent, discount_amount, subtotal, total_tax, grand_total) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [bill_no, date, customer_name, customer_mobile, customer_gstin, is_interstate, job_card_no, vehicle_reg_no, narration, discount_percent, discount_amount, subtotal, total_tax, grand_total]
    );
    const billId = billResult.rows[0].id;

    for (const item of line_items) {
      await client.query(
        `INSERT INTO bill_line_items 
        (bill_id, item_id, item_name, hsn_code, tax_rate, custom_rate, qty, discount_percent, taxable_value, cgst_amt, sgst_amt, igst_amt, line_total) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [billId, item.item_id, item.name, item.hsn_code, item.tax_rate, item.custom_rate, item.qty, item.discount_percent, item.taxable_value, item.cgst_amt, item.sgst_amt, item.igst_amt, item.line_total]
      );

      if (item.qty > 0) {
        await client.query(
          `UPDATE items SET available_quantity = available_quantity - $1 WHERE id = $2`,
          [item.qty, item.item_id]
        );
      }
    }

    if (external_bills && external_bills.length > 0) {
      for (const ext of external_bills) {
        await client.query(
          `INSERT INTO external_bill_entries (bill_id, type_id, ref_number, amount) VALUES ($1, $2, $3, $4)`,
          [billId, ext.type_id, ext.ref_number, ext.amount]
        );
      }
    }

    await client.query(
      `UPDATE settings SET value = (CAST(value AS INTEGER) + 1)::TEXT WHERE key = 'bill_counter'`
    );

    // Auto-generate Gate Pass if requested
    if (include_gate_pass) {
      // FIX: Atomic increment using RETURNING guarantees thread-safety
      const prefixRes = await client.query(`SELECT value FROM settings WHERE key = 'gate_pass_prefix'`);
      const prefix = prefixRes.rows[0]?.value || '';

      const counterUpdateRes = await client.query(`
        UPDATE settings 
        SET value = (CAST(value AS INTEGER) + 1)::TEXT 
        WHERE key = 'gate_pass_counter' 
        RETURNING value
      `);
      
      const newCounter = parseInt(counterUpdateRes.rows[0].value, 10);
      const counterStr = String(newCounter - 1).padStart(4, '0');
      const gpNo = `${prefix}${counterStr}`;

      await client.query(
        `INSERT INTO gate_passes (gate_pass_no, date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no, ref_bill_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [gpNo, date, customer_name, customer_mobile, vehicle_reg_no, bill_no, billId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, billId, billNo: bill_no, message: 'Bill created successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Bill Error:', error.message);
    
    // FIX: Catch the double-click duplicate constraint and return a friendly error
    if (error.code === '23505' && error.constraint === 'bills_bill_no_key') {
      return res.status(409).json({ 
        error: `Bill ${req.body.bill_no} already exists! If you clicked save twice, your bill was successfully saved.` 
      });
    }
    
    res.status(500).json({ error: 'Failed to create bill' });
  } finally {
    client.release();
  }
};

export const updateBill = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const {
      date, customer_name, customer_mobile, customer_gstin, is_interstate, job_card_no, vehicle_reg_no,
      narration, discount_percent, discount_amount, subtotal, total_tax, grand_total,
      line_items, external_bills, include_gate_pass, bill_no
    } = req.body;

    const statusRes = await client.query(`SELECT status FROM bills WHERE id = $1`, [id]);
    if (statusRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (statusRes.rows[0].status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot update a cancelled bill.' });
    }

    await client.query(
      `UPDATE bills 
       SET date=$1, customer_name=$2, customer_mobile=$3, customer_gstin=$4, is_interstate=$5, job_card_no=$6, 
           vehicle_reg_no=$7, narration=$8, discount_percent=$9, discount_amount=$10, 
           subtotal=$11, total_tax=$12, grand_total=$13
       WHERE id=$14`,
      [date, customer_name, customer_mobile, customer_gstin, is_interstate, job_card_no, vehicle_reg_no, narration, discount_percent, discount_amount, subtotal, total_tax, grand_total, id]
    );

    const oldItems = await client.query(`SELECT item_id, qty FROM bill_line_items WHERE bill_id = $1`, [id]);
    for (const item of oldItems.rows) {
      if (item.qty > 0) {
        await client.query(`UPDATE items SET available_quantity = available_quantity + $1 WHERE id = $2`, [item.qty, item.item_id]);
      }
    }
    
    await client.query(`DELETE FROM bill_line_items WHERE bill_id = $1`, [id]);
    await client.query(`DELETE FROM external_bill_entries WHERE bill_id = $1`, [id]);

    for (const item of line_items) {
      await client.query(
        `INSERT INTO bill_line_items 
        (bill_id, item_id, item_name, hsn_code, tax_rate, custom_rate, qty, discount_percent, taxable_value, cgst_amt, sgst_amt, igst_amt, line_total) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, item.item_id, item.name, item.hsn_code, item.tax_rate, item.custom_rate, item.qty, item.discount_percent, item.taxable_value, item.cgst_amt, item.sgst_amt, item.igst_amt, item.line_total]
      );
      if (item.qty > 0) {
        await client.query(`UPDATE items SET available_quantity = available_quantity - $1 WHERE id = $2`, [item.qty, item.item_id]);
      }
    }

    if (external_bills && external_bills.length > 0) {
      for (const ext of external_bills) {
        await client.query(
          `INSERT INTO external_bill_entries (bill_id, type_id, ref_number, amount) VALUES ($1, $2, $3, $4)`,
          [id, ext.type_id, ext.ref_number, ext.amount]
        );
      }
    }

    // Auto-generate Gate Pass if requested AND one doesn't already exist for this bill
    if (include_gate_pass) {
      const existingGp = await client.query(`SELECT id FROM gate_passes WHERE ref_bill_id = $1 LIMIT 1`, [id]);
      if (existingGp.rows.length === 0) {
        // FIX: Atomic increment using RETURNING guarantees thread-safety
        const prefixRes = await client.query(`SELECT value FROM settings WHERE key = 'gate_pass_prefix'`);
        const prefix = prefixRes.rows[0]?.value || '';

        const counterUpdateRes = await client.query(`
          UPDATE settings 
          SET value = (CAST(value AS INTEGER) + 1)::TEXT 
          WHERE key = 'gate_pass_counter' 
          RETURNING value
        `);
        
        const newCounter = parseInt(counterUpdateRes.rows[0].value, 10);
        const counterStr = String(newCounter - 1).padStart(4, '0');
        const gpNo = `${prefix}${counterStr}`;

        await client.query(
          `INSERT INTO gate_passes (gate_pass_no, date, customer_name, customer_mobile, vehicle_reg_no, ref_bill_no, ref_bill_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [gpNo, date, customer_name, customer_mobile, vehicle_reg_no, bill_no, id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ success: true, billNo: bill_no, message: 'Bill updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update Bill Error:', error.message);
    res.status(500).json({ error: 'Failed to update bill' });
  } finally {
    client.release();
  }
};

export const getBills = async (req, res) => {
  try {
    const { search, fromDate, toDate } = req.query;
    let query = `
      SELECT b.*,
        EXISTS(SELECT 1 FROM gate_passes gp WHERE gp.ref_bill_id = b.id) as has_gate_pass,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', li.id,
              'item_id', li.item_id,
              'name', li.item_name,
              'hsn_code', li.hsn_code,
              'qty', li.qty,
              'custom_rate', li.custom_rate,
              'tax_rate', li.tax_rate,
              'taxable_value', li.taxable_value,
              'cgst_amt', li.cgst_amt,
              'sgst_amt', li.sgst_amt,
              'igst_amt', li.igst_amt,
              'line_total', li.line_total
            )
          ) FROM bill_line_items li WHERE li.bill_id = b.id
        ), '[]'::json) as line_items,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', e.id,
              'type_id', e.type_id,
              'name', (SELECT name FROM external_bill_types t WHERE t.id = e.type_id),
              'ref_number', e.ref_number,
              'amount', e.amount
            )
          ) FROM external_bill_entries e WHERE e.bill_id = b.id
        ), '[]'::json) as external_bills
      FROM bills b
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (b.bill_no ILIKE $${paramIndex} OR b.customer_name ILIKE $${paramIndex} OR b.customer_mobile ILIKE $${paramIndex} OR b.vehicle_reg_no ILIKE $${paramIndex} OR b.job_card_no ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (fromDate && toDate) {
      query += ` AND b.date >= $${paramIndex} AND b.date <= $${paramIndex + 1}`;
      params.push(fromDate, toDate);
      paramIndex += 2;
    }

    query += ` ORDER BY b.created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Fetch Bills SQL Error:", error.message);
    res.status(500).json({ error: 'Failed to fetch bills', details: error.message });
  }
};

export const cancelBill = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const billQuery = await client.query(`SELECT status FROM bills WHERE id = $1`, [id]);
    if (billQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (billQuery.rows[0].status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bill is already cancelled.' });
    }

    const itemsResult = await client.query(`SELECT item_id, qty FROM bill_line_items WHERE bill_id = $1`, [id]);
    
    for (const item of itemsResult.rows) {
      if (item.qty > 0) {
        await client.query(
          `UPDATE items SET available_quantity = available_quantity + $1 WHERE id = $2`,
          [item.qty, item.item_id]
        );
      }
    }

    await client.query(`UPDATE bills SET status = 'CANCELLED' WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Bill cancelled and stock restored' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel bill' });
  } finally {
    client.release();
  }
};

export const uncancelBill = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const billQuery = await client.query(`SELECT status FROM bills WHERE id = $1`, [id]);
    if (billQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    if (billQuery.rows[0].status === 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bill is already active.' });
    }

    const itemsResult = await client.query(`SELECT item_id, qty FROM bill_line_items WHERE bill_id = $1`, [id]);
    
    for (const item of itemsResult.rows) {
      if (item.qty > 0) {
        await client.query(
          `UPDATE items SET available_quantity = available_quantity - $1 WHERE id = $2`,
          [item.qty, item.item_id]
        );
      }
    }

    await client.query(`UPDATE bills SET status = 'ACTIVE' WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Bill un-cancelled and stock deducted' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to un-cancel bill' });
  } finally {
    client.release();
  }
};

export const deleteBill = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const billQuery = await client.query(`SELECT status FROM bills WHERE id = $1`, [id]);
    if (billQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bill not found' });
    }
    const isCancelled = billQuery.rows[0].status === 'CANCELLED';

    if (!isCancelled) {
      const itemsResult = await client.query(`SELECT item_id, qty FROM bill_line_items WHERE bill_id = $1`, [id]);
      for (const item of itemsResult.rows) {
        if (item.qty > 0) {
          await client.query(
            `UPDATE items SET available_quantity = available_quantity + $1 WHERE id = $2`,
            [item.qty, item.item_id]
          );
        }
      }
    }

    await client.query(`DELETE FROM bills WHERE id = $1`, [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Bill deleted and stock logic preserved' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to delete bill' });
  } finally {
    client.release();
  }
};

export const bulkDeleteBills = async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { fromDate, toDate } = req.body; 

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'Please provide both fromDate and toDate' });
    }

    const itemsResult = await client.query(`
      SELECT bli.item_id, bli.qty 
      FROM bill_line_items bli
      JOIN bills b ON bli.bill_id = b.id
      WHERE b.date >= $1 AND b.date <= $2 AND b.status = 'ACTIVE'
    `, [fromDate, toDate]);
    
    for (const item of itemsResult.rows) {
      if (item.qty > 0) {
        await client.query(
          `UPDATE items SET available_quantity = available_quantity + $1 WHERE id = $2`,
          [item.qty, item.item_id]
        );
      }
    }

    const deleteResult = await client.query(
      `DELETE FROM bills WHERE date >= $1 AND date <= $2`,
      [fromDate, toDate]
    );

    await client.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['BULK_DELETE_BILLS', `Admin deleted ${deleteResult.rowCount} bills between ${fromDate} and ${toDate}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: `Successfully deleted ${deleteResult.rowCount} bills and restored stock for active ones.` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk Delete Error:', error);
    res.status(500).json({ error: 'Failed to bulk delete bills' });
  } finally {
    client.release();
  }
};