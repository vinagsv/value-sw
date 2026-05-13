import express from 'express';
import { createGatePass, getGatePasses, updateGatePass, deleteGatePass } from '../controllers/gatePassController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createGatePass);
router.get('/', getGatePasses);
router.put('/:id', updateGatePass);
router.delete('/:id', adminOnly, deleteGatePass); // Admin only

export default router;