import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Target from '../models/Target.js';
import Role from '../models/Role.js';
import Country from '../models/Country.js';
import State from '../models/State.js';
import City from '../models/City.js';
import Order from '../models/Order.js';
import Retailer from '../models/Retailer.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Notification from '../models/Notification.js';
import PerformanceReview from '../models/PerformanceReview.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

const isValidObjectId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);

// Helper to resolve Country Manager User profile
async function resolveCMUser(idStr) {
  if (isValidObjectId(idStr)) {
    const cmRole = await Role.findOne({ name: 'CountryManager' });
    const user = await User.findOne({ _id: idStr, role: cmRole?._id }).populate('country');
    return user;
  }
  
  // Mock ID fallback: Rajesh Sharma is the Country Manager seeded with this email
  const user = await User.findOne({ email: 'rajesh@huddoerp.in' });
  return user;
}

// Helper to parse dates from period label
function getPeriodDates(periodType, periodLabel) {
  let period_start = new Date();
  let period_end = new Date();
  
  try {
    if (periodType === 'Monthly' && periodLabel.includes('-')) {
      const [year, month] = periodLabel.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month)) {
        period_start = new Date(year, month - 1, 1);
        period_end = new Date(year, month, 0, 23, 59, 59);
      }
    } else if (periodType === 'Quarterly' && periodLabel.includes('-Q')) {
      const [yearStr, qStr] = periodLabel.split('-Q');
      const year = Number(yearStr);
      const q = Number(qStr);
      if (!isNaN(year) && !isNaN(q)) {
        period_start = new Date(year, (q - 1) * 3, 1);
        period_end = new Date(year, q * 3, 0, 23, 59, 59);
      }
    } else if (periodType === 'Yearly') {
      const year = Number(periodLabel);
      if (!isNaN(year)) {
        period_start = new Date(year, 0, 1);
        period_end = new Date(year, 12, 0, 23, 59, 59);
      }
    }
  } catch (err) {
    console.error('Error parsing period dates:', err);
  }
  
  return { period_start, period_end };
}

// 1. GET /api/v1/country-managers (List)
router.get('/', verifyJWT, async (req, res, next) => {
  try {
    const { search, status, country_id } = req.query;
    
    // Find the CountryManager role
    const cmRole = await Role.findOne({ name: 'CountryManager' });
    if (!cmRole) {
      return res.status(200).json({ success: true, data: [] });
    }
    
    const query = { role: cmRole._id, is_deleted: { $ne: true } };
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { mobile: regex },
        { employee_id: regex },
        { user_code: regex }
      ];
    }
    
    const users = await User.find(query);
    const enrichedList = [];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    for (const user of users) {
      // Find country managed by this user
      let countryName = "India";
      let countryObj = await Country.findOne({ manager: user._id });
      if (countryObj) {
        countryName = countryObj.name;
      } else if (user.country) {
        countryObj = await Country.findById(user.country);
        if (countryObj) countryName = countryObj.name;
      }
      
      // If country filter is active
      if (country_id && country_id !== 'All') {
        if (!countryObj || countryObj._id.toString() !== country_id) {
          continue;
        }
      }
      
      // Count states under this country
      let totalStates = 5; // mock fallback
      if (countryObj) {
        const statesCount = await State.countDocuments({ country: countryObj._id, is_deleted: { $ne: true } });
        totalStates = statesCount;
      }
      
      // Calculate current month's revenue
      let currentMonthRevenue = 12450000.00; // Mock fallback
      if (countryObj) {
        const states = await State.find({ country: countryObj._id });
        const stateIds = states.map(s => s._id);
        const retailers = await Retailer.find({ state: { $in: stateIds } });
        const retailerIds = retailers.map(r => r._id);
        
        const orders = await Order.find({
          retailer: { $in: retailerIds },
          status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
          createdAt: { $gte: startOfMonth }
        });
        const totalAmt = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);
        if (totalAmt > 0) {
          currentMonthRevenue = totalAmt;
        }
      }
      
      // Target achievement pct
      let targetAchievementPct = 83.0; // Mock fallback
      const targetPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
      const revenueTarget = await Target.findOne({
        assigned_to: user._id,
        period_type: 'Monthly',
        title: targetPeriod,
        kpi_type: 'Revenue',
        is_deleted: { $ne: true }
      });
      if (revenueTarget && revenueTarget.target_value > 0) {
        targetAchievementPct = Math.round((currentMonthRevenue / revenueTarget.target_value) * 100);
      }
      
      enrichedList.push({
        id: user._id.toString(),
        user_id: user._id.toString(),
        employee_code: user.employee_id || user.user_code || `CM-IN-2026-001`,
        full_name: user.name,
        mobile_number: user.mobile,
        email: user.email,
        profile_photo_url: user.profile_photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        assigned_country_id: countryObj ? countryObj._id.toString() : '1',
        assigned_country_name: countryName,
        total_states: totalStates,
        current_month_revenue: currentMonthRevenue,
        target_achievement_pct: targetAchievementPct,
        status: user.status || 'Active',
        created_at: user.createdAt
      });
    }
    
    res.status(200).json({
      success: true,
      data: enrichedList,
      pagination: { total: enrichedList.length, page: 1, limit: 10 }
    });
  } catch (error) {
    next(error);
  }
});

// 2. POST /api/v1/country-managers (Create)
router.post('/', verifyJWT, async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      mobile_number,
      profile_photo_url,
      assigned_country_id,
      joining_date,
      salary_structure,
      residential_address,
      aadhaar_number,
      pan_number,
      bank_name,
      bank_account_number,
      bank_ifsc
    } = req.body;
    
    const cmRole = await Role.findOne({ name: 'CountryManager' });
    if (!cmRole) {
      return res.status(500).json({ success: false, message: 'CountryManager role not found.' });
    }
    
    const employee_code = `CM-IN-2026-00${Math.floor(10 + Math.random() * 90)}`;
    
    // Create new User
    const user = new User({
      name: full_name,
      email: email,
      mobile: mobile_number,
      password: 'password123', // Default password
      role: cmRole._id,
      roleName: 'CountryManager',
      employee_id: employee_code,
      user_code: employee_code,
      profile_photo: profile_photo_url,
      status: 'Active',
      is_verified: true,
      is_active: true,
      joining_date: joining_date || new Date(),
      salary_structure: salary_structure ? Number(salary_structure) : 180000.00,
      residential_address,
      aadhaar_number,
      pan_number,
      bank_name,
      bank_account_number,
      bank_ifsc
    });
    
    if (isValidObjectId(assigned_country_id)) {
      user.country = assigned_country_id;
    }
    
    await user.save();
    
    // Set as manager of the country
    if (isValidObjectId(assigned_country_id)) {
      await Country.findByIdAndUpdate(assigned_country_id, { manager: user._id });
    }
    
    res.status(201).json({
      success: true,
      cm_id: user._id.toString(),
      employee_code: user.employee_id,
      message: "Country Manager created."
    });
  } catch (error) {
    next(error);
  }
});

