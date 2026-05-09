import db from '../db/index.js';

/**
 * Automatically deletes bills > 5 years old and audit logs > 2 years old.
 */
const autoCleanup = async () => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Clean up Bills (5 Years)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const billCutoffDate = fiveYearsAgo.toISOString().split('T')[0];

    const billResult = await client.query(
      `DELETE FROM bills WHERE date < $1 RETURNING id`,
      [billCutoffDate]
    );

    // 2. Clean up Audit Logs (2 Years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const logCutoffDate = twoYearsAgo.toISOString().split('T')[0];

    const logResult = await client.query(
      `DELETE FROM audit_logs WHERE created_at < $1 RETURNING id`,
      [logCutoffDate]
    );

    await client.query('COMMIT');
    console.log(`Auto-cleanup complete: Deleted ${billResult.rowCount} old bills, ${logResult.rowCount} old audit logs.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Auto-cleanup failed:', error);
  } finally {
    client.release();
  }
};

export default autoCleanup;