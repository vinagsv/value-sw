import express from 'express';
import { getSettings, getNextBillNumber, getNextGatePassNumber, updateSettings } from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/next-bill-no', getNextBillNumber);
router.get('/next-gatepass-no', getNextGatePassNumber);

export default router;