import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Retailer from '../models/Retailer.js';
import City from '../models/City.js';
import State from '../models/State.js';
import Country from '../models/Country.js';
import Promoter from '../models/Promoter.js';
import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Target from '../models/Target.js';
import CommissionRecord from '../models/CommissionRecord.js';

// Helper to convert mongoose object ID
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// 1. GET /api/v1/dashboard/founder
export const getFounderDashboard = async (req, res, next) => {
  try {
    // Overall sales metrics (delivered, shipped, approved, processing orders)
    const salesStats = await Order.aggregate([
      {
        $match: {
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$grand_total' }
        }
      }
    ]);

    const stats = salesStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

    // Retailer count
    const totalRetailers = await Retailer.countDocuments({ is_deleted: { $ne: true } });

    // Promoter count
    const totalPromoters = await Promoter.countDocuments({ is_deleted: { $ne: true } });

    // Employee count
    const totalEmployees = await Employee.countDocuments({ is_deleted: { $ne: true } });

    // Sum of unpaid invoices
    const unpaidInvoices = await mongoose.model('Invoice').aggregate([
      { $match: { is_paid: false } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalOutstanding = unpaidInvoices[0] ? unpaidInvoices[0].total : 0;

    // Sales by status breakdown for pie chart
    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Top 5 Retailers for Table
    const topRetailers = await Order.aggregate([
      { $match: { status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] } } },
      { $group: { _id: '$retailer', totalPurchases: { $sum: '$grand_total' }, orderCount: { $sum: 1 } } },
      { $sort: { totalPurchases: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'retailers',
          localField: '_id',
          foreignField: '_id',
          as: 'retailerDetails'
        }
      },
      { $unwind: '$retailerDetails' },
      {
        $project: {
          shopName: '$retailerDetails.business_name',
          city: '$retailerDetails.city',
          revenue: '$totalPurchases',
          orderCount: 1
        }
      }
    ]);

    // Populate cities for topRetailers
    for (const tr of topRetailers) {
      if (tr.city) {
        const cityDoc = await City.findById(tr.city);
        tr.city = cityDoc ? cityDoc.name : 'Mumbai';
      } else {
        tr.city = 'Mumbai';
      }
    }

    // Recent 5 Orders for Table
    const recentOrders = await Order.find()
      .populate('retailer')
      .sort({ createdAt: -1 })
      .limit(5);

    // Monthly revenue trends for Line Chart
    // We group orders by month
    const monthlyTrendsAgg = await Order.aggregate([
      { $match: { status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] } } },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          revenue: { $sum: '$grand_total' }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenueTrends = monthlyTrendsAgg.map(item => ({
      month: monthNames[item._id.month - 1] || 'Jun',
      revenue: item.revenue
    }));

    // State performance bar chart data
    const statePerformanceAgg = await Order.aggregate([
      { $match: { status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] } } },
      {
        $lookup: {
          from: 'retailers',
          localField: 'retailer',
          foreignField: '_id',
          as: 'retailerDetails'
        }
      },
      { $unwind: '$retailerDetails' },
      {
        $lookup: {
          from: 'states',
          localField: 'retailerDetails.state',
          foreignField: '_id',
          as: 'stateDetails'
        }
      },
      { $unwind: '$stateDetails' },
      {
        $group: {
          _id: '$stateDetails.name',
          revenue: { $sum: '$grand_total' }
        }
      }
    ]);

    const statePerformanceData = statePerformanceAgg.map(item => ({
      state: item._id,
      revenue: item.revenue
    }));

    const isCeo = req.user && req.user.role && req.user.role.name === 'CEO';

    res.status(200).json({
      success: true,
      message: isCeo ? 'CEO dashboard data retrieved.' : 'Founder dashboard data retrieved.',
      data: {
        overall: {
          totalRevenue: isCeo ? 0 : stats.totalRevenue,
          totalOrders: stats.totalOrders,
          avgOrderValue: isCeo ? 0 : stats.avgOrderValue,
          totalRetailers,
          totalPromoters,
          totalEmployees,
          totalOutstanding: isCeo ? 0 : totalOutstanding
        },
        statusBreakdown: statusBreakdown.map(item => ({
          name: item._id,
          value: item.count
        })),
        topRetailers: isCeo ? topRetailers.map(tr => ({ ...tr, revenue: 0 })) : topRetailers,
        recentOrders: recentOrders.map(o => ({
          id: o.order_number || o._id,
          amount: isCeo ? 0 : o.subtotal,
          status: o.status
        })),
        monthlyRevenueTrends: isCeo ? [] : monthlyRevenueTrends,
        statePerformanceData: isCeo ? [] : statePerformanceData
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET /api/v1/dashboard/country/:id
export const getCountryDashboard = async (req, res, next) => {
  try {
    const countryId = toObjectId(req.params.id);

    // Get states in the country
    const states = await State.find({ country: countryId, is_active: true });
    const stateIds = states.map(s => s._id);

    // Get cities in states
    const cities = await City.find({ state: { $in: stateIds }, is_active: true });
    const cityIds = cities.map(c => c._id);

    // Find retailers in cities
    const retailers = await Retailer.find({ city: { $in: cityIds } });
    const retailerIds = retailers.map(r => r._id);

    // Revenue aggregations for these retailers
    const salesStats = await Order.aggregate([
      {
        $match: {
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const stats = salesStats[0] || { totalRevenue: 0, totalOrders: 0 };

    res.status(200).json({
      success: true,
      message: 'Country dashboard data retrieved.',
      data: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        activeStatesCount: states.length,
        activeCitiesCount: cities.length,
        retailersCount: retailers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET /api/v1/dashboard/state/:id
export const getStateDashboard = async (req, res, next) => {
  try {
    const stateId = toObjectId(req.params.id);

    // Find all cities in state
    const cities = await City.find({ state: stateId });
    const cityIds = cities.map(c => c._id);

    // Find all retailers in cities
    const retailers = await Retailer.find({ city: { $in: cityIds } });
    const retailerIds = retailers.map(r => r._id);

    const salesStats = await Order.aggregate([
      {
        $match: {
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const stats = salesStats[0] || { totalRevenue: 0, totalOrders: 0 };

    res.status(200).json({
      success: true,
      message: 'State dashboard data retrieved.',
      data: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        citiesCount: cities.length,
        retailersCount: retailers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// 4. GET /api/v1/dashboard/city/:id
export const getCityDashboard = async (req, res, next) => {
  try {
    const cityId = toObjectId(req.params.id);

    // Find all retailers in city
    const retailers = await Retailer.find({ city: cityId });
    const retailerIds = retailers.map(r => r._id);

    const salesStats = await Order.aggregate([
      {
        $match: {
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$grand_total' },
          totalOrders: { $sum: 1 }
        }
      }
    ]);

    const stats = salesStats[0] || { totalRevenue: 0, totalOrders: 0 };

    res.status(200).json({
      success: true,
      message: 'City dashboard data retrieved.',
      data: {
        totalRevenue: stats.totalRevenue,
        totalOrders: stats.totalOrders,
        retailersCount: retailers.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// 5. GET /api/v1/dashboard/retailer/:id
export const getRetailerDashboard = async (req, res, next) => {
  try {
    const retailerId = toObjectId(req.params.id);

    const retailer = await Retailer.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({ success: false, message: 'Retailer not found.' });
    }

    // Purchase statistics
    const purchaseStats = await Order.aggregate([
      {
        $match: {
          retailer: retailerId,
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$grand_total' },
          orderCount: { $sum: 1 }
        }
      }
    ]);

    // Pending unpaid invoices
    const unpaidInvoices = await mongoose.model('Invoice').aggregate([
      {
        $match: {
          retailer: retailerId,
          is_paid: false
        }
      },
      {
        $group: {
          _id: null,
          pendingAmount: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    const stats = purchaseStats[0] || { totalSpent: 0, orderCount: 0 };
    const invoiceStats = unpaidInvoices[0] || { pendingAmount: 0, invoiceCount: 0 };

    res.status(200).json({
      success: true,
      message: 'Retailer dashboard data retrieved.',
      data: {
        credit_limit: retailer.credit_limit,
        totalSpent: stats.totalSpent,
        orderCount: stats.orderCount,
        pendingPaymentAmount: invoiceStats.pendingAmount,
        pendingInvoicesCount: invoiceStats.invoiceCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. GET /api/v1/dashboard/employee/:id
export const getEmployeeDashboard = async (req, res, next) => {
  try {
    const employeeId = toObjectId(req.params.id);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Attendance rate of current month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const attendanceRecords = await Attendance.find({
      employee: employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const presentDays = attendanceRecords.filter(r => r.status === 'Present').length;
    const halfDays = attendanceRecords.filter(r => r.status === 'HalfDay').length;
    const totalWorkingDays = attendanceRecords.length;

    const attendanceRate = totalWorkingDays > 0 
      ? parseFloat((((presentDays + (halfDays * 0.5)) / totalWorkingDays) * 100).toFixed(2))
      : 0;

    // Monthly Target Achieved
    const userTarget = await Target.findOne({
      assigned_to: employee.user,
      period_type: 'Monthly',
      period_start: { $lte: new Date() },
      period_end: { $gte: new Date() }
    });

    res.status(200).json({
      success: true,
      message: 'Employee dashboard data retrieved.',
      data: {
        attendanceRate: {
          rate: attendanceRate,
          workingDaysLogged: totalWorkingDays,
          presentDays,
          halfDays
        },
        target: userTarget ? {
          title: userTarget.title,
          kpi: userTarget.kpi_type,
          target: userTarget.target_value,
          achieved: userTarget.achieved_value,
          percentage: userTarget.achievement_percentage
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

import User from '../models/User.js';

const APPROVED_ORDER_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];
const PENDING_ORDER_STATUSES = ['Submitted', 'Draft'];

async function retailersInGeo({ cityIds, stateIds, countryId }) {
  const filter = { is_deleted: { $ne: true } };
  if (cityIds?.length) {
    filter.city = { $in: cityIds };
  } else if (stateIds?.length) {
    filter.state = { $in: stateIds };
  } else if (countryId) {
    const states = await State.find({ country: countryId, is_deleted: { $ne: true } }).select('_id');
    const cities = await City.find({ state: { $in: states.map((s) => s._id) }, is_deleted: { $ne: true } }).select('_id');
    filter.city = { $in: cities.map((c) => c._id) };
  } else {
    return [];
  }
  return Retailer.find(filter).select('_id business_name city state is_active is_verified createdAt');
}

async function buildTerritoryDashboard(retailers) {
  const retailerIds = retailers.map((r) => r._id);
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [monthOrders, allOrders, pendingOrders, recentOrders] = await Promise.all([
    retailerIds.length
      ? Order.find({
        retailer: { $in: retailerIds },
        status: { $in: APPROVED_ORDER_STATUSES },
        createdAt: { $gte: startOfMonth }
      })
      : [],
    retailerIds.length
      ? Order.find({ retailer: { $in: retailerIds }, status: { $in: APPROVED_ORDER_STATUSES } })
      : [],
    retailerIds.length
      ? Order.find({ retailer: { $in: retailerIds }, status: { $in: PENDING_ORDER_STATUSES } })
        .populate('retailer', 'business_name')
        .sort({ createdAt: -1 })
        .limit(10)
      : [],
    retailerIds.length
      ? Order.find({ retailer: { $in: retailerIds } })
        .populate('retailer', 'business_name')
        .sort({ createdAt: -1 })
        .limit(5)
      : []
  ]);

  const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);

  const monthlyTrends = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const mOrders = allOrders.filter((o) => o.createdAt >= mStart && o.createdAt <= mEnd);
    monthlyTrends.push({
      month: mStart.toLocaleString('en', { month: 'short' }),
      revenue: mOrders.reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0),
      orders: mOrders.length
    });
  }

  const revenueByRetailer = {};
  monthOrders.forEach((o) => {
    const rid = o.retailer?.toString();
    if (rid) revenueByRetailer[rid] = (revenueByRetailer[rid] || 0) + Number(o.grand_total || o.subtotal || 0);
  });

  const topRetailers = retailers
    .map((r) => ({
      id: r._id,
      name: r.business_name,
      revenue: revenueByRetailer[r._id.toString()] || 0,
      status: r.is_active && r.is_verified ? 'Active' : 'Pending'
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    monthRevenue,
    totalOrders: allOrders.length,
    monthOrders: monthOrders.length,
    retailerCount: retailers.length,
    activeRetailers: retailers.filter((r) => r.is_active && r.is_verified).length,
    pendingApprovals: pendingOrders.length,
    pendingOrders: pendingOrders.map((o) => ({
      id: o._id,
      order_number: o.order_number,
      retailer: o.retailer?.business_name || '—',
      amount: o.grand_total || o.subtotal || 0,
      status: o.status,
      date: o.createdAt
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.order_number || o._id,
      retailer: o.retailer?.business_name || '—',
      amount: o.grand_total || o.subtotal || 0,
      status: o.status
    })),
    monthlyTrends,
    topRetailers
  };
}

// GET /api/v1/dashboard/me — role-scoped dashboard for logged-in manager/promoter
export const getMyDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('role country state city');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;

    if (roleName === 'CityManager') {
      if (!user.city) {
        return res.status(400).json({ success: false, message: 'No city assigned to this account.' });
      }
      const city = await City.findById(user.city).populate({ path: 'state', select: 'name' });
      const retailers = await retailersInGeo({ cityIds: [user.city] });
      const stats = await buildTerritoryDashboard(retailers);
      return res.status(200).json({
        success: true,
        data: {
          role: roleName,
          territoryLabel: city ? `${city.name}${city.state?.name ? `, ${city.state.name}` : ''}` : 'City',
          ...stats
        }
      });
    }

    if (roleName === 'StateManager') {
      if (!user.state) {
        return res.status(400).json({ success: false, message: 'No state assigned to this account.' });
      }
      const state = await State.findById(user.state).select('name');
      const retailers = await retailersInGeo({ stateIds: [user.state] });
      const stats = await buildTerritoryDashboard(retailers);

      const cities = await City.find({ state: user.state, is_deleted: { $ne: true } }).populate(
        'manager',
        'name mobile email status joining_date updatedAt'
      );
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const targetPeriod = new Date().toISOString().slice(0, 7);
      const managerIds = cities.filter((c) => c.manager?._id).map((c) => c.manager._id);
      const revenueTargets = managerIds.length
        ? await Target.find({
          assigned_to: { $in: managerIds },
          period_type: 'Monthly',
          title: targetPeriod,
          kpi_type: 'Revenue',
          is_deleted: { $ne: true }
        })
        : [];
      const targetByManager = revenueTargets.reduce((acc, row) => {
        acc[row.assigned_to.toString()] = Number(row.target_value || 0);
        return acc;
      }, {});

      const monthOrders = retailers.length
        ? await Order.find({
          retailer: { $in: retailers.map((r) => r._id) },
          status: { $in: APPROVED_ORDER_STATUSES },
          createdAt: { $gte: startOfMonth }
        })
        : [];

      const cityPerformance = cities.map((city) => {
        const cityRetailers = retailers.filter((r) => r.city?.toString() === city._id.toString());
        const cityRetailerIds = new Set(cityRetailers.map((r) => r._id.toString()));
        const cityOrders = monthOrders.filter((o) => cityRetailerIds.has(o.retailer?.toString()));
        const revenue = cityOrders.reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);
        return {
          city: city.name,
          revenue,
          orders: cityOrders.length,
          retailers: cityRetailers.length,
          managerName: city.manager?.name || 'Unassigned'
        };
      }).sort((a, b) => b.revenue - a.revenue);

      const cityManagers = cities
        .filter((c) => c.manager)
        .map((city) => {
          const manager = city.manager;
          const managerId = manager._id.toString();
          const cityRetailers = retailers.filter((r) => r.city?.toString() === city._id.toString());
          const cityRetailerIds = new Set(cityRetailers.map((r) => r._id.toString()));
          const ordersThisMonth = monthOrders.filter((o) => cityRetailerIds.has(o.retailer?.toString())).length;
          const achieved = monthOrders
            .filter((o) => cityRetailerIds.has(o.retailer?.toString()))
            .reduce((sum, o) => sum + Number(o.grand_total || o.subtotal || 0), 0);
          return {
            id: managerId,
            cityId: city._id.toString(),
            city: city.name,
            name: manager.name || '—',
            mobile: manager.mobile || '',
            email: manager.email || '',
            joiningDate: manager.joining_date || null,
            retailersCount: cityRetailers.length,
            ordersThisMonth,
            achieved,
            monthlyTarget: targetByManager[managerId] || 0,
            status: manager.status || 'Active',
            lastActive: manager.updatedAt
              ? manager.updatedAt.toISOString().split('T')[0]
              : null
          };
        });

      return res.status(200).json({
        success: true,
        data: {
          role: roleName,
          territoryLabel: state?.name || 'State',
          ...stats,
          cityPerformance,
          cityManagers
        }
      });
    }

    if (roleName === 'Promoter') {
      const [referralTotal, referralApproved, referralPending, commissionRows] = await Promise.all([
        User.countDocuments({ promoted_by: user._id, is_deleted: { $ne: true } }),
        User.countDocuments({ promoted_by: user._id, approval_status: 'Approved', is_deleted: { $ne: true } }),
        User.countDocuments({ promoted_by: user._id, approval_status: 'Pending', is_deleted: { $ne: true } }),
        CommissionRecord.find({ user: user._id, is_deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5)
      ]);

      const allCommissions = await CommissionRecord.find({ user: user._id, is_deleted: { $ne: true } });
      const totalEarned = allCommissions.reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const unpaidEarned = allCommissions
        .filter((r) => r.status === 'Approved')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          role: roleName,
          territoryLabel: 'Referral Network',
          referralTotal,
          referralApproved,
          referralPending,
          totalEarned,
          unpaidEarned,
          recentCommissions: commissionRows.map((r) => ({
            id: r._id,
            amount: r.amount,
            status: r.status,
            type: r.commission_type,
            description: r.description,
            date: r.createdAt
          }))
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Use /dashboard/founder for admin roles or /country-managers/:id/dashboard for country managers.'
    });
  } catch (error) {
    next(error);
  }
};

// 7. GET /api/v1/dashboard/promoter/:id
export const getPromoterDashboard = async (req, res, next) => {
  try {
    const promoterId = toObjectId(req.params.id);

    const promoter = await Promoter.findById(promoterId);
    if (!promoter) {
      return res.status(404).json({ success: false, message: 'Promoter not found.' });
    }

    // Commission earned stats
    const commissionStats = await CommissionRecord.aggregate([
      {
        $match: {
          user: promoter.user,
          commission_type: 'PromoterRoyalty'
        }
      },
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Active retailers count
    const activeRetailersCount = await Retailer.countDocuments({
      assigned_promoter: promoterId,
      is_active: true
    });

    res.status(200).json({
      success: true,
      message: 'Promoter dashboard data retrieved.',
      data: {
        royalty_percentage: promoter.royalty_percentage,
        total_royalty_earned: promoter.total_royalty_earned,
        activeRetailersCount,
        commissions: commissionStats
      }
    });
  } catch (error) {
    next(error);
  }
};
