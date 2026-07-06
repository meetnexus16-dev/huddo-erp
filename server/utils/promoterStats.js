import Order from '../models/Order.js';
import Promoter from '../models/Promoter.js';
import Retailer from '../models/Retailer.js';
import CommissionRecord from '../models/CommissionRecord.js';
import User from '../models/User.js';

export const REVENUE_ORDER_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function orderRevenue(order) {
  return Number(order?.grand_total ?? order?.subtotal ?? 0);
}

export function commissionAmount(record) {
  return Number(record?.amount ?? 0);
}

export function getCurrentMonthRange(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end, month, year };
}

export function derivePaymentStatus(earned, paid) {
  if (earned <= 0) return 'Paid';
  if (paid >= earned) return 'Paid';
  if (paid > 0) return 'Partial';
  return 'Unpaid';
}

export async function getVerificationStatus(promoter) {
  if (!promoter?.user) return 'Pending';
  const user = promoter.user._id ? promoter.user : await User.findById(promoter.user);
  if (!user) return 'Pending';
  if (user.approval_status === 'Rejected') return 'Rejected';
  if (user.is_verified && user.approval_status !== 'Rejected') return 'Verified';
  return 'Pending';
}

export async function getRetailerIdsForPromoter(promoterId) {
  const retailers = await Retailer.find({
    assigned_promoter: promoterId,
    is_deleted: { $ne: true }
  }).select('_id');
  return retailers.map((r) => r._id);
}

export async function getPromoterOrderRevenue(promoterId, { start, end } = {}) {
  const retailerIds = await getRetailerIdsForPromoter(promoterId);
  if (!retailerIds.length) return 0;

  const query = {
    retailer: { $in: retailerIds },
    status: { $in: REVENUE_ORDER_STATUSES },
    is_deleted: { $ne: true }
  };

  if (start && end) {
    query.createdAt = { $gte: start, $lte: end };
  }

  const orders = await Order.find(query);
  return orders.reduce((sum, order) => sum + orderRevenue(order), 0);
}

export async function getPromoterRoyaltyStats(userId) {
  if (!userId) {
    return { earned: 0, paid: 0, pending: 0 };
  }

  const records = await CommissionRecord.find({
    user: userId,
    commission_type: { $in: ['PromoterRoyalty', 'PromoterBonus'] },
    is_deleted: { $ne: true }
  });

  const earned = records.reduce((sum, record) => sum + commissionAmount(record), 0);
  const paid = records
    .filter((record) => record.status === 'Paid')
    .reduce((sum, record) => sum + commissionAmount(record), 0);

  return {
    earned,
    paid,
    pending: Math.max(earned - paid, 0)
  };
}

export async function enrichPromoterRow(promoter) {
  const populated = promoter.user
    ? promoter
    : await Promoter.findById(promoter._id).populate('user');

  const { month, year, start, end } = getCurrentMonthRange();
  const mappedCount = await Retailer.countDocuments({
    assigned_promoter: promoter._id,
    is_deleted: { $ne: true }
  });
  const royalty = await getPromoterRoyaltyStats(populated.user?._id || populated.user);
  const currentMonthRevenue = await getPromoterOrderRevenue(promoter._id, { start, end });
  const verificationStatus = await getVerificationStatus(populated);
  const paymentStatus = derivePaymentStatus(royalty.earned, royalty.paid);

  return {
    promoter_id: promoter._id.toString(),
    promoter_code: promoter.promoter_code,
    full_name: promoter.name,
    mobile_number: promoter.mobile,
    email: promoter.email,
    status: promoter.is_active ? 'Active' : promoter.is_active === false ? 'Inactive' : 'Suspended',
    payment_status: paymentStatus,
    verification_status: verificationStatus,
    total_retailers_mapped: mappedCount,
    current_month_revenue: currentMonthRevenue,
    total_royalty_earned: royalty.earned,
    pending_royalty: royalty.pending,
    created_at: promoter.createdAt
  };
}

export function buildMonthlyNewPromoters(promoters) {
  const now = new Date();
  const result = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const period = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const count = promoters.filter((promoter) => {
      const created = new Date(promoter.createdAt);
      return (
        created.getFullYear() === period.getFullYear() &&
        created.getMonth() === period.getMonth()
      );
    }).length;

    result.push({
      month: MONTH_LABELS[period.getMonth()],
      count
    });
  }

  return result;
}

export async function buildCityWiseDistribution() {
  const retailers = await Retailer.find({
    assigned_promoter: { $ne: null },
    is_deleted: { $ne: true }
  })
    .populate('city state assigned_promoter')
    .select('city state assigned_promoter');

  const cityMap = new Map();

  for (const retailer of retailers) {
    const cityName = retailer.city?.name || 'Unknown';
    const stateName = retailer.state?.name || 'Unknown';
    const key = `${cityName}|${stateName}`;

    if (!cityMap.has(key)) {
      cityMap.set(key, {
        city: cityName,
        state: stateName,
        promoterIds: new Set(),
        retailerIds: [],
        retailers: 0,
        revenue: 0
      });
    }

    const entry = cityMap.get(key);
    entry.retailers += 1;
    entry.retailerIds.push(retailer._id);
    if (retailer.assigned_promoter) {
      entry.promoterIds.add(retailer.assigned_promoter._id?.toString() || retailer.assigned_promoter.toString());
    }
  }

  const distribution = [];

  for (const entry of cityMap.values()) {
    let revenue = 0;
    if (entry.retailerIds.length) {
      const orders = await Order.find({
        retailer: { $in: entry.retailerIds },
        status: { $in: REVENUE_ORDER_STATUSES },
        is_deleted: { $ne: true }
      });
      revenue = orders.reduce((sum, order) => sum + orderRevenue(order), 0);
    }

    distribution.push({
      city: entry.city,
      state: entry.state,
      promoter_count: entry.promoterIds.size,
      retailers: entry.retailers,
      revenue
    });
  }

  return distribution.sort((a, b) => b.revenue - a.revenue);
}

