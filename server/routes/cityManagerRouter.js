import express from 'express';
import { 
  getAllCityManagers, 
  recordCityManagerReview 
} from '../controllers/stateManagerController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Founder / Admin Operations routes
router.get('/', verifyJWT, getAllCityManagers);
router.post('/review', verifyJWT, recordCityManagerReview);

export default router;
