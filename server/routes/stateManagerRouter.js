import express from 'express';
import { getMyCityManagers } from '../controllers/stateManagerController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/city-managers', verifyJWT, getMyCityManagers);

export default router;
