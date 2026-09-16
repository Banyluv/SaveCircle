import express from 'express';
import { getGroups, getGroupById, syncGroups } from '../controllers/groupController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getGroups);
// Was unauthenticated — anyone could overwrite every group. The controller now
// scopes writes to the caller's own group (superadmin may write all).
router.route('/sync').post(protect, syncGroups);
router.route('/:id').get(protect, getGroupById);

export default router;
