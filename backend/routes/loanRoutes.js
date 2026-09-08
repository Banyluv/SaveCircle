import express from 'express';
import { protect, isTrustee } from '../middleware/authMiddleware.js';
import {
    calculate,
    getAmortizationSchedule,
    getLoanProducts,
    createLoanProduct,
    applyForLoan,
    getMyLoans,
    getLoanDetails,
    getDashboardStats,
    getAllApplications,
    getBorrowers,
    reviewLoan,
    getAdminStats,
    submitRepayment,
    verifyRepayment
} from '../controllers/loanController.js';

const router = express.Router();

// ─── Public / calculator ─────────────────────────────────────────────────────
router.post('/calculate', calculate);
router.get('/amortization', getAmortizationSchedule);

// ─── Loan products ───────────────────────────────────────────────────────────
router.get('/products', getLoanProducts);                                  // public read
router.post('/products', protect, isTrustee, createLoanProduct);            // admin creates

// ─── Borrower routes (any authenticated user can borrow) ─────────────────────
router.get('/dashboard', protect, getDashboardStats);
router.post('/apply', protect, applyForLoan);
router.get('/mine', protect, getMyLoans);

// ─── Admin routes ────────────────────────────────────────────────────────────
router.get('/admin', protect, isTrustee, getAllApplications);
router.get('/admin/stats', protect, isTrustee, getAdminStats);
router.get('/borrowers', protect, isTrustee, getBorrowers);   // registered individual/cooperative borrowers
router.patch('/admin/:id/review', protect, isTrustee, reviewLoan);

// ─── Repayments ──────────────────────────────────────────────────────────────
router.post('/:id/repay', protect, submitRepayment);       // borrower submits
router.put('/repayments/:rid/verify', protect, isTrustee, verifyRepayment); // admin verifies

// ─── Loan detail (must come after all specific /:xxx routes) ─────────────────
router.get('/:id', protect, getLoanDetails);

export default router;
