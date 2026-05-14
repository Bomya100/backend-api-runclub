import express from 'express';
import { createRun, getRuns, analyzeHalfMarathon,getMonthlyStats } from '../controllers/runController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateReport } from '../controllers/runController.js';
const router = express.Router();

// จับคู่ URL กับฟังก์ชันใน Controller
router.get('/analysis',protect, analyzeHalfMarathon); 
router.route('/')
  .get(protect,getRuns)
  .post(protect,createRun);

router.get('/stats', protect, getMonthlyStats);
router.get('/report', protect, generateReport);  
export default router;