import db from '../db/index.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { period } = req.query;

    let cutoffDate;
    const now = new Date();

    if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      cutoffDate = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      cutoffDate = d.toISOString().split('T')[0];
    } else {
      cutoffDate = now.toISOString().split('T')[0];
    }

    const billStats = await db.query(
      `SELECT 
        COUNT(id) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_revenue
      FROM bills 
      WHERE date >= $1 AND status = 'ACTIVE'`,
      [cutoffDate]
    );

    const itemStats = await db.query(
      `SELECT 
        i.item_name AS name, 
        SUM(bli.qty) as total_qty_sold,
        SUM(bli.line_total) as total_revenue
      FROM bill_line_items bli
      JOIN bills b ON bli.bill_id = b.id
      JOIN items i ON bli.item_id = i.id
      WHERE b.date >= $1 AND b.status = 'ACTIVE'
      GROUP BY i.id, i.item_name
      ORDER BY total_qty_sold DESC
      LIMIT 10`,
      [cutoffDate]
    );

    const externalStats = await db.query(
      `SELECT 
        t.name,
        COUNT(e.id) as count,
        COALESCE(SUM(e.amount), 0) as total_amount
      FROM external_bill_entries e
      JOIN bills b ON e.bill_id = b.id
      JOIN external_bill_types t ON e.type_id = t.id
      WHERE b.date >= $1 AND b.status = 'ACTIVE'
      GROUP BY t.id, t.name`,
      [cutoffDate]
    );

    res.json({
      summary: billStats.rows[0],
      topItems: itemStats.rows,
      externalBreakdown: externalStats.rows,
    });
  } catch (error) {
    console.error('Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// ── Sales by Item report ──────────────────────────────────────────────────────
// Returns per-item: quantity, totals and per-unit prices both excl. and incl. GST
// Per-unit incl. GST and avg selling price are rounded to nearest whole rupee.
export const getSalesByItem = async (req, res) => {
  try {
    const { period, fromDate, toDate } = req.query;

    let startDate, endDate;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (fromDate && toDate) {
      startDate = fromDate;
      endDate   = toDate;
    } else {
      endDate = todayStr;
      if (period === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        startDate = d.toISOString().split('T')[0];
      } else if (period === 'month') {
        const d = new Date(now);
        d.setDate(1);
        startDate = d.toISOString().split('T')[0];
      } else {
        startDate = todayStr;
      }
    }

    const result = await db.query(
      `SELECT 
        i.item_name                            AS item_name,
        SUM(bli.qty)                           AS quantity_sold,

        -- Totals
        SUM(bli.taxable_value)                 AS total_excl_gst,
        SUM(bli.line_total)                    AS total_incl_gst,

        -- Per-unit excl. GST: keep 2dp (used as tax calculation base)
        CASE WHEN SUM(bli.qty) > 0
          THEN ROUND(SUM(bli.taxable_value) / SUM(bli.qty), 2)
          ELSE 0 END                           AS unit_price_excl_gst,

        -- Per-unit incl. GST: rounded to whole rupee (consumer selling price)
        CASE WHEN SUM(bli.qty) > 0
          THEN ROUND(SUM(bli.line_total) / SUM(bli.qty))
          ELSE 0 END                           AS unit_price_incl_gst,

        -- Average selling price incl. GST: whole rupee
        -- Reflects actual average final price paid per unit (accounts for discounts)
        CASE WHEN SUM(bli.qty) > 0
          THEN ROUND(SUM(bli.line_total) / SUM(bli.qty))
          ELSE 0 END                           AS avg_price_incl_gst

      FROM bill_line_items bli
      JOIN bills b ON bli.bill_id = b.id
      JOIN items i ON bli.item_id = i.id
      WHERE b.date >= $1
        AND b.date <= $2
        AND b.status = 'ACTIVE'
      GROUP BY i.id, i.item_name
      ORDER BY SUM(bli.qty) DESC`,
      [startDate, endDate]
    );

    const totals = result.rows.reduce(
      (acc, row) => {
        acc.total_qty      += Number(row.quantity_sold);
        acc.total_excl_gst += Number(row.total_excl_gst);
        acc.total_incl_gst += Number(row.total_incl_gst);
        return acc;
      },
      { total_qty: 0, total_excl_gst: 0, total_incl_gst: 0 }
    );

    res.json({ rows: result.rows, totals, startDate, endDate });
  } catch (error) {
    console.error('Sales By Item Error:', error);
    res.status(500).json({ error: 'Failed to fetch sales by item report' });
  }
};

// ── Paginated audit logs ──────────────────────────────────────────────────────
export const getAuditLogs = async (req, res) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page  || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset   = (page - 1) * pageSize;
    const search   = req.query.search || '';

    let whereClause = '';
    const params = [];

    if (search) {
      whereClause = `WHERE action ILIKE $1 OR details ILIKE $1`;
      params.push(`%${search}%`);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const dataParams = [...params, pageSize, offset];
    const searchParamCount = params.length;

    const logsResult = await db.query(
      `SELECT id, action, details, created_at
       FROM audit_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${searchParamCount + 1} OFFSET $${searchParamCount + 2}`,
      dataParams
    );

    res.json({
      logs: logsResult.rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Audit Logs Error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};