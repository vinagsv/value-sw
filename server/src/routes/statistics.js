import express from 'express';
import { getDashboardStats, getAuditLogs } from '../controllers/statisticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard', getDashboardStats);

// NEW: Audit logs endpoint (paginated)
router.get('/audit-logs', getAuditLogs);

export default router;