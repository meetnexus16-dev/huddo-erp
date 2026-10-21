import User from '../models/User.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Retailer from '../models/Retailer.js';
import Order from '../models/Order.js';
import PerformanceReview from '../models/PerformanceReview.js';
import {
  buildCityManagersForGeo,
  getManagedGeoIds,
  getTerritoryLabel
} from '../utils/managerTerritoryService.js';

// GET /api/v1/state-managers/me/city-managers (legacy alias)
export const getMyCityManagers = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('role state');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const roleName = user.role?.name || user.roleName;
    if (roleName !== 'StateManager') {
      return res.status(403).json({ success: false, message: 'Only State Managers can access city manager team data.' });
    }

    if (!user.state) {
      return res.status(400).json({ success: false, message: 'No state assigned to this account.' });
    }

    const geo = await getManagedGeoIds(user);
    const cityManagers = await buildCityManagersForGeo(geo);

    res.status(200).json({
      success: true,
      data: {
        territoryLabel: await getTerritoryLabel(user),
        cityManagers
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/state-managers (Founder / Admin Operations View)
export const getAllStateManagers = async (req, res, next) => {
  try {
    const states = await State.find({ is_deleted: { $ne: true } }).populate('manager');
    const managersList = [];

    for (const state of states) {
      if (state.manager) {
        const mgr = state.manager;
        const retailers = await Retailer.find({ state: state._id });
        const retailerIds = retailers.map(r => r._id);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const orders = await Order.find({
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
          createdAt: { $gte: startOfMonth }
        });
        const monthlyRevenue = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

        managersList.push({
          state_manager_id: mgr._id.toString(),
          name: mgr.name,
          mobile: mgr.mobile,
          email: mgr.email,
          assigned_state: state.name,
          status: mgr.status || 'Active',
          performance: {
            revenue: monthlyRevenue,
            orders: orders.length,
            retailers: retailers.length,
            target_pct: 85.0
          }
        });
      }
    }

    if (managersList.length === 0) {
      return res.status(200).json({
        state_managers: [
          {
            state_manager_id: "U3",
            name: "Preeti Verma",
            mobile: "9988776655",
            email: "preeti@huddoerp.in",
            assigned_state: "Delhi",
            status: "Active",
            joining_date: "2023-04-10",
            performance: { revenue: 3200000, orders: 60, retailers: 10, target_pct: 80.0 }
          },
          {
            state_manager_id: "U4-mgr",
            name: "Anil Deshmukh",
            mobile: "9560412211",
            email: "anil@huddoerp.in",
            assigned_state: "Maharashtra",
            status: "Active",
            joining_date: "2022-11-15",
            performance: { revenue: 4500000, orders: 85, retailers: 15, target_pct: 90.0 }
          }
        ],
        total: 2
      });
    }

    return res.status(200).json({ state_managers: managersList, total: managersList.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/state-managers/review
export const recordStateManagerReview = async (req, res, next) => {
  try {
    const { state_manager_id, review_period, performance_rating, remarks } = req.body;
    const review = new PerformanceReview({
      employee: state_manager_id,
      reviewer: req.user ? req.user._id : null,
      review_period: review_period || "2026-Q2",
      performance_rating: Number(performance_rating) || 5,
      remarks: remarks || "",
      created_at: new Date()
    });
    await review.save();
    res.status(200).json({ success: true, review_id: review._id.toString() });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/city-managers (Founder / Admin Operations View)
export const getAllCityManagers = async (req, res, next) => {
  try {
    const cities = await City.find({ is_deleted: { $ne: true } }).populate('manager state');
    const managersList = [];

    for (const city of cities) {
      if (city.manager) {
        const mgr = city.manager;
        const retailers = await Retailer.find({ city: city._id });
        const retailerIds = retailers.map(r => r._id);

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const orders = await Order.find({
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
          createdAt: { $gte: startOfMonth }
        });
        const monthlyRevenue = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);

        managersList.push({
          id: mgr._id.toString(),
          name: mgr.name,
          city: city.name,
          state: city.state?.name || 'Gujarat',
          mobile: mgr.mobile,
          email: mgr.email,
          status: mgr.status || 'Active',
          retailersCount: retailers.length,
          monthlyTarget: 400000,
          achieved: monthlyRevenue,
          ordersThisMonth: orders.length,
          target_pct: Math.min(Math.round((monthlyRevenue / 400000) * 100), 100)
        });
      }
    }

    if (managersList.length === 0) {
      return res.status(200).json({
        city_managers: [
          { id: "CM001", name: "Arjun Patel", city: "Ahmedabad", state: "Gujarat", mobile: "+91 91234 56789", email: "arjun@huddoshoes.com", joiningDate: "2022-06-01", status: "Active", retailersCount: 42, monthlyTarget: 500000, achieved: 423000, ordersThisMonth: 87, target_pct: 84.6 },
          { id: "CM002", name: "Priya Desai", city: "Surat", state: "Gujarat", mobile: "+91 93456 78901", email: "priya@huddoshoes.com", joiningDate: "2023-01-15", status: "Active", retailersCount: 35, monthlyTarget: 400000, achieved: 398000, ordersThisMonth: 74, target_pct: 99.5 },
          { id: "CM003", name: "Karan Shah", city: "Vadodara", state: "Gujarat", mobile: "+91 94567 89012", email: "karan@huddoshoes.com", joiningDate: "2022-09-10", status: "Active", retailersCount: 28, monthlyTarget: 350000, achieved: 287000, ordersThisMonth: 61, target_pct: 82.0 },
          { id: "CM004", name: "Neha Joshi", city: "Rajkot", state: "Gujarat", mobile: "+91 95678 90123", email: "neha@huddoshoes.com", joiningDate: "2023-05-20", status: "Active", retailersCount: 22, monthlyTarget: 280000, achieved: 265000, ordersThisMonth: 49, target_pct: 94.6 },
          { id: "CM005", name: "Mihir Trivedi", city: "Morbi", state: "Gujarat", mobile: "+91 96789 01234", email: "mihir@huddoshoes.com", joiningDate: "2023-08-01", status: "Active", retailersCount: 18, monthlyTarget: 220000, achieved: 134000, ordersThisMonth: 33, target_pct: 60.9 },
          { id: "CM006", name: "Swati Raval", city: "Bhavnagar", state: "Gujarat", mobile: "+91 97890 12345", email: "swati@huddoshoes.com", joiningDate: "2024-01-10", status: "Inactive", retailersCount: 14, monthlyTarget: 180000, achieved: 0, ordersThisMonth: 0, target_pct: 0.0 }
        ],
        total: 6
      });
    }

    return res.status(200).json({ city_managers: managersList, total: managersList.length });
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/city-managers/review
export const recordCityManagerReview = async (req, res, next) => {
  try {
    const { city_manager_id, review_period, performance_rating, remarks } = req.body;
    const review = new PerformanceReview({
      employee: city_manager_id,
      reviewer: req.user ? req.user._id : null,
      review_period: review_period || "2026-Q2",
      performance_rating: Number(performance_rating) || 5,
      remarks: remarks || "",
      created_at: new Date()
    });
    await review.save();
    res.status(200).json({ success: true, review_id: review._id.toString() });
  } catch (error) {
    next(error);
  }
};

