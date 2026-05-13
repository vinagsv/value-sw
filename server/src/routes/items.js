import express from 'express';
import { getItems, createItem, updateItem, deleteItem } from '../controllers/itemController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getItems);                       // All users can view
router.post('/', adminOnly, createItem);         // Admin only
router.put('/:id', adminOnly, updateItem);       // Admin only
router.delete('/:id', adminOnly, deleteItem);    // Admin only

export default router;