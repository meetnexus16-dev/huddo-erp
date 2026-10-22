import express from 'express';
import { 
  getAllCityManagers, 
  recordCityManagerReview 
} from '../controllers/stateManagerController.js';
import { verifyJWT, optionalVerifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Founder / Admin Operations routes
router.get('/', optionalVerifyJWT, getAllCityManagers);
router.post('/review', verifyJWT, recordCityManagerReview);

export default router;
