import Order from '../models/Order.js';
import Retailer from '../models/Retailer.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import City from '../models/City.js';
import State from '../models/State.js';
import Country from '../models/Country.js';
import User from '../models/User.js';
import CommissionRecord from '../models/CommissionRecord.js';
import {
  calculateLineCommission,
  getPromoterBonusMapByRole,
  getReferrerCommissionPercentage,
  PROMOTED_ROLE_LABELS,
  resolveCommissionsFromCategory,
  roundAmount
} from './promoterBonus.js';

async function loadRetailerContext(retailerId) {
  const retailer = await Retailer.findById(retailerId).populate({
    path: 'user',
    populate: { path: 'promoted_by', populate: { path: 'role' } }
  });

  if (!retailer) return null;

  let city = retailer.city ? await City.findById(retailer.city).populate({ path: 'manager', populate: { path: 'promoted_by' } }) : null;
  let state = retailer.state ? await State.findById(retailer.state).populate({ path: 'manager', populate: { path: 'promoted_by' } }) : null;

  let country = null;
  if (state?.country) {
    country = await Country.findById(state.country).populate({ path: 'manager', populate: { path: 'promoted_by' } });
  }

  return { retailer, city, state, country };
}

async function findReferrerBonusRecipients(retailer, city, state, country) {
  const recipients = [];
  const seen = new Set();

  const addRecipient = (user, promotedRole, isDirect) => {
    if (!user?._id) return;
    const key = user._id.toString();
    if (seen.has(key)) return;
    seen.add(key);
    recipients.push({ user, promotedRole, isDirect });
  };

  const retailerUser = retailer.user;
  if (retailerUser?.promoted_by) {
    const directReferrer = await User.findById(retailerUser.promoted_by).populate('role');
    addRecipient(directReferrer, 'Retailer', true);
  }

  const cityManager = city?.manager;
  if (cityManager?.promoted_by) {
    const referrer = await User.findById(cityManager.promoted_by).populate('role');
    addRecipient(referrer, 'CityManager', false);
  }

  const stateManager = state?.manager;
  if (stateManager?.promoted_by) {
    const referrer = await User.findById(stateManager.promoted_by).populate('role');
    addRecipient(referrer, 'StateManager', false);
  }

  const countryManager = country?.manager;
  if (countryManager?.promoted_by) {
    const referrer = await User.findById(countryManager.promoted_by).populate('role');
    addRecipient(referrer, 'CountryManager', false);
  }

  return recipients;
}

function isReferrerEligibleForOrder(referrerEntry, retailer, city, state, country) {
  const { user, promotedRole, isDirect } = referrerEntry;
  if (!user || user.approval_status !== 'Approved') return false;

  if (isDirect || promotedRole === 'Retailer') {
    const promotedById = retailer.user?.promoted_by?._id?.toString() || retailer.user?.promoted_by?.toString();
    return promotedById === user._id.toString();
  }

  if (promotedRole === 'CityManager') {
    const promotedById = city?.manager?.promoted_by?._id?.toString() || city?.manager?.promoted_by?.toString();
    return promotedById === user._id.toString();
  }
  if (promotedRole === 'StateManager') {
    const promotedById = state?.manager?.promoted_by?._id?.toString() || state?.manager?.promoted_by?.toString();
    return promotedById === user._id.toString();
  }
  if (promotedRole === 'CountryManager') {
    const promotedById = country?.manager?.promoted_by?._id?.toString() || country?.manager?.promoted_by?.toString();
    return promotedById === user._id.toString();
  }

  return false;
}

