import db from '../db/index.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { period } = req.query; // 'day', 'week', 'month'

    // FIX: Previously used raw string interpolation directly in the SQL query body,
    // which is a SQL injection risk AND caused the 'day' filter to be wrong
    // (CURRENT_DATE alone is not a range check — bills FROM that date would need >= CURRENT_DATE).
    // Now we use a parameterized query with a computed cutoff date passed as $1.
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
      // 'day' — today only
      cutoffDate = now.toISOString().split('T')[0];
    }

    // 1. Bill totals and counts (excluding cancelled)
    const billStats = await db.query(
      `SELECT 
        COUNT(id) as total_bills,
        COALESCE(SUM(grand_total), 0) as total_revenue
      FROM bills 
      WHERE date >= $1 AND status = 'ACTIVE'`,
      [cutoffDate]
    );

    // 2. Items sold — FIX: was `i.name` (wrong column), correct is `i.item_name`
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

    // 3. External Bills breakdown
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

// NEW: Paginated audit logs endpoint
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

    // Add pagination params after optional search param
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