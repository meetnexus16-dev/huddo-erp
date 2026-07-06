import express from 'express';
import {
  getMyCityManagers,
  getMyRetailers,
  getMyStateManagers,
  getMyTerritoryTeam
} from '../controllers/managerTeamController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/me/team', verifyJWT, getMyTerritoryTeam);
router.get('/me/state-managers', verifyJWT, getMyStateManagers);
router.get('/me/city-managers', verifyJWT, getMyCityManagers);
router.get('/me/retailers', verifyJWT, getMyRetailers);

export default router;
