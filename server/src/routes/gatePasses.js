import express from 'express';
import { createGatePass, getGatePasses, updateGatePass, deleteGatePass } from '../controllers/gatePassController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createGatePass);
router.get('/', getGatePasses);
router.put('/:id', updateGatePass);
router.delete('/:id', deleteGatePass);

export default router;