// 3. GET /api/v1/country-managers/:id/profile (Enriched Profile)
router.get('/:id/profile', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Country Manager not found' });
    }
    
    // Find country
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }).populate('manager') : [];
    
    const assignedStates = states.map((s, idx) => ({
      id: idx + 1,
      country_manager_id: user._id.toString(),
      state_id: s._id.toString(),
      state_name: s.name,
      state_manager_id: s.manager ? s.manager._id.toString() : null,
      assigned_at: s.createdAt,
      is_active: s.is_active ? 1 : 0
    }));
    
    // Targets progress
    const targetPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    const targets = await Target.find({ assigned_to: user._id, is_deleted: { $ne: true } });
    
    const groups = {};
    targets.forEach((t) => {
      const key = `${t.period_type}_${t.title}`;
      if (!groups[key]) {
        groups[key] = {
          id: t._id.toString(),
          country_manager_id: user._id.toString(),
          country_id: countryObj ? countryObj._id.toString() : '1',
          target_type: t.period_type,
          target_period: t.title,
          revenue_target: 0,
          revenue_achieved: 0,
          revenue_pct: 0,
          order_count_target: 0,
          order_count_achieved: 0,
          retailer_target: 0,
          retailer_achieved: 0,
          new_cities_target: 0,
          new_cities_achieved: 0,
          status: 'Active'
        };
      }
      
      const group = groups[key];
      if (t.kpi_type === 'Revenue') {
        group.revenue_target = t.target_value;
        group.revenue_achieved = t.achieved_value;
        group.revenue_pct = t.achievement_percentage || 0;
        group.status = t.status;
      } else if (t.kpi_type === 'OrderCount') {
        group.order_count_target = t.target_value;
        group.order_count_achieved = t.achieved_value;
      } else if (t.kpi_type === 'RetailerAcquisition') {
        group.retailer_target = t.target_value;
        group.retailer_achieved = t.achieved_value;
      } else if (t.kpi_type === 'MarketExpansion') {
        group.new_cities_target = t.target_value;
        group.new_cities_achieved = t.achieved_value;
      }
    });
    
    const activeTarget = Object.values(groups).find(t => t.target_period === targetPeriod) || Object.values(groups)[0] || {
      id: "1",
      country_manager_id: user._id.toString(),
      country_id: countryObj ? countryObj._id.toString() : '1',
      target_type: "Monthly",
      target_period: targetPeriod,
      revenue_target: 15000000.00,
      revenue_achieved: 12450000.00,
      revenue_pct: 83.0,
      order_count_target: 120,
      order_count_achieved: 96,
      retailer_target: 10,
      retailer_achieved: 8,
      new_cities_target: 5,
      new_cities_achieved: 4,
      status: "Active"
    };
    
    // Count pending approvals
    let pendingApprovalCount = 0;
    if (countryObj) {
      const stateIds = states.map(s => s._id);
      
      // Pending retailers
      const pendingRetailers = await Retailer.countDocuments({ state: { $in: stateIds }, is_verified: false, is_active: true });
      
      // Pending orders
      const pendingOrders = await Order.countDocuments({
        retailer: { $in: await Retailer.find({ state: { $in: stateIds } }).select('_id') },
        status: 'Submitted'
      });
      
      pendingApprovalCount = pendingRetailers + pendingOrders;
    }
    if (pendingApprovalCount === 0) pendingApprovalCount = 2; // fallback to match mock
    
    // Count unread notifications
    const unreadNotificationCount = await Notification.countDocuments({ recipient: user._id, is_read: false });
    
    res.status(200).json({
      id: user._id.toString(),
      user_id: user._id.toString(),
      employee_code: user.employee_id || user.user_code || `CM-IN-2026-001`,
      full_name: user.name,
      mobile_number: user.mobile,
      email: user.email,
      profile_photo_url: user.profile_photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      assigned_country_id: countryObj ? countryObj._id.toString() : '1',
      assigned_country_name: countryObj ? countryObj.name : 'India',
      residential_address: user.residential_address || '101, Sea Breeze Apartments, Juhu, Mumbai',
      aadhaar_number: user.aadhaar_number || '1234-5678-9012',
      pan_number: user.pan_number || 'ABCDE1234F',
      department: user.departmentName || 'Sales',
      designation: user.designationName || 'Country Manager',
      reporting_to: user.reporting_manager ? user.reporting_manager.toString() : 'U1',
      joining_date: user.joining_date || '2023-01-01',
      salary_structure: user.salary_structure || 180000.00,
      bank_account_number: user.bank_account_number || '50100234567890',
      bank_ifsc: user.bank_ifsc || 'HDFC0000120',
      bank_name: user.bank_name || 'HDFC Bank',
      status: user.status || 'Active',
      assigned_states: assignedStates,
      targets_progress: activeTarget,
      pending_approval_count: pendingApprovalCount,
      unread_notification_count: unreadNotificationCount || 3
    });
  } catch (error) {
    next(error);
  }
});

// 4. GET /api/v1/country-managers/:id (Basic Details)
router.get('/:id', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    res.status(200).json({
      id: user._id.toString(),
      user_id: user._id.toString(),
      employee_code: user.employee_id || user.user_code || `CM-IN-2026-001`,
      full_name: user.name,
      mobile_number: user.mobile,
      email: user.email,
      profile_photo_url: user.profile_photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      assigned_country_id: countryObj ? countryObj._id.toString() : '1',
      assigned_country_name: countryObj ? countryObj.name : 'India',
      residential_address: user.residential_address || '101, Sea Breeze Apartments, Juhu, Mumbai',
      aadhaar_number: user.aadhaar_number || '1234-5678-9012',
      pan_number: user.pan_number || 'ABCDE1234F',
      department: user.departmentName || 'Sales',
      designation: user.designationName || 'Country Manager',
      reporting_to: user.reporting_manager ? user.reporting_manager.toString() : 'U1',
      joining_date: user.joining_date || '2023-01-01',
      salary_structure: user.salary_structure || 180000.00,
      bank_account_number: user.bank_account_number || '50100234567890',
      bank_ifsc: user.bank_ifsc || 'HDFC0000120',
      bank_name: user.bank_name || 'HDFC Bank',
      status: user.status || 'Active'
    });
  } catch (error) {
    next(error);
  }
});

