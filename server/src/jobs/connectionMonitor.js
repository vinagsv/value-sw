import db from '../db/index.js';

/**
 * Continuously pings the database to ensure the connection is alive.
 * @param {number} intervalMs - How often to check in milliseconds (Changed default to 30 seconds)
 */
const startConnectionMonitor = (intervalMs = 30000) => {
  console.log(`🔍 Database monitor started. Checking connection every ${intervalMs / 1000} seconds...`);

  setInterval(async () => {
    try {
      // A lightweight query to check if the database responds
      await db.query('SELECT 1');
      
      // FIX: Uncommented the success log so it actually provides visual feedback
      console.log(`✅ [${new Date().toLocaleTimeString()}] DB Heartbeat: OK`);
      
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleTimeString()}] DB Health Check FAILED! Lost connection to database.`);
      console.error(`   Error details: ${error.message}`);
    }
  }, intervalMs);
};

export default startConnectionMonitor;