import express from 'express';
import { createBill, getBills, cancelBill, uncancelBill, deleteBill, bulkDeleteBills, updateBill } from '../controllers/billController.js';
// import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Apply auth middleware to all routes if required: router.use(protect);

router.post('/', createBill);
router.get('/', getBills);
router.post('/bulk-delete', bulkDeleteBills); 
router.put('/:id', updateBill); 
router.put('/:id/cancel', cancelBill);
router.put('/:id/uncancel', uncancelBill); 
router.delete('/:id', deleteBill);

export default router;