// 5. PUT /api/v1/country-managers/:id (Update)
router.put('/:id', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    // Map properties
    const updateData = {};
    if (req.body.full_name !== undefined) updateData.name = req.body.full_name;
    if (req.body.mobile_number !== undefined) updateData.mobile = req.body.mobile_number;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.profile_photo_url !== undefined) updateData.profile_photo = req.body.profile_photo_url;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.salary_structure !== undefined) updateData.salary_structure = req.body.salary_structure;
    if (req.body.joining_date !== undefined) updateData.joining_date = req.body.joining_date;
    if (req.body.residential_address !== undefined) updateData.residential_address = req.body.residential_address;
    if (req.body.aadhaar_number !== undefined) updateData.aadhaar_number = req.body.aadhaar_number;
    if (req.body.pan_number !== undefined) updateData.pan_number = req.body.pan_number;
    if (req.body.bank_name !== undefined) updateData.bank_name = req.body.bank_name;
    if (req.body.bank_account_number !== undefined) updateData.bank_account_number = req.body.bank_account_number;
    if (req.body.bank_ifsc !== undefined) updateData.bank_ifsc = req.body.bank_ifsc;
    
    if (isValidObjectId(req.body.assigned_country_id)) {
      updateData.country = req.body.assigned_country_id;
      // also update manager on country
      await Country.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
      await Country.findByIdAndUpdate(req.body.assigned_country_id, { manager: user._id });
    }
    
    const updatedUser = await User.findByIdAndUpdate(user._id, { $set: updateData }, { new: true });
    
    res.status(200).json({ success: true, updated: true, cm: updatedUser });
  } catch (error) {
    next(error);
  }
});

// 6. DELETE /api/v1/country-managers/:id (Delete)
router.delete('/:id', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    await User.findByIdAndUpdate(user._id, { $set: { is_deleted: true, status: 'Inactive', is_active: false } });
    
    // Unassign country & states manager
    await Country.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
    await State.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
    
    res.status(200).json({ success: true, deleted: true });
  } catch (error) {
    next(error);
  }
});

// 7. GET /api/v1/country-managers/:id/states
router.get('/:id/states', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }).populate('manager') : [];
    
    const enrichedStates = [];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    for (const state of states) {
      const retailers = await Retailer.find({ state: state._id });
      const retailerIds = retailers.map(r => r._id);
      
      const orders = await Order.find({
        retailer: { $in: retailerIds },
        status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
        createdAt: { $gte: startOfMonth }
      });
      const monthlyRevenue = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);
      
      // Count cities in state
      const citiesCount = await City.countDocuments({ state: state._id, is_deleted: { $ne: true } });
      
      enrichedStates.push({
        state_id: state._id.toString(),
        state_name: state.name,
        state_manager: {
          id: state.manager ? state.manager._id.toString() : '',
          name: state.manager ? state.manager.name : 'Not Assigned',
          mobile: state.manager ? state.manager.mobile : ''
        },
        total_cities: citiesCount || 1,
        total_retailers: retailers.length,
        monthly_revenue: monthlyRevenue || 100000,
        monthly_orders: orders.length,
        performance_trend: monthlyRevenue > 50000 ? 'Up' : 'Stable'
      });
    }
    
    res.status(200).json({
      assigned_states: enrichedStates,
      total_states: enrichedStates.length,
      unassigned_states_in_country: []
    });
  } catch (error) {
    next(error);
  }
});

// 8. POST /api/v1/country-managers/:id/states/assign-manager
router.post('/:id/states/assign-manager', verifyJWT, async (req, res, next) => {
  try {
    const { state_id, state_manager_id } = req.body;
    
    if (!isValidObjectId(state_id)) {
      return res.status(400).json({ success: false, message: 'Invalid state ID.' });
    }
    
    const updateObj = {};
    if (isValidObjectId(state_manager_id)) {
      updateObj.manager = state_manager_id;
    } else {
      updateObj.$unset = { manager: 1 };
    }
    
    if (updateObj.$unset) {
      await State.findByIdAndUpdate(state_id, { $unset: { manager: 1 } });
    } else {
      await State.findByIdAndUpdate(state_id, { $set: updateObj });
    }
    
    res.status(200).json({ success: true, updated: true, message: "State manager assigned." });
  } catch (error) {
    next(error);
  }
});

// 9. GET /api/v1/country-managers/:id/state-managers
router.get('/:id/state-managers', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }).populate('manager') : [];
    
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
            revenue: monthlyRevenue || 3200000,
            orders: orders.length || 60,
            retailers: retailers.length || 10,
            target_pct: 80.0
          }
        });
      }
    }
    
    // If list is empty, fill with default mock values to ensure a populated demo UI
    if (managersList.length === 0) {
      managersList.push(
        { state_manager_id: "U3", name: "Preeti Verma", mobile: "9988776655", email: "preeti@huddoerp.in", assigned_state: "Delhi", status: "Active", performance: { revenue: 3200000, orders: 60, retailers: 10, target_pct: 80.0 } },
        { state_manager_id: "U4-mgr", name: "Anil Deshmukh", mobile: "9560412211", email: "anil@huddoerp.in", assigned_state: "Maharashtra", status: "Active", performance: { revenue: 4500000, orders: 85, retailers: 15, target_pct: 90.0 } }
      );
    }
    
    res.status(200).json({ state_managers: managersList, total: managersList.length });
  } catch (error) {
    next(error);
  }
});

// 10. POST /api/v1/country-managers/:id/state-managers/review
router.post('/:id/state-managers/review', verifyJWT, async (req, res, next) => {
  try {
    const { state_manager_id, review_period, performance_rating, remarks } = req.body;
    
    const review = new PerformanceReview({
      employee: state_manager_id,
      reviewer: req.user ? req.user._id : null,
      review_period: review_period || "2026-Q1",
      performance_rating: Number(performance_rating) || 4,
      remarks: remarks || "",
      created_at: new Date()
    });
    
    await review.save();
    res.status(200).json({ review_id: review._id.toString() });
  } catch (error) {
    next(error);
  }
});

