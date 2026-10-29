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

        const cities = await City.find({ state: state._id, is_deleted: { $ne: true } }).select('_id name');
        const cityIds = cities.map(c => c._id);
        const cityNames = cities.map(c => c.name);

        const orders = await Order.find({
          $or: [
            ...(retailerIds.length ? [{ retailer: { $in: retailerIds } }] : []),
            { state: state._id },
            { state_name: state.name },
            ...(cityIds.length ? [{ city: { $in: cityIds } }] : []),
            ...(cityNames.length ? [{ customer_city: { $in: cityNames } }] : [])
          ],
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
          $or: [
            ...(retailerIds.length ? [{ retailer: { $in: retailerIds } }] : []),
            { city: city._id },
            { city_name: city.name },
            { customer_city: city.name }
          ],
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