export async function buildPromoterDashboard(promoter) {
  const populated = promoter.user
    ? promoter
    : await Promoter.findById(promoter._id).populate('user');

  const retailers = await Retailer.find({
    assigned_promoter: promoter._id,
    is_deleted: { $ne: true }
  }).populate('city state');

  const retailerIds = retailers.map((retailer) => retailer._id);
  const royalty = await getPromoterRoyaltyStats(populated.user?._id || populated.user);
  const totalRevenue = await getPromoterOrderRevenue(promoter._id);

  const { start, end, month, year } = getCurrentMonthRange();
  const currentMonthRevenue = await getPromoterOrderRevenue(promoter._id, { start, end });

  const orders = retailerIds.length
    ? await Order.find({
        retailer: { $in: retailerIds },
        status: { $in: REVENUE_ORDER_STATUSES },
        is_deleted: { $ne: true }
      }).populate('retailer')
    : [];

  const monthlyBuckets = new Map();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const period = new Date(year, month - 1 - offset, 1);
    monthlyBuckets.set(`${period.getFullYear()}-${period.getMonth()}`, {
      month: MONTH_LABELS[period.getMonth()],
      retailers_added: 0,
      revenue: 0,
      royalty_earned: 0,
      royalty_paid: 0
    });
  }

  for (const order of orders) {
    const created = new Date(order.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (monthlyBuckets.has(key)) {
      monthlyBuckets.get(key).revenue += orderRevenue(order);
    }
  }

  for (const retailer of retailers) {
    const created = new Date(retailer.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (monthlyBuckets.has(key)) {
      monthlyBuckets.get(key).retailers_added += 1;
    }
  }

  const royaltyRecords = populated.user
    ? await CommissionRecord.find({
        user: populated.user._id || populated.user,
        commission_type: { $in: ['PromoterRoyalty', 'PromoterBonus'] },
        is_deleted: { $ne: true }
      })
    : [];

  for (const record of royaltyRecords) {
    const created = new Date(record.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (!monthlyBuckets.has(key)) continue;
    const bucket = monthlyBuckets.get(key);
    bucket.royalty_earned += commissionAmount(record);
    if (record.status === 'Paid') {
      bucket.royalty_paid += commissionAmount(record);
    }
  }

  const retailerRevenueMap = new Map();
  for (const order of orders) {
    const retailerId = order.retailer?._id?.toString() || order.retailer?.toString();
    if (!retailerId) continue;
    if (!retailerRevenueMap.has(retailerId)) {
      retailerRevenueMap.set(retailerId, { revenue: 0, orders: 0 });
    }
    const entry = retailerRevenueMap.get(retailerId);
    entry.revenue += orderRevenue(order);
    entry.orders += 1;
  }

  const topRetailers = retailers
    .map((retailer) => {
      const stats = retailerRevenueMap.get(retailer._id.toString()) || { revenue: 0, orders: 0 };
      return {
        retailer_name: retailer.business_name || 'Retailer Shop',
        city: retailer.city?.name || '',
        revenue: stats.revenue,
        orders: stats.orders
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const recentRoyaltyEarnings = royaltyRecords
    .slice(-5)
    .reverse()
    .map((record) => ({
      retailer_name: record.description || 'Mapped retailer',
      royalty_amount: commissionAmount(record),
      status: record.status === 'Paid' ? 'Paid' : 'Pending',
      created_at: record.createdAt
    }));

  const paidPct = royalty.earned > 0 ? Math.round((royalty.paid / royalty.earned) * 100) : 100;
  const verificationStatus = await getVerificationStatus(populated);

  return {
    profile_snapshot: {
      promoter_id: promoter._id.toString(),
      promoter_code: promoter.promoter_code,
      full_name: promoter.name,
      mobile_number: promoter.mobile,
      email: promoter.email,
      status: promoter.is_active ? 'Active' : 'Inactive',
      verification_status: verificationStatus,
      payment_status: derivePaymentStatus(royalty.earned, royalty.paid),
      royalty_percentage: promoter.royalty_percentage
    },
    summary_cards: {
      retailers_added: retailers.length,
      active_retailers: retailers.filter((retailer) => retailer.is_active).length,
      revenue_generated: totalRevenue,
      royalty_earned: royalty.earned,
      pending_royalty: royalty.pending,
      paid_royalty: royalty.paid
    },
    current_month: {
      new_retailers_added: retailers.filter((retailer) => {
        const created = new Date(retailer.createdAt);
        return created >= start && created <= end;
      }).length,
      revenue: currentMonthRevenue,
      royalty_earned: royaltyRecords
        .filter((record) => {
          const created = new Date(record.createdAt);
          return created >= start && created <= end;
        })
        .reduce((sum, record) => sum + commissionAmount(record), 0),
      royalty_paid: royaltyRecords
        .filter((record) => {
          const created = new Date(record.createdAt);
          return created >= start && created <= end && record.status === 'Paid';
        })
        .reduce((sum, record) => sum + commissionAmount(record), 0),
      royalty_pending: Math.max(royalty.pending, 0)
    },
    monthly_trend: Array.from(monthlyBuckets.values()),
    top_retailers: topRetailers,
    recent_royalty_earnings: recentRoyaltyEarnings,
    payment_status_breakdown: {
      total_earned: royalty.earned,
      total_paid: royalty.paid,
      total_pending: royalty.pending,
      paid_pct: paidPct,
      pending_pct: Math.max(100 - paidPct, 0)
    },
    recent_notifications: []
  };
}
