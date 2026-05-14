import express from 'express';
import { getDashboardStats, getSalesByItem, getAuditLogs } from '../controllers/statisticsController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard',      getDashboardStats);           // All users
router.get('/sales-by-item',  getSalesByItem);              // All users — new report
router.get('/audit-logs',     adminOnly, getAuditLogs);     // Admin only

export default router;