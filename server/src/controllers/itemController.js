import db from '../db/index.js';

export const getItems = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM items`;
    const params = [];

    if (search) {
      query += ` WHERE item_name ILIKE $1 OR item_id ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY item_name ASC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createItem = async (req, res, next) => {
  try {
    const {
      item_id, item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
      taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
      inter_state_tax_name, inter_state_tax_rate, status
    } = req.body;

    // REMOVED intra_state_tax_type from the query
    const result = await db.query(
      `INSERT INTO items (
        item_id, item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
        taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
        inter_state_tax_name, inter_state_tax_rate, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        item_id, item_name, hsn_sac || '',
        quantity_applicable || 'No',
        available_quantity || 0,
        description || '',
        rate || '0',
        taxable !== undefined ? taxable : true,
        product_type || 'goods',
        intra_state_tax_name || '',
        intra_state_tax_rate || 0,
        inter_state_tax_name || '',
        inter_state_tax_rate || 0,
        status || 'Active'
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      item_name, hsn_sac, quantity_applicable, available_quantity, description, rate,
      taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
      inter_state_tax_name, inter_state_tax_rate, status
    } = req.body;

    const oldItemQuery = await db.query(`SELECT item_id, available_quantity FROM items WHERE id = $1`, [id]);
    if (oldItemQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const oldStock = Number(oldItemQuery.rows[0].available_quantity);
    const newStock = Number(available_quantity);
    const itemCode = oldItemQuery.rows[0].item_id;

    // REMOVED intra_state_tax_type from the update query
    const result = await db.query(
      `UPDATE items 
       SET item_name=$1, hsn_sac=$2, quantity_applicable=$3, available_quantity=$4, description=$5,
           rate=$6, taxable=$7, product_type=$8, intra_state_tax_name=$9, intra_state_tax_rate=$10,
           inter_state_tax_name=$11, inter_state_tax_rate=$12, status=$13
       WHERE id=$14 RETURNING *`,
      [
        item_name, hsn_sac, quantity_applicable, available_quantity, description,
        rate, taxable, product_type, intra_state_tax_name, intra_state_tax_rate,
        inter_state_tax_name, inter_state_tax_rate, status, id
      ]
    );

    if (oldStock !== newStock) {
      await db.query(
        `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
        ['INVENTORY_ADJUSTMENT', `Admin manually adjusted stock for ${itemCode} from ${oldStock} to ${newStock}`]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

export const deleteItem = async (req, res, next) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    const itemQuery = await client.query(`SELECT item_id, item_name FROM items WHERE id = $1`, [id]);
    if (itemQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemQuery.rows[0];
    await client.query(`DELETE FROM items WHERE id = $1`, [id]);
    await client.query(
      `INSERT INTO audit_logs (action, details) VALUES ($1, $2)`,
      ['DELETE_INVENTORY_ITEM', `Admin deleted inventory item: ${item.item_id} (${item.item_name})`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23503') {
      res.status(400).json({ error: 'Cannot delete item: It is already used in existing bills. Please mark it as Inactive instead.' });
    } else {
      next(error);
    }
  } finally {
    client.release();
  }
};