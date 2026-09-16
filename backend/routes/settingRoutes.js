import express from 'express';
import { getCentralAccount, updateCentralAccount } from '../controllers/settingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Any signed-in user may read where to pay; only superadmin may change it
// (enforced inside the controller).
router.route('/central-account')
    .get(protect, getCentralAccount)
    .put(protect, updateCentralAccount);

export default router;
