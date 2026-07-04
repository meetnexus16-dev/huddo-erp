import express from 'express';
import {
  approveOnboardingUser,
  getOnboardingGeoOptions,
  getPendingOnboardingUsers,
  getReferralInfo,
  submitOnboarding,
  validateReferrerCode
} from '../controllers/onboardingController.js';
import { verifyJWT } from '../middleware/auth.js';
import { checkPermission } from '../middleware/rbac.js';

const router = express.Router();

router.get('/geo-options', getOnboardingGeoOptions);
router.get('/validate-referrer/:code', validateReferrerCode);
router.post('/submit', submitOnboarding);

router.get('/referral-info', verifyJWT, getReferralInfo);
router.get('/pending', verifyJWT, checkPermission('users', 'view'), getPendingOnboardingUsers);
router.post('/:id/approve', verifyJWT, checkPermission('users', 'approve'), approveOnboardingUser);

export default router;