export async function calculateAndStoreOrderCommissions(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found.');
  if (order.commissions_calculated) {
    return { skipped: true, order };
  }

  const ctx = await loadRetailerContext(order.retailer);
  if (!ctx) throw new Error('Retailer not found for order.');

  const { retailer, city, state, country } = ctx;
  const referrerRecipients = await findReferrerBonusRecipients(retailer, city, state, country);

  const snapshotItems = [];
  const recordRows = [];
  const recipientSummary = new Map();

  const addRecord = (payload) => {
    recordRows.push(payload);
    const key = payload.user.toString();
    if (!recipientSummary.has(key)) {
      recipientSummary.set(key, {
        user: payload.user,
        role: payload.beneficiary_role,
        commission_type: payload.commission_type,
        total_amount: 0,
        lines: []
      });
    }
    const summary = recipientSummary.get(key);
    summary.total_amount = roundAmount(summary.total_amount + payload.amount);
    summary.lines.push({
      description: payload.description,
      amount: payload.amount,
      percentage: payload.percentage
    });
  };

  for (const item of order.items) {
    const variant = await ProductVariant.findById(item.product_variant).populate({
      path: 'product',
      populate: { path: 'category' }
    });
    const productDoc = variant?.product;
    if (!productDoc) continue;

    const category = productDoc.category;
    const commissions = resolveCommissionsFromCategory(category);
    const franchisePoints = Number(productDoc.franchise_points || 0);
    const qty = Number(item.quantity || 0);
    const bonusMap = await getPromoterBonusMapByRole(category?._id);

    snapshotItems.push({
      product: productDoc._id,
      product_variant: item.product_variant,
      product_category: category?._id || null,
      category_name: category?.name || '',
      franchise_points: franchisePoints,
      quantity: qty,
      rates: {
        cityManager: commissions.cityManager,
        stateManager: commissions.stateManager,
        countryManager: commissions.countryManager,
        promoterCommissions: commissions.promoterCommissions,
        promoterFallbackByRole: bonusMap
      }
    });

    const baseLabel = `${productDoc.name} (${franchisePoints} pts × ${qty})`;

    if (city?.manager?._id) {
      const pct = commissions.cityManager;
      const amount = calculateLineCommission(franchisePoints, qty, pct);
      if (amount > 0) {
        addRecord({
          user: city.manager._id,
          order: order._id,
          retailer: retailer._id,
          product: productDoc._id,
          product_category: category?._id,
          commission_type: 'ManagerIncentive',
          beneficiary_role: 'CityManager',
          amount,
          percentage: pct,
          base_franchise_points: franchisePoints,
          quantity: qty,
          description: `City Manager incentive (${pct}%) on ${baseLabel}`,
          status: 'Approved'
        });
      }
    }

    if (state?.manager?._id) {
      const pct = commissions.stateManager;
      const amount = calculateLineCommission(franchisePoints, qty, pct);
      if (amount > 0) {
        addRecord({
          user: state.manager._id,
          order: order._id,
          retailer: retailer._id,
          product: productDoc._id,
          product_category: category?._id,
          commission_type: 'ManagerIncentive',
          beneficiary_role: 'StateManager',
          amount,
          percentage: pct,
          base_franchise_points: franchisePoints,
          quantity: qty,
          description: `State Manager incentive (${pct}%) on ${baseLabel}`,
          status: 'Approved'
        });
      }
    }

    if (country?.manager?._id) {
      const pct = commissions.countryManager;
      const amount = calculateLineCommission(franchisePoints, qty, pct);
      if (amount > 0) {
        addRecord({
          user: country.manager._id,
          order: order._id,
          retailer: retailer._id,
          product: productDoc._id,
          product_category: category?._id,
          commission_type: 'ManagerIncentive',
          beneficiary_role: 'CountryManager',
          amount,
          percentage: pct,
          base_franchise_points: franchisePoints,
          quantity: qty,
          description: `Country Manager incentive (${pct}%) on ${baseLabel}`,
          status: 'Approved'
        });
      }
    }

    for (const referrerEntry of referrerRecipients) {
      if (!isReferrerEligibleForOrder(referrerEntry, retailer, city, state, country)) continue;

      const totalPct = await getReferrerCommissionPercentage(category, referrerEntry.promotedRole);
      const amount = calculateLineCommission(franchisePoints, qty, totalPct);

      if (amount <= 0) continue;

      const referredUserId =
        referrerEntry.promotedRole === 'Retailer'
          ? retailer.user?._id || retailer.user
          : referrerEntry.promotedRole === 'CityManager'
            ? city?.manager?._id
            : referrerEntry.promotedRole === 'StateManager'
              ? state?.manager?._id
              : country?.manager?._id;

      const roleLabel = PROMOTED_ROLE_LABELS[referrerEntry.promotedRole] || referrerEntry.promotedRole;

      addRecord({
        user: referrerEntry.user._id,
        order: order._id,
        retailer: retailer._id,
        product: productDoc._id,
        product_category: category?._id,
        commission_type: referrerEntry.isDirect ? 'PromoterRoyalty' : 'PromoterBonus',
        beneficiary_role: referrerEntry.user.roleName || referrerEntry.user.role?.name,
        amount,
        percentage: totalPct,
        base_franchise_points: franchisePoints,
        quantity: qty,
        description: `Referrer commission (${totalPct}% for promoted ${roleLabel}) on ${baseLabel}`,
        referrer_user: referrerEntry.user._id,
        referred_user: referredUserId,
        is_direct_referral: referrerEntry.isDirect,
        status: 'Approved'
      });
    }
  }

  if (recordRows.length > 0) {
    await CommissionRecord.insertMany(recordRows);
  }

  order.commissions_calculated = true;
  order.commission_snapshot = {
    calculated_at: new Date(),
    structure_version: 'v1',
    items: snapshotItems,
    recipients: Array.from(recipientSummary.values()).map((entry) => ({
      ...entry,
      total_amount: roundAmount(entry.total_amount)
    }))
  };

  await order.save();

  return { order, recordsCreated: recordRows.length };
}
