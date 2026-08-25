import express from 'express';
import { getGroups, getGroupById, syncGroups } from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getGroups);
router.route('/sync').post(syncGroups);
router.route('/:id').get(protect, getGroupById);

export default router;
