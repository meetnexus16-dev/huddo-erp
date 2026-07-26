import ManagerPayment from '../models/ManagerPayment.js';
import CommissionRecord from '../models/CommissionRecord.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

const PAYOUT_ROLE_NAMES = [
  'CountryManager',
  'StateManager',
  'CityManager',
  'Promoter',
  'HierarchyCountry',
  'HierarchyState',
  'HierarchyCity'
];

function buildDateRange({ fromDate, toDate, month, year }) {
  if (fromDate || toDate) {
    const range = {};
    if (fromDate) range.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    return range;
  }
  if (month && year) {
    const y = Number(year);
    const m = Number(month) - 1;
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 0 || m > 11) return null;
    return {
      $gte: new Date(y, m, 1),
      $lte: new Date(y, m + 1, 0, 23, 59, 59, 999)
    };
  }
  if (year) {
    const y = Number(year);
    if (!Number.isFinite(y)) return null;
    return {
      $gte: new Date(y, 0, 1),
      $lte: new Date(y, 11, 31, 23, 59, 59, 999)
    };
  }
  return null;
}

const fromPaise = (v) => Math.round((Number(v) || 0)) / 100;

/**
 * GET /api/v1/manager-payments/eligible-users
 * Managers + promoters only (for Record Commission Payment).
 */
export const listEligiblePayoutUsers = async (req, res, next) => {
  try {
    const roles = await Role.find({ name: { $in: PAYOUT_ROLE_NAMES } }).select('_id name');
    const roleIds = roles.map((r) => r._id);
    if (roleIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = await User.find({
      role: { $in: roleIds },
      is_deleted: { $ne: true },
      is_active: { $ne: false }
    })
      .populate('role', 'name')
      .select('name email user_code roleName role mobile')
      .sort({ name: 1 })
      .limit(500);

    const data = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      user_code: u.user_code,
      mobile: u.mobile,
      roleName: u.role?.name || u.roleName || '—'
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/manager-payments/calculate-commission
 * Sum commission records for a user in a date range / month.
 */
export const calculateUserCommission = async (req, res, next) => {
  try {
    const {
      user_id: userId,
      from_date: fromDate,
      to_date: toDate,
      month,
      year
    } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'user_id is required.' });
    }

    const dateRange = buildDateRange({ fromDate, toDate, month, year });
    if (!dateRange) {
      return res.status(400).json({
        success: false,
        message: 'Provide a date range (from_date/to_date) or month + year.'
      });
    }

    const user = await User.findById(userId).populate('role', 'name').select('name user_code roleName role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const filter = {
      user: userId,
      createdAt: dateRange,
      is_deleted: { $ne: true },
      status: { $ne: 'Rejected' }
    };

    const records = await CommissionRecord.find(filter)
      .populate('order', 'order_number')
      .populate('retailer', 'business_name')
      .populate('product_category', 'name')
      .sort({ createdAt: -1 })
      .lean();

    let total = 0;
    let payableTotal = 0;
    const byStatus = { Pending: 0, Approved: 0, Paid: 0 };
    const payableIds = [];
    const payableRecords = [];

    const mapped = records.map((row) => {
      const amount = fromPaise(row.amount);
      total += amount;
      if (byStatus[row.status] !== undefined) byStatus[row.status] += amount;
      if (row.status === 'Approved' || row.status === 'Pending') {
        payableTotal += amount;
        payableIds.push(row._id);
        payableRecords.push({
          _id: row._id,
          amount,
          status: row.status,
          commission_type: row.commission_type,
          description: row.description,
          percentage: row.percentage,
          createdAt: row.createdAt,
          order_number: row.order?.order_number || null,
          retailer_name: row.retailer?.business_name || null
        });
      }
      return {
        _id: row._id,
        amount,
        status: row.status,
        commission_type: row.commission_type,
        description: row.description,
        percentage: row.percentage,
        createdAt: row.createdAt,
        order_number: row.order?.order_number || null,
        retailer_name: row.retailer?.business_name || null
      };
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          user_code: user.user_code,
          roleName: user.role?.name || user.roleName
        },
        period: {
          from: dateRange.$gte,
          to: dateRange.$lte,
          month: month || null,
          year: year || null
        },
        summary: {
          total: Math.round(total * 100) / 100,
          payable_total: Math.round(payableTotal * 100) / 100,
          count: mapped.length,
          payable_count: payableIds.length,
          by_status: {
            Pending: Math.round((byStatus.Pending || 0) * 100) / 100,
            Approved: Math.round((byStatus.Approved || 0) * 100) / 100,
            Paid: Math.round((byStatus.Paid || 0) * 100) / 100
          }
        },
        payable_ids: payableIds,
        payable_records: payableRecords,
        records: mapped
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listManagerPayments = async (req, res, next) => {
  try {
    const { user_id: userId, payment_type: paymentType } = req.query;
    const filter = { is_deleted: { $ne: true } };

    const roleName = req.user.role?.name || req.user.roleName;
    if (!['Founder', 'Admin', 'CEO', 'FinanceManager'].includes(roleName)) {
      filter.user = req.user._id;
    } else if (userId) {
      filter.user = userId;
    }

    if (paymentType) filter.payment_type = paymentType;

    const rows = await ManagerPayment.find(filter)
      .populate('user', 'name user_code roleName email mobile')
      .populate('retailer', 'business_name owner_name')
      .populate('recorded_by', 'name email')
      .sort({ payment_date: -1 });

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/manager-payments/:id
 */
export const getManagerPaymentById = async (req, res, next) => {
  try {
    const payment = await ManagerPayment.findById(req.params.id)
      .populate('user', 'name user_code roleName email mobile')
      .populate('retailer', 'business_name owner_name')
      .populate('recorded_by', 'name email');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    const roleName = req.user.role?.name || req.user.roleName;
    if (!['Founder', 'Admin', 'CEO', 'FinanceManager'].includes(roleName)) {
      if (String(payment.user?._id || payment.user) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    res.status(200).json({ success: true, data: payment });
  } catch (error) {
    next(error);
  }
};

export const createManagerPayment = async (req, res, next) => {
  try {
    const { user_id: userId, amount, payment_date: paymentDate, reference, notes, payment_type: paymentType } = req.body;

    if (!userId || !amount || !paymentDate) {
      return res.status(400).json({ success: false, message: 'user_id, amount, and payment_date are required.' });
    }

    // Commission settlement amount is a payment reference only — never link or mark CommissionRecord Paid/Unpaid.
    const payment = await ManagerPayment.create({
      user: userId,
      amount: Number(amount),
      payment_date: new Date(paymentDate),
      reference,
      notes,
      payment_type: paymentType || 'CommissionSettlement',
      recorded_by: req.user._id,
      commission_records: []
    });

    const populated = await ManagerPayment.findById(payment._id)
      .populate('user', 'name user_code roleName')
      .populate('recorded_by', 'name');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};
