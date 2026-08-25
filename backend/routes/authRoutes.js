import express from 'express';
import { loginUser, registerUser, getUsers, updateUser, deleteUser, requestWithdrawal, approveWithdrawal } from '../controllers/authController.js';
import { protect, isTrustee, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', protect, isTrustee, registerUser); // Admin/superadmin-only registration

router.get('/users', protect, getUsers); // superadmin: all; admin: own group; member: self
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

// Withdrawal flow
router.post('/me/withdraw', protect, requestWithdrawal);           // member requests withdrawal
router.put('/users/:id/approve-withdrawal', protect, approveWithdrawal); // admin releases

export default router;
