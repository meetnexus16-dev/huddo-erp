import express from 'express';
import {
  getCommissionFilterOptions,
  getMyCommissions,
  getMyReferrals,
  getNetworkOrders,
  getNetworkUsers,
  getOrderCommissionBreakdown
} from '../controllers/networkController.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/users', verifyJWT, getNetworkUsers);
router.get('/referrals', verifyJWT, getMyReferrals);
router.get('/orders', verifyJWT, getNetworkOrders);
router.get('/commissions/filter-options', verifyJWT, getCommissionFilterOptions);
router.get('/commissions', verifyJWT, getMyCommissions);
router.get('/orders/:orderId/commission-breakdown', verifyJWT, getOrderCommissionBreakdown);

export default router;
