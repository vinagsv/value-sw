import express from 'express';
import { getSettings, getNextBillNumber, getNextGatePassNumber, updateSettings } from '../controllers/settingsController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', adminOnly, updateSettings);                  // Admin only
router.get('/next-bill-no', getNextBillNumber);
router.get('/next-gatepass-no', getNextGatePassNumber);

export default router;