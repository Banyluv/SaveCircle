import express from 'express';
import { getLogs, syncLogs } from '../controllers/logController.js';

const router = express.Router();

router.route('/').get(getLogs);
router.route('/sync').post(syncLogs);

export default router;