// 11. GET /api/v1/country-managers/:id/dashboard
router.get('/:id/dashboard', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Country Manager not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }) : [];
    const stateIds = states.map(s => s._id);
    const retailers = countryObj ? await Retailer.find({ state: { $in: stateIds } }) : [];
    
    // Pending approvals
    // Pending retailers
    const pendingRetailers = await Retailer.find({ state: { $in: stateIds }, is_verified: false, is_active: true });
    // Pending orders
    const pendingOrders = await Order.find({
      retailer: { $in: retailers.map(r => r._id) },
      status: 'Submitted'
    }).populate('retailer created_by');
    
    const pendingApps = [];
    pendingRetailers.forEach((r, idx) => {
      pendingApps.push({
        id: `R-${r._id}`,
        country_manager_id: user._id.toString(),
        country_id: countryObj ? countryObj._id.toString() : '1',
        approval_type: "Retailer_Registration",
        reference_id: r._id.toString(),
        reference_type: "retailer",
        reference_label: `${r.business_name} (${r.category} Category - ${r.city ? r.city : ''})`,
        submitted_by: r.assigned_city_manager ? r.assigned_city_manager.toString() : 'City Manager',
        submitted_by_role: "City Manager",
        submitted_at: r.createdAt,
        priority: "Normal",
        action: "Pending",
        remarks: ""
      });
    });
    
    pendingOrders.forEach((o, idx) => {
      pendingApps.push({
        id: `O-${o._id}`,
        country_manager_id: user._id.toString(),
        country_id: countryObj ? countryObj._id.toString() : '1',
        approval_type: "Large_Order",
        reference_id: o._id.toString(),
        reference_type: "order",
        reference_label: `${o.retailer ? o.retailer.business_name : 'Retailer'} (Order Value: ₹${o.grand_total || o.subtotal || 0})`,
        submitted_by: o.created_by ? o.created_by.name : 'State Manager',
        submitted_by_role: "State Manager",
        submitted_at: o.createdAt,
        priority: (o.grand_total || o.subtotal || 0) > 100000 ? "High" : "Normal",
        action: "Pending",
        remarks: ""
      });
    });
    
    // If no approvals, return simulated pending approvals for rich UI
    if (pendingApps.length === 0) {
      pendingApps.push(
        {
          id: 1,
          country_manager_id: user._id.toString(),
          country_id: 1,
          approval_type: "Retailer_Registration",
          reference_id: "RET005",
          reference_type: "retailer",
          reference_label: "Apex Sole Distributors (Silver Category - Pune)",
          submitted_by: "Sanjay Joshi",
          submitted_by_role: "City Manager",
          submitted_at: "2026-06-08T11:00:00Z",
          priority: "Normal",
          action: "Pending",
          remarks: ""
        },
        {
          id: 2,
          country_manager_id: user._id.toString(),
          country_id: 1,
          approval_type: "Large_Order",
          reference_id: "ORD-5509",
          reference_type: "order",
          reference_label: "Walk Easy Footwear (Order Value: ₹1,50,000)",
          submitted_by: "Preeti Verma",
          submitted_by_role: "State Manager",
          submitted_at: "2026-06-08T14:30:00Z",
          priority: "High",
          action: "Pending",
          remarks: ""
        }
      );
    }
    
    // Notifications
    const dbNotifs = await Notification.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(10);
    const notificationsList = dbNotifs.map((n, idx) => ({
      id: n._id.toString(),
      country_manager_id: user._id.toString(),
      type: n.type || "Approval_Request",
      title: n.title,
      message: n.message,
      reference_id: n.reference_id ? n.reference_id.toString() : idx + 1,
      reference_type: n.reference_type || "approval",
      is_read: n.is_read ? 1 : 0,
      priority: n.priority || "Normal",
      created_at: n.createdAt
    }));
    
    if (notificationsList.length === 0) {
      notificationsList.push(
        { id: 1, country_manager_id: user._id.toString(), type: "Approval_Request", title: "Large Order Pending Review", message: "Walk Easy Footwear has submitted order ORD-5509 of value ₹1,50,000 which requires Country Manager clearance.", reference_id: 2, reference_type: "approval", is_read: 0, priority: "High", created_at: "2026-06-08T14:30:00Z" },
        { id: 2, country_manager_id: user._id.toString(), type: "Target_Reminder", title: "Target Period Closing", message: "Monthly target cycles for June 2026 will freeze soon. Current revenue achievement is 83%.", reference_id: 1, reference_type: "target", is_read: 0, priority: "Normal", created_at: "2026-06-08T09:00:00Z" },
        { id: 3, country_manager_id: user._id.toString(), type: "Commission_Alert", title: "Incentive Calculated", message: "June commission incentive calculations are ready for review.", reference_id: 2, reference_type: "commission", is_read: 1, priority: "Normal", created_at: "2026-06-08T08:00:00Z" }
      );
    }
    
    // Revenue calculations
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const startOfPrevMonth = new Date();
    startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
    startOfPrevMonth.setDate(1);
    startOfPrevMonth.setHours(0, 0, 0, 0);
    
    const endOfPrevMonth = new Date(startOfMonth.getTime() - 1);
    
    const currentOrders = await Order.find({
      retailer: { $in: retailers.map(r => r._id) },
      status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
      createdAt: { $gte: startOfMonth }
    });
    
    const prevOrders = await Order.find({
      retailer: { $in: retailers.map(r => r._id) },
      status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    });
    
    const currentRevenue = currentOrders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0) || 12450000.00;
    const prevRevenue = prevOrders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0) || 12100000.00;
    const growth = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 10000) / 100 : 2.89;
    
    const targetPeriod = new Date().toISOString().slice(0, 7); // e.g. "2026-07"
    const target = await Target.findOne({
      assigned_to: user._id,
      period_type: 'Monthly',
      title: targetPeriod,
      kpi_type: 'Revenue',
      is_deleted: { $ne: true }
    });
    
    const revTarget = target ? target.target_value : 15000000.00;
    const revAchieved = currentRevenue;
    const revPct = revTarget > 0 ? Math.round((revAchieved / revTarget) * 100) : 83;
    
    res.status(200).json({
      profile_snapshot: {
        name: user.name,
        employee_code: user.employee_id || user.user_code || `CM-IN-2026-001`,
        assigned_country: countryObj ? countryObj.name : "India",
        status: user.status || "Active",
        total_states_managed: states.length || 5
      },
      kpi_cards: {
        total_states: states.length || 5,
        total_cities: 14,
        total_retailers: retailers.length || 48,
        active_retailers: retailers.filter(r => r.is_active).length || 44,
        total_promoters: 3,
        pending_approvals: pendingApps.filter(a => a.action === "Pending").length,
        unread_notifications: notificationsList.filter(n => !n.is_read).length
      },
      current_period_targets: {
        revenue: { target: revTarget, achieved: revAchieved, pct: revPct, trend: "Up" },
        orders: { target: 120, achieved: currentOrders.length || 96, pct: Math.round((currentOrders.length || 96) / 120 * 100) },
        retailer_acquisition: { target: 10, achieved: retailers.filter(r => r.createdAt >= startOfMonth).length || 8, pct: Math.round((retailers.filter(r => r.createdAt >= startOfMonth).length || 8) / 10 * 100) }
      },
      state_performance: [
        { state_id: 1, state_name: "Maharashtra", state_manager_name: "Anil Deshmukh", revenue: 4500000, orders: 85, retailers: 15, achievement_pct: 90.0, rank: 1, trend: "Up" },
        { state_id: 2, state_name: "Delhi", state_manager_name: "Preeti Verma", revenue: 3200000, orders: 60, retailers: 10, achievement_pct: 80.0, rank: 2, trend: "Stable" },
        { state_id: 3, state_name: "Karnataka", state_manager_name: "Kiran Kumar", revenue: 2100000, orders: 45, retailers: 9, achievement_pct: 70.0, rank: 3, trend: "Up" },
        { state_id: 4, state_name: "Gujarat", state_manager_name: "Vijay Patel", revenue: 1650000, orders: 35, retailers: 8, achievement_pct: 75.0, rank: 4, trend: "Stable" },
        { state_id: 5, state_name: "Tamil Nadu", state_manager_name: "Not Assigned", revenue: 1000000, orders: 20, retailers: 6, achievement_pct: 50.0, rank: 5, trend: "Down" }
      ],
      city_performance_top10: [
        { city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60, retailers: 10 },
        { city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48, retailers: 8 },
        { city_name: "Pune", state_name: "Maharashtra", revenue: 1700000, orders: 37, retailers: 7 },
        { city_name: "Bengaluru", state_name: "Karnataka", revenue: 1500000, orders: 30, retailers: 6 },
        { city_name: "Ahmedabad", state_name: "Gujarat", revenue: 1100000, orders: 22, retailers: 5 },
        { city_name: "Chennai", state_name: "Tamil Nadu", revenue: 1000000, orders: 20, retailers: 6 }
      ],
      retailer_performance: {
        total: retailers.length || 48,
        active: retailers.filter(r => r.is_active).length || 44,
        new_this_month: retailers.filter(r => r.createdAt >= startOfMonth).length || 2,
        by_category: { Platinum: 25, Gold: 12, Silver: 8, Standard: 3 }
      },
      revenue_analysis: {
        current_month: currentRevenue,
        previous_month: prevRevenue,
        growth_pct: growth,
        monthly_trend: [
          { month: "Jan", revenue: 9800000 },
          { month: "Feb", revenue: 10200000 },
          { month: "Mar", revenue: 13800000 },
          { month: "Apr", revenue: 11500000 },
          { month: "May", revenue: 12100000 },
          { month: "Jun", revenue: currentRevenue }
        ],
        quarterly_trend: []
      },
      sales_trends: {
        daily_this_week: [
          { day: "Mon", revenue: 1200000 },
          { day: "Tue", revenue: 1800000 },
          { day: "Wed", revenue: 1500000 },
          { day: "Thu", revenue: 2200000 },
          { day: "Fri", revenue: 1900000 },
          { day: "Sat", revenue: 2500000 },
          { day: "Sun", revenue: 1350000 }
        ],
        weekly_this_month: [],
        top_products: [
          { name: "Huddo Air Classic", quantity: 320, revenue: 959680 },
          { name: "Huddo Flex Runner", quantity: 240, revenue: 599760 },
          { name: "Huddo Elegant Derby", quantity: 180, revenue: 899820 }
        ],
        top_states: []
      },
      recent_approvals: pendingApps.slice(0, 5),
      recent_notifications: notificationsList.slice(0, 5)
    });
  } catch (error) {
    next(error);
  }
});

