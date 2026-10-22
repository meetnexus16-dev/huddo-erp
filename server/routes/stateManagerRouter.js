import express from 'express';
import { 
  getMyCityManagers, 
  getAllStateManagers, 
  recordStateManagerReview 
} from '../controllers/stateManagerController.js';
import { verifyJWT, optionalVerifyJWT } from '../middleware/auth.js';

const router = express.Router();

// State Manager personal route
router.get('/me/city-managers', verifyJWT, getMyCityManagers);

// Founder / Admin Operations routes
router.get('/', optionalVerifyJWT, getAllStateManagers);
router.post('/review', verifyJWT, recordStateManagerReview);

export default router;
