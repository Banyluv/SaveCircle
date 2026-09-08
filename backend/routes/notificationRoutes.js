import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    getNotifications,
    getUnreadCount,
    markAllRead,
    markOneRead
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require an authenticated user
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.patch('/read-all', protect, markAllRead);
router.patch('/:id/read', protect, markOneRead);

export default router;