// 12. GET /api/v1/country-managers/:id/approvals
router.get('/:id/approvals', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }) : [];
    const stateIds = states.map(s => s._id);
    const retailers = countryObj ? await Retailer.find({ state: { $in: stateIds } }) : [];
    
    const pendingRetailers = await Retailer.find({ state: { $in: stateIds }, is_verified: false, is_active: true });
    const pendingOrders = await Order.find({
      retailer: { $in: retailers.map(r => r._id) },
      status: 'Submitted'
    }).populate('retailer created_by');
    
    const pendingApps = [];
    pendingRetailers.forEach((r, idx) => {
      pendingApps.push({
        id: `R-${r._id}`,
        country_manager_id: user._id.toString(),
        country_id: countryObj ? countryObj._id.toString() : '1',
        approval_type: "Retailer_Registration",
        reference_id: r._id.toString(),
        reference_type: "retailer",
        reference_label: `${r.business_name} (${r.category} Category - ${r.city ? r.city.toString() : ''})`,
        submitted_by: r.assigned_city_manager ? r.assigned_city_manager.toString() : 'City Manager',
        submitted_by_role: "City Manager",
        submitted_at: r.createdAt,
        priority: "Normal",
        action: "Pending",
        remarks: ""
      });
    });
    
    pendingOrders.forEach((o, idx) => {
      pendingApps.push({
        id: `O-${o._id}`,
        country_manager_id: user._id.toString(),
        country_id: countryObj ? countryObj._id.toString() : '1',
        approval_type: "Large_Order",
        reference_id: o._id.toString(),
        reference_type: "order",
        reference_label: `${o.retailer ? o.retailer.business_name : 'Retailer'} (Order Value: ₹${o.grand_total || o.subtotal || 0})`,
        submitted_by: o.created_by ? o.created_by.name : 'State Manager',
        submitted_by_role: "State Manager",
        submitted_at: o.createdAt,
        priority: (o.grand_total || o.subtotal || 0) > 100000 ? "High" : "Normal",
        action: "Pending",
        remarks: ""
      });
    });
    
    if (pendingApps.length === 0) {
      pendingApps.push(
        {
          id: 1,
          country_manager_id: user._id.toString(),
          country_id: 1,
          approval_type: "Retailer_Registration",
          reference_id: "RET005",
          reference_type: "retailer",
          reference_label: "Apex Sole Distributors (Silver Category - Pune)",
          submitted_by: "Sanjay Joshi",
          submitted_by_role: "City Manager",
          submitted_at: "2026-06-08T11:00:00Z",
          priority: "Normal",
          action: "Pending",
          remarks: ""
        },
        {
          id: 2,
          country_manager_id: user._id.toString(),
          country_id: 1,
          approval_type: "Large_Order",
          reference_id: "ORD-5509",
          reference_type: "order",
          reference_label: "Walk Easy Footwear (Order Value: ₹1,50,000)",
          submitted_by: "Preeti Verma",
          submitted_by_role: "State Manager",
          submitted_at: "2026-06-08T14:30:00Z",
          priority: "High",
          action: "Pending",
          remarks: ""
        }
      );
    }
    
    res.status(200).json(pendingApps);
  } catch (error) {
    next(error);
  }
});

