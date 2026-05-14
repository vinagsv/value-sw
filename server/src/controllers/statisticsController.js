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

// ── NEW: Sales by Item report with full date range support ───────────────────
// Supports: period (day/week/month) OR custom fromDate + toDate
export const getSalesByItem = async (req, res) => {
  try {
    const { period, fromDate, toDate } = req.query;

    let startDate, endDate;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (fromDate && toDate) {
      // Custom date range takes priority
      startDate = fromDate;
      endDate = toDate;
    } else {
      // Period-based
      endDate = todayStr;
      if (period === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6); // inclusive of today → last 7 days
        startDate = d.toISOString().split('T')[0];
      } else if (period === 'month') {
        const d = new Date(now);
        d.setDate(1); // first day of current month
        startDate = d.toISOString().split('T')[0];
      } else {
        // 'day' = today only
        startDate = todayStr;
      }
    }

    // Main sales-by-item query
    const result = await db.query(
      `SELECT 
        i.item_name AS item_name,
        SUM(bli.qty)        AS quantity_sold,
        SUM(bli.line_total) AS amount,
        CASE 
          WHEN SUM(bli.qty) > 0 
          THEN ROUND(SUM(bli.taxable_value) / SUM(bli.qty), 2)
          ELSE 0
        END AS average_price
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

    // Totals
    const totals = result.rows.reduce(
      (acc, row) => {
        acc.total_qty    += Number(row.quantity_sold);
        acc.total_amount += Number(row.amount);
        return acc;
      },
      { total_qty: 0, total_amount: 0 }
    );

    res.json({
      rows: result.rows,
      totals,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Sales By Item Error:', error);
    res.status(500).json({ error: 'Failed to fetch sales by item report' });
  }
};

// ── Paginated audit logs ─────────────────────────────────────────────────────
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