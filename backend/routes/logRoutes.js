import express from 'express';
import { getLogs, syncLogs } from '../controllers/logController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Both routes were previously unauthenticated, which let anyone read the whole
// platform's audit trail and overwrite it. They now require a token, and each
// controller narrows the data to the caller's own group.
router.route('/').get(protect, getLogs);
router.route('/sync').post(protect, syncLogs);

export default router;