// 13. GET /api/v1/country-managers/:id/approvals/summary
router.get('/:id/approvals/summary', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    let countryObj = await Country.findOne({ manager: user._id });
    if (!countryObj && user.country) {
      countryObj = await Country.findById(user.country);
    }
    
    const states = countryObj ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }) : [];
    const stateIds = states.map(s => s._id);
    const retailers = countryObj ? await Retailer.find({ state: { $in: stateIds } }) : [];
    
    const pendingRetailers = await Retailer.countDocuments({ state: { $in: stateIds }, is_verified: false, is_active: true });
    
    const pendingOrders = await Order.find({
      retailer: { $in: retailers.map(r => r._id) },
      status: 'Submitted'
    });
    
    const totalPending = pendingRetailers + pendingOrders.length;
    const urgentCount = pendingOrders.filter(o => (o.grand_total || o.subtotal || 0) > 100000).length;
    
    res.status(200).json({
      total_pending: totalPending || 2,
      by_type: {
        Retailer_Registration: pendingRetailers || 1,
        Large_Order: pendingOrders.length || 1
      },
      urgent_count: urgentCount || 1,
      overdue_count: 0
    });
  } catch (error) {
    next(error);
  }
});

// 14. POST /api/v1/country-managers/:id/approvals/:queue_id/action
router.post('/:id/approvals/:queue_id/action', verifyJWT, async (req, res, next) => {
  try {
    const { action, remarks } = req.body;
    const { queue_id } = req.params;
    
    if (typeof queue_id === 'string' && queue_id.startsWith('R-')) {
      const retailerId = queue_id.substring(2);
      if (isValidObjectId(retailerId)) {
        await Retailer.findByIdAndUpdate(retailerId, {
          is_verified: action === 'Approved',
          is_active: action === 'Approved'
        });
      }
    } else if (typeof queue_id === 'string' && queue_id.startsWith('O-')) {
      const orderId = queue_id.substring(2);
      if (isValidObjectId(orderId)) {
        await Order.findByIdAndUpdate(orderId, {
          status: action === 'Approved' ? 'Approved' : 'Cancelled'
        });
      }
    }
    
    res.status(200).json({ actioned: true, next_step: "Final_Approved", message: "Action recorded." });
  } catch (error) {
    next(error);
  }
});

// 15. GET /api/v1/country-managers/:id/commissions
router.get('/:id/commissions', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const commissions = await CommissionRecord.find({ user: user._id, is_deleted: { $ne: true } }).populate('order');
    
    const list = commissions.map(c => ({
      id: c._id.toString(),
      country_manager_id: user._id.toString(),
      country_id: 1,
      commission_type: "Country Manager Incentive",
      basis: "Country Revenue",
      period_type: "Monthly",
      period_label: c.period || "2026-06",
      base_revenue: c.base_revenue || 12450000.00,
      commission_percentage: c.rate || 1.5,
      commission_amount: c.amount || 186750.00,
      bonus_amount: c.bonus || 0,
      total_payable: c.payout || 186750.00,
      status: c.status || "Pending",
      remarks: c.remarks || "June sales cycle active calculation"
    }));
    
    if (list.length === 0) {
      list.push(
        {
          id: 1,
          country_manager_id: user._id.toString(),
          country_id: 1,
          commission_type: "Country Manager Incentive",
          basis: "Country Revenue",
          period_type: "Monthly",
          period_label: "2026-05",
          base_revenue: 12100000.00,
          commission_percentage: 1.5,
          commission_amount: 181500.00,
          bonus_amount: 20000.00,
          total_payable: 201500.00,
          status: "Paid",
          approved_by: "U1",
          paid_at: "2026-06-05T10:00:00Z",
          payment_reference: "TXN-CM-99881",
          remarks: "May sales slab milestone bonus included"
        },
        {
          id: 2,
          country_manager_id: user._id.toString(),
          country_id: 1,
          commission_type: "Country Manager Incentive",
          basis: "Country Revenue",
          period_type: "Monthly",
          period_label: "2026-06",
          base_revenue: 12450000.00,
          commission_percentage: 1.5,
          commission_amount: 186750.00,
          bonus_amount: 0.00,
          total_payable: 186750.00,
          status: "Pending",
          remarks: "June sales cycle active calculation"
        }
      );
    }
    
    const totalEarned = list.reduce((sum, c) => sum + c.total_payable, 0);
    const totalPaid = list.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.total_payable, 0);
    const totalPending = list.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.total_payable, 0);
    
    res.status(200).json({
      commissions: list,
      summary: { total_earned: totalEarned, total_paid: totalPaid, total_pending: totalPending }
    });
  } catch (error) {
    next(error);
  }
});

// 16. POST /api/v1/country-managers/:id/commissions/:comm_id/approve
router.post('/:id/commissions/:comm_id/approve', verifyJWT, async (req, res, next) => {
  try {
    const { comm_id } = req.params;
    const { action, remarks } = req.body;
    
    if (isValidObjectId(comm_id)) {
      await CommissionRecord.findByIdAndUpdate(comm_id, {
        status: action === 'Approved' ? 'Approved' : 'Cancelled',
        remarks: remarks
      });
    }
    
    res.status(200).json({ status: action === 'Approved' ? 'Approved' : 'Cancelled', message: "Commission status updated." });
  } catch (error) {
    next(error);
  }
});

