import express from 'express';
import { verifyJWT } from '../middleware/auth.js';
import {
  getManagerSlotStatus,
  previewGeoCreation,
  searchWorldCities,
  searchWorldCountries,
  searchWorldStates
} from '../controllers/geoController.js';

const router = express.Router();

router.get('/world/countries', searchWorldCountries);
router.get('/world/states', searchWorldStates);
router.get('/world/cities', searchWorldCities);
router.get('/manager-slot', getManagerSlotStatus);
router.post('/preview', verifyJWT, previewGeoCreation);

export default router;
