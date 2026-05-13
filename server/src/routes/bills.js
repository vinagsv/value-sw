import express from 'express';
import { createBill, getBills, cancelBill, uncancelBill, deleteBill, bulkDeleteBills, updateBill } from '../controllers/billController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createBill);
router.get('/', getBills);
router.post('/bulk-delete', adminOnly, bulkDeleteBills);   // Admin only
router.put('/:id', updateBill);
router.put('/:id/cancel', cancelBill);
router.put('/:id/uncancel', adminOnly, uncancelBill);      // Admin only
router.delete('/:id', adminOnly, deleteBill);              // Admin only

export default router;