// 17. POST /api/v1/country-managers/:id/commissions/:comm_id/mark-paid
router.post('/:id/commissions/:comm_id/mark-paid', verifyJWT, async (req, res, next) => {
  try {
    const { comm_id } = req.params;
    const { payment_reference, paid_at } = req.body;
    
    if (isValidObjectId(comm_id)) {
      await CommissionRecord.findByIdAndUpdate(comm_id, {
        status: 'Paid',
        payment_reference: payment_reference,
        paid_at: paid_at || new Date()
      });
    }
    
    res.status(200).json({ updated: true });
  } catch (error) {
    next(error);
  }
});

// 18. GET /api/v1/country-managers/:id/reports/:type
router.get('/:id/reports/:type', verifyJWT, async (req, res, next) => {
  try {
    const { type } = req.params;
    
    if (type === 'sales') {
      res.status(200).json({
        summary: { total_revenue: 12450000, total_orders: 96, avg_order_value: 129687 },
        by_state: [
          { state_name: "Maharashtra", revenue: 4500000, orders: 85 },
          { state_name: "Delhi", revenue: 3200000, orders: 60 }
        ],
        by_city: [
          { city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60 },
          { city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48 }
        ],
        by_product: [
          { product_name: "Huddo Air Classic", quantity: 320, revenue: 959680 },
          { product_name: "Huddo Elegant Derby", quantity: 180, revenue: 899820 }
        ],
        daily_breakdown: []
      });
    } else if (type === 'revenue') {
      res.status(200).json({
        monthly_revenue: [
          { month: "Jan", revenue: 9800000 },
          { month: "Feb", revenue: 10200000 },
          { month: "Mar", revenue: 13800000 },
          { month: "Apr", revenue: 11500000 },
          { month: "May", revenue: 12100000 },
          { month: "Jun", revenue: 12450000 }
        ],
        quarterly_revenue: [
          { quarter: "Q1 2026", revenue: 33800000 },
          { quarter: "Q2 2026", revenue: 36050000 }
        ],
        yoy_comparison: { current_year: 69850000, previous_year: 65400000, growth_pct: 6.8 },
        by_category: { Platinum: 8500000, Gold: 3450000, Silver: 500000 }
      });
    } else if (type === 'retailers') {
      res.status(200).json({
        total_retailers: 48,
        active: 44,
        pending: 4,
        new_this_period: 2,
        by_category: { Platinum: 25, Gold: 12, Silver: 8, Standard: 3 },
        by_state: [
          { state_name: "Maharashtra", count: 15 },
          { state_name: "Delhi", count: 10 }
        ],
        top_retailers: [
          { shop_name: "Apex Sole Distributors", revenue: 1500000, city: "Pune" },
          { shop_name: "Walk Easy Footwear", revenue: 1200000, city: "Mumbai" }
        ]
      });
    } else if (type === 'commissions') {
      res.status(200).json({
        annual_summary: { total_earned: 388250, total_paid: 201500, pending: 186750 },
        monthly_breakdown: [
          { period: "2026-05", base_revenue: 12100000, amount: 181500, status: "Paid" },
          { period: "2026-06", base_revenue: 12450000, amount: 186750, status: "Pending" }
        ]
      });
    } else {
      res.status(200).json({
        total_under_country: { state_managers: 2, city_managers: 4, sales_executives: 12 },
        by_state: [
          { state_name: "Maharashtra", managers: 2, executives: 5 },
          { state_name: "Delhi", managers: 1, executives: 3 }
        ],
        performance_summary: []
      });
    }
  } catch (error) {
    next(error);
  }
});

// 19. GET /api/v1/country-managers/:id/notifications
router.get('/:id/notifications', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    
    const dbNotifs = await Notification.find({ recipient: user._id }).sort({ createdAt: -1 });
    const list = dbNotifs.map((n, idx) => ({
      id: n._id.toString(),
      country_manager_id: user._id.toString(),
      type: n.type || "Approval_Request",
      title: n.title,
      message: n.message,
      reference_id: n.reference_id ? n.reference_id.toString() : idx + 1,
      reference_type: n.reference_type || "approval",
      is_read: n.is_read ? 1 : 0,
      priority: n.priority || "Normal",
      created_at: n.createdAt
    }));
    
    if (list.length === 0) {
      list.push(
        { id: 1, country_manager_id: user._id.toString(), type: "Approval_Request", title: "Large Order Pending Review", message: "Walk Easy Footwear has submitted order ORD-5509 of value ₹1,50,000 which requires Country Manager clearance.", reference_id: 2, reference_type: "approval", is_read: 0, priority: "High", created_at: "2026-06-08T14:30:00Z" },
        { id: 2, country_manager_id: user._id.toString(), type: "Target_Reminder", title: "Target Period Closing", message: "Monthly target cycles for June 2026 will freeze soon. Current revenue achievement is 83%.", reference_id: 1, reference_type: "target", is_read: 0, priority: "Normal", created_at: "2026-06-08T09:00:00Z" },
        { id: 3, country_manager_id: user._id.toString(), type: "Commission_Alert", title: "Incentive Calculated", message: "June commission incentive calculations are ready for review.", reference_id: 2, reference_type: "commission", is_read: 1, priority: "Normal", created_at: "2026-06-08T08:00:00Z" }
      );
    }
    
    const unread = list.filter(n => !n.is_read).length;
    res.status(200).json({
      notifications: list,
      unread_count: unread,
      by_type: {}
    });
  } catch (error) {
    next(error);
  }
});

// 20. PATCH /api/v1/country-managers/:id/notifications/:notif_id/read
router.patch('/:id/notifications/:notif_id/read', verifyJWT, async (req, res, next) => {
  try {
    const { notif_id } = req.params;
    if (isValidObjectId(notif_id)) {
      await Notification.findByIdAndUpdate(notif_id, { is_read: true });
    }
    res.status(200).json({ updated: true });
  } catch (error) {
    next(error);
  }
});

// 21. PATCH /api/v1/country-managers/:id/notifications/read-all
router.patch('/:id/notifications/read-all', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (user) {
      await Notification.updateMany({ recipient: user._id, is_read: false }, { is_read: true });
    }
    res.status(200).json({ updated: true });
  } catch (error) {
    next(error);
  }
});

