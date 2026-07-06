import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Promoter from '../models/Promoter.js';
import Retailer from '../models/Retailer.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import { verifyJWT } from '../middleware/auth.js';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials.js';
import {
  REVENUE_ORDER_STATUSES,
  orderRevenue,
  commissionAmount,
  getCurrentMonthRange,
  derivePaymentStatus,
  getVerificationStatus,
  enrichPromoterRow,
  buildMonthlyNewPromoters,
  buildCityWiseDistribution,
  buildPromoterDashboard,
  getPromoterOrderRevenue,
  getPromoterRoyaltyStats,
  getRetailerIdsForPromoter
} from '../utils/promoterStats.js';

const router = express.Router();

async function resolvePromoter(idStr) {
  if (mongoose.isValidObjectId(idStr)) {
    const promoter = await Promoter.findOne({
      _id: idStr,
      is_deleted: { $ne: true }
    }).populate('user');
    if (promoter) return promoter;
  }

  return Promoter.findOne({
    promoter_code: idStr,
    is_deleted: { $ne: true }
  }).populate('user');
}

async function filterPromotersByGeography(promoters, { state, city }) {
  if ((!state || state === 'All') && (!city || city === 'All')) {
    return promoters;
  }

  const retailerQuery = {
    assigned_promoter: { $in: promoters.map((promoter) => promoter._id) },
    is_deleted: { $ne: true }
  };

  const retailers = await Retailer.find(retailerQuery).populate('city state');
  const allowedPromoterIds = new Set();

  for (const retailer of retailers) {
    const stateName = retailer.state?.name;
    const cityName = retailer.city?.name;
    const stateMatch = !state || state === 'All' || stateName === state;
    const cityMatch = !city || city === 'All' || cityName === city;

    if (stateMatch && cityMatch && retailer.assigned_promoter) {
      allowedPromoterIds.add(retailer.assigned_promoter.toString());
    }
  }

  return promoters.filter((promoter) => allowedPromoterIds.has(promoter._id.toString()));
}