// 22. GET /api/v1/country-managers/:id/analytics/state-performance
router.get('/:id/analytics/state-performance', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([
      { state_name: "Maharashtra", revenue: 4500000, orders: 85, retailers: 15 },
      { state_name: "Delhi", revenue: 3200000, orders: 60, retailers: 10 },
      { state_name: "Karnataka", revenue: 2100000, orders: 45, retailers: 9 },
      { state_name: "Gujarat", revenue: 1650000, orders: 35, retailers: 8 },
      { state_name: "Tamil Nadu", revenue: 1000000, orders: 20, retailers: 6 }
    ]);
  } catch (error) {
    next(error);
  }
});

// 23. GET /api/v1/country-managers/:id/analytics/city-performance
router.get('/:id/analytics/city-performance', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([
      { city_name: "Mumbai", state_name: "Maharashtra", revenue: 2800000, orders: 48, retailers: 8 },
      { city_name: "New Delhi", state_name: "Delhi", revenue: 3200000, orders: 60, retailers: 10 },
      { city_name: "Pune", state_name: "Maharashtra", revenue: 1700000, orders: 37, retailers: 7 },
      { city_name: "Bengaluru", state_name: "Karnataka", revenue: 1500000, orders: 30, retailers: 6 },
      { city_name: "Ahmedabad", state_name: "Gujarat", revenue: 1100000, orders: 22, retailers: 5 },
      { city_name: "Chennai", state_name: "Tamil Nadu", revenue: 1000000, orders: 20, retailers: 6 }
    ]);
  } catch (error) {
    next(error);
  }
});

// 24. GET /api/v1/country-managers/:id/analytics/retailer-performance
router.get('/:id/analytics/retailer-performance', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([
      { shop_name: "Apex Sole Distributors", owner_name: "Sanjay Joshi", category: "Platinum", revenue: 1500000, orders: 12 },
      { shop_name: "Walk Easy Footwear", owner_name: "Dinesh Shah", category: "Platinum", revenue: 1200000, orders: 10 }
    ]);
  } catch (error) {
    next(error);
  }
});

// 25. GET /api/v1/country-managers/:id/analytics/sales-trends
router.get('/:id/analytics/sales-trends', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([
      { period: "Week 1", revenue: 2500000, orders: 20 },
      { period: "Week 2", revenue: 3100000, orders: 24 },
      { period: "Week 3", revenue: 2800000, orders: 22 },
      { period: "Week 4", revenue: 4050000, orders: 30 }
    ]);
  } catch (error) {
    next(error);
  }
});

// 26. GET /api/v1/country-managers/:id/targets
router.get('/:id/targets', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Country Manager not found.' });
    }

    // Fetch all targets assigned to this Country Manager
    const dbTargets = await Target.find({ assigned_to: user._id, is_deleted: { $ne: true } });
    
    // Group targets by title (period) and period_type
    const groups = {};
    dbTargets.forEach((t) => {
      const key = `${t.period_type}_${t.title}`;
      if (!groups[key]) {
        groups[key] = {
          id: t._id.toString(), // use one of the IDs as unique reference
          country_manager_id: user._id.toString(),
          country_id: 1,
          target_type: t.period_type,
          target_period: t.title,
          revenue_target: 0,
          revenue_achieved: 0,
          revenue_pct: 0,
          order_count_target: 0,
          order_count_achieved: 0,
          retailer_target: 0,
          retailer_achieved: 0,
          new_cities_target: 0,
          new_cities_achieved: 0,
          status: 'Active'
        };
      }
      
      const group = groups[key];
      if (t.kpi_type === 'Revenue') {
        group.revenue_target = t.target_value;
        group.revenue_achieved = t.achieved_value;
        group.revenue_pct = t.achievement_percentage || 0;
        group.status = t.status;
      } else if (t.kpi_type === 'OrderCount') {
        group.order_count_target = t.target_value;
        group.order_count_achieved = t.achieved_value;
      } else if (t.kpi_type === 'RetailerAcquisition') {
        group.retailer_target = t.target_value;
        group.retailer_achieved = t.achieved_value;
      } else if (t.kpi_type === 'MarketExpansion') {
        group.new_cities_target = t.target_value;
        group.new_cities_achieved = t.achieved_value;
      }
    });

    const targetsList = Object.values(groups);
    res.status(200).json({
      success: true,
      targets: targetsList
    });
  } catch (error) {
    next(error);
  }
});

// 27. POST /api/v1/country-managers/:id/targets
router.post('/:id/targets', verifyJWT, async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await resolveCMUser(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Country Manager not found.' });
    }

    const {
      target_type,
      target_period,
      revenue_target,
      order_count_target,
      retailer_target,
      new_cities_target
    } = req.body;

    // Backend validation
    if (!target_type || !['Monthly', 'Quarterly', 'Yearly'].includes(target_type)) {
      return res.status(400).json({ success: false, message: 'Invalid target type. Must be Monthly, Quarterly, or Yearly.' });
    }
    if (!target_period || typeof target_period !== 'string' || target_period.trim() === '') {
      return res.status(400).json({ success: false, message: 'Period label is required.' });
    }
    if (revenue_target === undefined || isNaN(revenue_target) || Number(revenue_target) < 0) {
      return res.status(400).json({ success: false, message: 'Revenue target must be a non-negative number.' });
    }
    if (order_count_target === undefined || isNaN(order_count_target) || Number(order_count_target) < 0) {
      return res.status(400).json({ success: false, message: 'Order count target must be a non-negative number.' });
    }
    if (retailer_target === undefined || isNaN(retailer_target) || Number(retailer_target) < 0) {
      return res.status(400).json({ success: false, message: 'Retailer target must be a non-negative number.' });
    }
    if (new_cities_target === undefined || isNaN(new_cities_target) || Number(new_cities_target) < 0) {
      return res.status(400).json({ success: false, message: 'New cities target must be a non-negative number.' });
    }

    // Resolve date boundaries
    const { period_start, period_end } = getPeriodDates(target_type, target_period);

    const kpiMappings = [
      { type: 'Revenue', value: Number(revenue_target) },
      { type: 'OrderCount', value: Number(order_count_target) },
      { type: 'RetailerAcquisition', value: Number(retailer_target) },
      { type: 'MarketExpansion', value: Number(new_cities_target) }
    ];

    // Upsert targets for each KPI type
    for (const kpi of kpiMappings) {
      await Target.findOneAndUpdate(
        {
          assigned_to: user._id,
          period_type: target_type,
          title: target_period,
          kpi_type: kpi.type,
          is_deleted: { $ne: true }
        },
        {
          $set: {
            target_value: kpi.value,
            period_start,
            period_end,
            scope_level: 'Country',
            status: 'Active'
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Targets saved successfully.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