// 1. GET /api/v1/promoters/analytics
router.get('/analytics', verifyJWT, async (req, res, next) => {
  try {
    let promoters = await Promoter.find({ is_deleted: { $ne: true } }).populate('user');
    promoters = await filterPromotersByGeography(promoters, req.query);

    if (req.query.status && req.query.status !== 'All') {
      const isActive = req.query.status === 'Active';
      promoters = promoters.filter((promoter) => promoter.is_active === isActive);
    }

    const enrichedRows = await Promise.all(promoters.map((promoter) => enrichPromoterRow(promoter)));

    if (req.query.payment_status && req.query.payment_status !== 'All') {
      const paymentStatus = req.query.payment_status;
      const filteredIds = new Set(
        enrichedRows
          .filter((row) => row.payment_status === paymentStatus)
          .map((row) => row.promoter_id)
      );
      promoters = promoters.filter((promoter) => filteredIds.has(promoter._id.toString()));
    }

    if (req.query.verification && req.query.verification !== 'All') {
      const verification = req.query.verification;
      const filteredIds = new Set(
        enrichedRows
          .filter((row) => row.verification_status === verification)
          .map((row) => row.promoter_id)
      );
      promoters = promoters.filter((promoter) => filteredIds.has(promoter._id.toString()));
    }

    const total_promoters = promoters.length;
    const active_promoters = promoters.filter((promoter) => promoter.is_active).length;

    let verified_promoters = 0;
    let pending_verification = 0;
    const payment_status_breakdown = { Paid: 0, Unpaid: 0, Partial: 0 };

    for (const promoter of promoters) {
      const verificationStatus = await getVerificationStatus(promoter);
      if (verificationStatus === 'Verified') verified_promoters += 1;
      if (verificationStatus === 'Pending') pending_verification += 1;

      const royalty = await getPromoterRoyaltyStats(promoter.user?._id || promoter.user);
      const paymentStatus = derivePaymentStatus(royalty.earned, royalty.paid);
      payment_status_breakdown[paymentStatus] += 1;
    }

    const total_retailers_mapped = await Retailer.countDocuments({
      assigned_promoter: { $in: promoters.map((promoter) => promoter._id) },
      is_deleted: { $ne: true }
    });

    const { start, end } = getCurrentMonthRange();
    let total_revenue_generated = 0;
    let total_royalty_earned = 0;
    let total_royalty_pending = 0;
    const performers = [];

    for (const promoter of promoters) {
      const revenue = await getPromoterOrderRevenue(promoter._id);
      const monthRevenue = await getPromoterOrderRevenue(promoter._id, { start, end });
      const royalty = await getPromoterRoyaltyStats(promoter.user?._id || promoter.user);
      const mappedCount = await Retailer.countDocuments({
        assigned_promoter: promoter._id,
        is_deleted: { $ne: true }
      });

      total_revenue_generated += monthRevenue;
      total_royalty_earned += royalty.earned;
      total_royalty_pending += royalty.pending;

      performers.push({
        promoter_id: promoter._id.toString(),
        promoter_code: promoter.promoter_code,
        full_name: promoter.name,
        retailers: mappedCount,
        revenue,
        royalty_earned: royalty.earned,
        royalty_paid: royalty.paid,
        status: promoter.is_active ? 'Active' : 'Inactive'
      });
    }

    performers.sort((a, b) => b.revenue - a.revenue);

    res.status(200).json({
      total_promoters,
      active_promoters,
      verified_promoters,
      pending_verification,
      total_retailers_mapped,
      total_revenue_generated,
      total_royalty_earned,
      total_royalty_pending,
      payment_status_breakdown,
      top_performers: performers,
      monthly_new_promoters: buildMonthlyNewPromoters(promoters),
      city_wise_distribution: await buildCityWiseDistribution()
    });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/v1/promoters/reports/all-promoters
router.get('/reports/all-promoters', verifyJWT, async (req, res, next) => {
  try {
    const promoters = await Promoter.find({ is_deleted: { $ne: true } }).populate('user');
    const summary = [];

    for (const promoter of promoters) {
      const mappedCount = await Retailer.countDocuments({
        assigned_promoter: promoter._id,
        is_deleted: { $ne: true }
      });
      const revenue = await getPromoterOrderRevenue(promoter._id);
      const royalty = await getPromoterRoyaltyStats(promoter.user?._id || promoter.user);

      summary.push({
        promoter_code: promoter.promoter_code,
        name: promoter.name,
        retailers_mapped: mappedCount,
        revenue_generated: revenue,
        royalty_earned: royalty.earned,
        royalty_paid: royalty.paid,
        royalty_pending: royalty.pending,
        payment_status: derivePaymentStatus(royalty.earned, royalty.paid)
      });
    }

    res.status(200).json({
      promoter_wise_summary: summary,
      grand_total: {
        revenue: summary.reduce((sum, row) => sum + row.revenue_generated, 0),
        royalty_earned: summary.reduce((sum, row) => sum + row.royalty_earned, 0),
        royalty_paid: summary.reduce((sum, row) => sum + row.royalty_paid, 0)
      },
      download_url: null
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/v1/promoters
router.get('/', verifyJWT, async (req, res, next) => {
  try {
    const { search, status, payment_status: paymentStatus, verification, state, city } = req.query;

    const query = { is_deleted: { $ne: true } };

    if (status && status !== 'All') {
      if (status === 'Suspended') {
        query.is_active = false;
      } else {
        query.is_active = status === 'Active';
      }
    }

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { promoter_code: regex },
        { mobile: regex },
        { email: regex }
      ];
    }

    let promoters = await Promoter.find(query).populate('user');
    promoters = await filterPromotersByGeography(promoters, { state, city });

    let enrichedList = await Promise.all(promoters.map((promoter) => enrichPromoterRow(promoter)));

    if (paymentStatus && paymentStatus !== 'All') {
      enrichedList = enrichedList.filter((row) => row.payment_status === paymentStatus);
    }

    if (verification && verification !== 'All') {
      enrichedList = enrichedList.filter((row) => row.verification_status === verification);
    }

    res.status(200).json({
      data: enrichedList,
      pagination: {
        total: enrichedList.length,
        page: Number(req.query.page || 1),
        limit: Number(req.query.limit || 10)
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. POST /api/v1/promoters/register
router.post('/register', verifyJWT, async (req, res, next) => {
  try {
    const {
      full_name,
      mobile_number,
      email,
      address,
      profile_photo_url,
      aadhaar_number,
      pan_number,
      gst_number,
      bank_account_number,
      bank_ifsc,
      bank_name,
      royalty_percentage
    } = req.body;

    const pRole = await Role.findOne({ name: 'Promoter' });
    if (!pRole) {
      return res.status(500).json({ success: false, message: 'Promoter role not found.' });
    }

    const year = new Date().getFullYear();
    let pCode = '';
    let isUnique = false;
    while (!isUnique) {
      const rand = Math.floor(100 + Math.random() * 900);
      pCode = `PRO-${year}-00${rand}`;
      const existingUser = await User.findOne({
        $or: [{ employee_id: pCode }, { user_code: pCode }]
      });
      if (!existingUser) {
        isUnique = true;
      }
    }

    const user = new User({
      name: full_name,
      email: email || `${pCode.toLowerCase()}@huddoerp.in`,
      mobile: mobile_number,
      password: DEFAULT_USER_PASSWORD,
      role: pRole._id,
      roleName: 'Promoter',
      employee_id: pCode,
      user_code: pCode,
      status: 'Active',
      is_verified: false,
      approval_status: 'Pending',
      is_active: true
    });

    await user.save();

    const promoter = new Promoter({
      user: user._id,
      promoter_code: pCode,
      name: full_name,
      mobile: mobile_number,
      email: email || `${pCode.toLowerCase()}@huddoerp.in`,
      address,
      profile_photo: profile_photo_url,
      aadhaar_number,
      pan_number,
      gst_number,
      bank_details: {
        account_no: bank_account_number,
        ifsc: bank_ifsc,
        bank_name
      },
      royalty_percentage: Number(royalty_percentage || 5.0)
    });

    await promoter.save();

    res.status(201).json({
      success: true,
      promoter_id: promoter._id.toString(),
      promoter_code: pCode,
      default_password: DEFAULT_USER_PASSWORD,
      message: `Promoter registered. Default login password: ${DEFAULT_USER_PASSWORD}.`
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/promoters/:id/verify
router.post('/:id/verify', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const { action, remarks } = req.body;
    const verificationStatus = action === 'Verified' ? 'Verified' : 'Rejected';

    if (promoter.user) {
      await User.findByIdAndUpdate(promoter.user._id, {
        $set: {
          is_verified: action === 'Verified',
          approval_status: action === 'Verified' ? 'Approved' : 'Rejected',
          rejection_reason: remarks || ''
        }
      });
    }

    if (action === 'Verified') {
      await Promoter.findByIdAndUpdate(promoter._id, { $set: { is_active: true } });
    }

    res.status(200).json({
      verification_status: verificationStatus,
      message: `Promoter has been ${action.toLowerCase()}.`
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/promoters/:id/dashboard
router.get('/:id/dashboard', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const dashboard = await buildPromoterDashboard(promoter);
    res.status(200).json(dashboard);
  } catch (error) {
    next(error);
  }
});

// 5. GET /api/v1/promoters/:id
router.get('/:id', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const verificationStatus = await getVerificationStatus(promoter);
    const royalty = await getPromoterRoyaltyStats(promoter.user?._id || promoter.user);

    res.status(200).json({
      promoter_id: promoter._id.toString(),
      promoter_code: promoter.promoter_code,
      full_name: promoter.name,
      mobile_number: promoter.mobile,
      email: promoter.email,
      address: promoter.address,
      profile_photo_url: promoter.profile_photo || '',
      aadhaar_number: promoter.aadhaar_number,
      pan_number: promoter.pan_number,
      gst_number: promoter.gst_number,
      bank_account_number: promoter.bank_details ? promoter.bank_details.account_no : '',
      bank_ifsc: promoter.bank_details ? promoter.bank_details.ifsc : '',
      bank_name: promoter.bank_details ? promoter.bank_details.bank_name : '',
      royalty_percentage: promoter.royalty_percentage,
      status: promoter.is_active ? 'Active' : 'Inactive',
      verification_status: verificationStatus,
      payment_status: derivePaymentStatus(royalty.earned, royalty.paid)
    });
  } catch (error) {
    next(error);
  }
});

// 6. PUT /api/v1/promoters/:id
router.put('/:id', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const updateData = {};
    if (req.body.full_name !== undefined) updateData.name = req.body.full_name;
    if (req.body.mobile_number !== undefined) updateData.mobile = req.body.mobile_number;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.profile_photo_url !== undefined) updateData.profile_photo = req.body.profile_photo_url;
    if (req.body.aadhaar_number !== undefined) updateData.aadhaar_number = req.body.aadhaar_number;
    if (req.body.pan_number !== undefined) updateData.pan_number = req.body.pan_number;
    if (req.body.gst_number !== undefined) updateData.gst_number = req.body.gst_number;
    if (req.body.royalty_percentage !== undefined) updateData.royalty_percentage = Number(req.body.royalty_percentage);

    if (req.body.status !== undefined) {
      updateData.is_active = req.body.status === 'Active';
    }

    if (req.body.bank_account_number !== undefined || req.body.bank_ifsc !== undefined || req.body.bank_name !== undefined) {
      updateData.bank_details = {
        account_no: req.body.bank_account_number !== undefined ? req.body.bank_account_number : (promoter.bank_details ? promoter.bank_details.account_no : ''),
        ifsc: req.body.bank_ifsc !== undefined ? req.body.bank_ifsc : (promoter.bank_details ? promoter.bank_details.ifsc : ''),
        bank_name: req.body.bank_name !== undefined ? req.body.bank_name : (promoter.bank_details ? promoter.bank_details.bank_name : '')
      };
    }

    const updated = await Promoter.findByIdAndUpdate(promoter._id, { $set: updateData }, { new: true });

    if (promoter.user) {
      const uUpdate = {};
      if (req.body.full_name !== undefined) uUpdate.name = req.body.full_name;
      if (req.body.email !== undefined) uUpdate.email = req.body.email;
      if (req.body.mobile_number !== undefined) uUpdate.mobile = req.body.mobile_number;
      if (req.body.status !== undefined) {
        uUpdate.is_active = req.body.status === 'Active';
        uUpdate.status = req.body.status === 'Active' ? 'Active' : 'Inactive';
      }
      if (Object.keys(uUpdate).length) {
        await User.findByIdAndUpdate(promoter.user._id, { $set: uUpdate });
      }
    }

    res.status(200).json({ updated: true, promoter: updated });
  } catch (error) {
    next(error);
  }
});

// 7. DELETE /api/v1/promoters/:id
router.delete('/:id', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    await Promoter.findByIdAndUpdate(promoter._id, { $set: { is_deleted: true, is_active: false } });
    if (promoter.user) {
      await User.findByIdAndUpdate(promoter.user._id, { $set: { is_active: false, status: 'Inactive' } });
    }

    await Retailer.updateMany({ assigned_promoter: promoter._id }, { $unset: { assigned_promoter: 1 } });

    res.status(200).json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

// 8. POST /api/v1/promoters/:id/retailers/map
router.post('/:id/retailers/map', verifyJWT, async (req, res, next) => {
  try {
    const { retailer_id } = req.body;
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) return res.status(404).json({ success: false, message: 'Promoter not found' });

    if (mongoose.isValidObjectId(retailer_id)) {
      await Retailer.findByIdAndUpdate(retailer_id, { assigned_promoter: promoter._id });
    }

    res.status(200).json({ success: true, message: 'Retailer mapped successfully.' });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/v1/promoters/:id/retailers
router.get('/:id/retailers', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) return res.status(404).json({ success: false, message: 'Promoter not found' });

    const retailers = await Retailer.find({
      assigned_promoter: promoter._id,
      is_deleted: { $ne: true }
    }).populate('city state');

    const { start, end } = getCurrentMonthRange();
    const list = [];

    for (const retailer of retailers) {
      const orders = await Order.find({
        retailer: retailer._id,
        status: { $in: REVENUE_ORDER_STATUSES },
        is_deleted: { $ne: true }
      });

      const monthlyRevenue = orders
        .filter((order) => {
          const created = new Date(order.createdAt);
          return created >= start && created <= end;
        })
        .reduce((sum, order) => sum + orderRevenue(order), 0);

      list.push({
        retailer_id: retailer._id.toString(),
        retailer_name: retailer.business_name || 'Retailer Shop',
        owner_name: retailer.owner_name || 'Owner',
        mobile: retailer.mobile,
        category: retailer.category || 'Standard',
        city: retailer.city ? retailer.city.name : '',
        state: retailer.state ? retailer.state.name : '',
        mapped_at: retailer.createdAt,
        is_active: retailer.is_active ? 1 : 0,
        monthly_revenue: monthlyRevenue,
        total_orders: orders.length
      });
    }

    res.status(200).json({
      mapped_retailers: list,
      total_mapped: list.length,
      total_active: list.filter((row) => row.is_active === 1).length
    });
  } catch (error) {
    next(error);
  }
});

// 10. DELETE /api/v1/promoters/:id/retailers/:retailer_id/unmap
router.delete('/:id/retailers/:retailer_id/unmap', verifyJWT, async (req, res, next) => {
  try {
    const { retailer_id } = req.params;
    if (mongoose.isValidObjectId(retailer_id)) {
      await Retailer.findByIdAndUpdate(retailer_id, { $unset: { assigned_promoter: 1 } });
    }
    res.status(200).json({ unmapped: true });
  } catch (error) {
    next(error);
  }
});

// 11. GET /api/v1/promoters/:id/revenue
router.get('/:id/revenue', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const retailerIds = await getRetailerIdsForPromoter(promoter._id);
    const invoices = retailerIds.length
      ? await Invoice.find({ retailer: { $in: retailerIds }, is_deleted: { $ne: true } })
          .populate({ path: 'retailer', populate: ['city'] })
          .populate('order')
          .sort({ createdAt: -1 })
      : [];

    const revenueList = invoices.map((invoice) => ({
      id: invoice._id.toString(),
      promoter_id: promoter._id.toString(),
      retailer_name: invoice.retailer?.business_name || 'Retailer Shop',
      retailer_city: invoice.retailer?.city?.name || '',
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.createdAt,
      invoice_amount: Number(invoice.subtotal || 0),
      gst_amount: Number((invoice.cgst || 0) + (invoice.sgst || 0) + (invoice.igst || 0)),
      total_amount: Number(invoice.total || 0),
      payment_status: invoice.is_paid ? 'Paid' : 'Unpaid',
      synced_at: invoice.updatedAt
    }));

    const totalInvoiced = revenueList.reduce((sum, row) => sum + row.invoice_amount, 0);
    const totalPaid = revenueList
      .filter((row) => row.payment_status === 'Paid')
      .reduce((sum, row) => sum + row.invoice_amount, 0);

    res.status(200).json({
      revenue_list: revenueList,
      summary: {
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        total_outstanding: Math.max(totalInvoiced - totalPaid, 0),
        total_gst: revenueList.reduce((sum, row) => sum + row.gst_amount, 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// 12. GET /api/v1/promoters/:id/revenue/summary
router.get('/:id/revenue/summary', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const retailerIds = await getRetailerIdsForPromoter(promoter._id);
    const orders = retailerIds.length
      ? await Order.find({
          retailer: { $in: retailerIds },
          status: { $in: REVENUE_ORDER_STATUSES },
          is_deleted: { $ne: true }
        }).populate('retailer')
      : [];

    const now = new Date();
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const currentOrders = orders.filter((order) => {
      const created = new Date(order.createdAt);
      return created >= currentStart && created <= currentEnd;
    });
    const previousOrders = orders.filter((order) => {
      const created = new Date(order.createdAt);
      return created >= prevStart && created <= prevEnd;
    });

    const currentRevenue = currentOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + orderRevenue(order), 0);
    const growthPct = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : currentRevenue > 0 ? 100 : 0;

    const monthlyTrend = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const periodStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0, 23, 59, 59, 999);
      const periodOrders = orders.filter((order) => {
        const created = new Date(order.createdAt);
        return created >= periodStart && created <= periodEnd;
      });
      const retailerSet = new Set(periodOrders.map((order) => order.retailer?._id?.toString() || order.retailer?.toString()));

      monthlyTrend.push({
        month: periodStart.toLocaleString('en-US', { month: 'short' }),
        revenue: periodOrders.reduce((sum, order) => sum + orderRevenue(order), 0),
        orders: periodOrders.length,
        retailers: retailerSet.size
      });
    }

    const retailerMap = new Map();
    for (const order of orders) {
      const retailerName = order.retailer?.business_name || 'Retailer Shop';
      if (!retailerMap.has(retailerName)) {
        retailerMap.set(retailerName, { retailer_name: retailerName, revenue: 0, orders: 0 });
      }
      const entry = retailerMap.get(retailerName);
      entry.revenue += orderRevenue(order);
      entry.orders += 1;
    }

    res.status(200).json({
      current_month: {
        revenue: currentRevenue,
        orders: currentOrders.length,
        retailers: new Set(currentOrders.map((order) => order.retailer?._id?.toString() || order.retailer?.toString())).size
      },
      previous_month: {
        revenue: previousRevenue,
        orders: previousOrders.length,
        retailers: new Set(previousOrders.map((order) => order.retailer?._id?.toString() || order.retailer?.toString())).size
      },
      growth_pct: growthPct,
      monthly_trend: monthlyTrend,
      quarterly_trend: [],
      by_retailer: Array.from(retailerMap.values()).sort((a, b) => b.revenue - a.revenue),
      by_product_category: []
    });
  } catch (error) {
    next(error);
  }
});

// 13. GET /api/v1/promoters/:id/royalty/earnings
router.get('/:id/royalty/earnings', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    const records = promoter.user
      ? await CommissionRecord.find({
          user: promoter.user._id || promoter.user,
          commission_type: { $in: ['PromoterRoyalty', 'PromoterBonus'] },
          is_deleted: { $ne: true }
        })
          .populate('order retailer')
          .sort({ createdAt: -1 })
      : [];

    const earnings = records.map((record) => {
      const created = new Date(record.createdAt);
      return {
        id: record._id.toString(),
        promoter_id: promoter._id.toString(),
        retailer_name: record.retailer?.business_name || record.description || 'Mapped retailer',
        order_id: record.order?.order_number || record.order?._id?.toString() || '',
        invoice_id: record.order?._id?.toString() || '',
        product_name: record.description || 'All products',
        billing_amount: orderRevenue(record.order),
        royalty_percentage: Number(record.percentage || promoter.royalty_percentage || 0),
        royalty_amount: commissionAmount(record),
        period_month: created.getMonth() + 1,
        period_year: created.getFullYear(),
        status: record.status === 'Paid' ? 'Paid' : 'Pending',
        created_at: record.createdAt
      };
    });

    const totalEarned = earnings.reduce((sum, row) => sum + row.royalty_amount, 0);
    const totalPaid = earnings
      .filter((row) => row.status === 'Paid')
      .reduce((sum, row) => sum + row.royalty_amount, 0);

    res.status(200).json({
      earnings,
      summary: {
        total_earned: totalEarned,
        total_paid: totalPaid,
        total_pending: Math.max(totalEarned - totalPaid, 0),
        total_cancelled: 0
      }
    });
  } catch (error) {
    next(error);
  }
});

// 14. GET /api/v1/promoters/:id/royalty/configs
router.get('/:id/royalty/configs', verifyJWT, async (req, res, next) => {
  try {
    const promoter = await resolvePromoter(req.params.id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found' });
    }

    res.status(200).json({
      product_configs: [],
      retailer_configs: [],
      global_config: {
        config_type: 'Global',
        royalty_percentage: Number(promoter.royalty_percentage || 5),
        is_active: 1
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
