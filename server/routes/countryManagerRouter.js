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
import upload from '../middleware/upload.js';
import { saveFileToDisk } from '../utils/fileUpload.js';
import { verifyJWT } from '../middleware/auth.js';
import {
  assignCountryManager,
  assignStateManager,
  cleanupAllOrphanedGeoManagers,
  createManagerUser,
  getAssignedManagerMap,
  getRoleByName,
  unassignStateManager,
  validateCountryAvailable
} from '../utils/managerAssignment.js';
import { DEFAULT_USER_PASSWORD } from '../constants/defaultCredentials.js';

const router = express.Router();

const isValidObjectId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);

// Helper to resolve Country Manager User profile
async function findAllCountryManagerUsers() {
  await cleanupAllOrphanedGeoManagers();

  const cmRole = await Role.findOne({ name: 'CountryManager' });
  const userMap = new Map();

  if (cmRole) {
    const roleUsers = await User.find({
      is_deleted: { $ne: true },
      $or: [
        { role: cmRole._id },
        { roleName: 'CountryManager' },
        { designationName: 'Country Manager' }
      ]
    });

    for (const user of roleUsers) {
      const hasCmRole = user.role?.toString() === cmRole._id.toString();
      if (!hasCmRole && (user.designationName === 'Country Manager' || user.roleName === 'CountryManager')) {
        await User.findByIdAndUpdate(user._id, {
          $set: {
            role: cmRole._id,
            roleName: 'CountryManager',
            designationName: 'Country Manager'
          }
        });
        user.role = cmRole._id;
        user.roleName = 'CountryManager';
        user.designationName = 'Country Manager';
      }
      userMap.set(user._id.toString(), user);
    }
  }

  const managedCountries = await Country.find({ manager: { $ne: null } }).populate('manager');
  managedCountries.forEach((country) => {
    const manager = country.manager;
    if (manager?._id && manager.is_deleted !== true) {
      userMap.set(manager._id.toString(), manager);
    }
  });

  return Array.from(userMap.values());
}

async function resolveCMUser(idStr) {
  if (isValidObjectId(idStr)) {
    const user = await User.findById(idStr).populate('country role');
    if (!user || user.is_deleted) return null;

    const cmRole = await Role.findOne({ name: 'CountryManager' });
    const isCountryManagerRole =
      (cmRole && user.role?._id?.toString() === cmRole._id.toString()) ||
      user.role?.name === 'CountryManager' ||
      user.roleName === 'CountryManager';

    if (isCountryManagerRole) return user;

    const managesCountry = await Country.exists({ manager: user._id, is_deleted: { $ne: true } });
    if (managesCountry) return user;

    return null;
  }

  const user = await User.findOne({ email: 'rajesh@huddoerp.in' });
  return user;
}

async function getCountryContextForUser(user) {
  let countryObj = await Country.findOne({ manager: user._id });
  if (!countryObj && user.country) {
    countryObj = await Country.findById(user.country);
  }

  const states = countryObj
    ? await State.find({ country: countryObj._id, is_deleted: { $ne: true } }).populate('manager')
    : [];
  const stateIds = states.map((state) => state._id);
  const retailers = stateIds.length
    ? await Retailer.find({ state: { $in: stateIds } })
    : [];

  return { countryObj, states, stateIds, retailers };
}

function serializeUserProfileFields(user, countryObj) {
  return {
    residential_address: user.residential_address || null,
    aadhaar_number: user.aadhaar_number || null,
    pan_number: user.pan_number || null,
    department: user.departmentName || null,
    designation: user.designationName || 'Country Manager',
    reporting_to: user.reporting_manager ? user.reporting_manager.toString() : null,
    joining_date: user.joining_date || null,
    salary_structure: user.salary_structure ?? null,
    bank_account_number: user.bank_account_number || null,
    bank_ifsc: user.bank_ifsc || null,
    bank_name: user.bank_name || null,
    assigned_country_id: countryObj ? countryObj._id.toString() : null,
    assigned_country_name: countryObj ? countryObj.name : 'Not Assigned'
  };
}

async function buildPendingApprovals(user, countryObj, stateIds, retailers) {
  if (!countryObj || !stateIds.length) return [];

  const pendingRetailers = await Retailer.find({
    state: { $in: stateIds },
    is_verified: false,
    is_active: true
  });
  const pendingOrders = await Order.find({
    retailer: { $in: retailers.map((retailer) => retailer._id) },
    status: 'Submitted'
  }).populate('retailer created_by');

  const pendingApps = [];
  pendingRetailers.forEach((retailer) => {
    pendingApps.push({
      id: `R-${retailer._id}`,
      country_manager_id: user._id.toString(),
      country_id: countryObj._id.toString(),
      approval_type: 'Retailer_Registration',
      reference_id: retailer._id.toString(),
      reference_type: 'retailer',
      reference_label: `${retailer.business_name} (${retailer.category || 'General'} Category)`,
      submitted_by: retailer.assigned_city_manager ? retailer.assigned_city_manager.toString() : 'City Manager',
      submitted_by_role: 'City Manager',
      submitted_at: retailer.createdAt,
      priority: 'Normal',
      action: 'Pending',
      remarks: ''
    });
  });

  pendingOrders.forEach((order) => {
    pendingApps.push({
      id: `O-${order._id}`,
      country_manager_id: user._id.toString(),
      country_id: countryObj._id.toString(),
      approval_type: 'Large_Order',
      reference_id: order._id.toString(),
      reference_type: 'order',
      reference_label: `${order.retailer ? order.retailer.business_name : 'Retailer'} (Order Value: ₹${order.grand_total || order.subtotal || 0})`,
      submitted_by: order.created_by ? order.created_by.name : 'State Manager',
      submitted_by_role: 'State Manager',
      submitted_at: order.createdAt,
      priority: (order.grand_total || order.subtotal || 0) > 100000 ? 'High' : 'Normal',
      action: 'Pending',
      remarks: ''
    });
  });

  return pendingApps;
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
    
    const users = await findAllCountryManagerUsers();
    const enrichedList = [];
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    for (const user of users) {
      if (status && status !== 'All' && user.status !== status) {
        continue;
      }

      if (search) {
        const regex = new RegExp(search, 'i');
        const matchesSearch =
          regex.test(user.name || '') ||
          regex.test(user.email || '') ||
          regex.test(user.mobile || '') ||
          regex.test(user.employee_id || '') ||
          regex.test(user.user_code || '');
        if (!matchesSearch) continue;
      }

      // Find country managed by this user
      let countryName = 'Not Assigned';
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
      let totalStates = 0;
      if (countryObj) {
        totalStates = await State.countDocuments({ country: countryObj._id, is_deleted: { $ne: true } });
      }
      
      // Calculate current month's revenue
      let currentMonthRevenue = 0;
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
        currentMonthRevenue = orders.reduce((sum, o) => sum + (o.grand_total || o.subtotal || 0), 0);
      }
      
      // Target achievement pct
      let targetAchievementPct = null;
      const targetPeriod = new Date().toISOString().slice(0, 7);
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
        employee_code: user.employee_id || user.user_code || null,
        full_name: user.name,
        mobile_number: user.mobile,
        email: user.email,
        profile_photo_url: user.profile_photo || "",
        assigned_country_id: countryObj ? countryObj._id.toString() : null,
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
router.post('/', verifyJWT, upload.single('profile_photo'), async (req, res, next) => {
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

    if (assigned_country_id && isValidObjectId(assigned_country_id)) {
      try {
        await validateCountryAvailable(assigned_country_id);
      } catch (validationError) {
        return res.status(validationError.statusCode || 400).json({
          success: false,
          message: validationError.message,
          existing_manager_id: validationError.existingManagerId || null
        });
      }
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim(), is_deleted: { $ne: true } });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const existingMobile = await User.findOne({ mobile: mobile_number.trim(), is_deleted: { $ne: true } });
    if (existingMobile) {
      return res.status(400).json({ success: false, message: 'A user with this mobile number already exists.' });
    }
    
    // Generate a unique employee code
    let employee_code = '';
    let isUnique = false;
    while (!isUnique) {
      const rand = Math.floor(100 + Math.random() * 900);
      employee_code = `CM-IN-2026-00${rand}`;
      const existingUser = await User.findOne({ 
        $or: [ { employee_id: employee_code }, { user_code: employee_code } ] 
      });
      if (!existingUser) {
        isUnique = true;
      }
    }

    let final_photo = profile_photo_url || '';
    if (req.file) {
      final_photo = await saveFileToDisk(req.file, 'profile');
    }
    
    // Create new User
    const user = new User({
      name: full_name,
      email: email,
      mobile: mobile_number,
      password: DEFAULT_USER_PASSWORD,
      role: cmRole._id,
      roleName: 'CountryManager',
      designationName: 'Country Manager',
      employee_id: employee_code,
      user_code: employee_code,
      profile_photo: final_photo,
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
    
    if (isValidObjectId(assigned_country_id)) {
      try {
        await assignCountryManager(assigned_country_id, user._id);
      } catch (assignError) {
        await User.findByIdAndDelete(user._id);
        return res.status(assignError.statusCode || 400).json({
          success: false,
          message: assignError.message,
          existing_manager_id: assignError.existingManagerId || null
        });
      }
    }
    
    res.status(201).json({
      success: true,
      cm_id: user._id.toString(),
      employee_code: user.employee_id,
      default_password: DEFAULT_USER_PASSWORD,
      message: `Country Manager created. Default login password: ${DEFAULT_USER_PASSWORD}.`
    });
  } catch (error) {
    if (error.statusCode === 400 || error.existingManagerId) {
      return res.status(400).json({
        success: false,
        message: error.message,
        existing_manager_id: error.existingManagerId || null
      });
    }
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
    
    const { countryObj, states, stateIds, retailers } = await getCountryContextForUser(user);

    const assignedStates = states.map((s, idx) => ({
      id: idx + 1,
      country_manager_id: user._id.toString(),
      state_id: s._id.toString(),
      state_name: s.name,
      state_manager_id: s.manager ? s.manager._id.toString() : null,
      assigned_at: s.createdAt,
      is_active: s.is_active ? 1 : 0
    }));
    
    const targetPeriod = new Date().toISOString().slice(0, 7);
    const targets = await Target.find({ assigned_to: user._id, is_deleted: { $ne: true } });
    
    const groups = {};
    targets.forEach((t) => {
      const key = `${t.period_type}_${t.title}`;
      if (!groups[key]) {
        groups[key] = {
          id: t._id.toString(),
          country_manager_id: user._id.toString(),
          country_id: countryObj ? countryObj._id.toString() : null,
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
          status: 'Not Set'
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
    
    const activeTarget = Object.values(groups).find(t => t.target_period === targetPeriod)
      || Object.values(groups)[0]
      || null;

    const pendingApps = await buildPendingApprovals(user, countryObj, stateIds, retailers);
    const pendingApprovalCount = pendingApps.length;
    const unreadNotificationCount = await Notification.countDocuments({ recipient: user._id, is_read: false });
    
    res.status(200).json({
      id: user._id.toString(),
      user_id: user._id.toString(),
      employee_code: user.employee_id || user.user_code || null,
      full_name: user.name,
      mobile_number: user.mobile,
      email: user.email,
      profile_photo_url: user.profile_photo || '',
      ...serializeUserProfileFields(user, countryObj),
      status: user.status || 'Active',
      assigned_states: assignedStates,
      targets_progress: activeTarget,
      pending_approval_count: pendingApprovalCount,
      unread_notification_count: unreadNotificationCount
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
      employee_code: user.employee_id || user.user_code || null,
      full_name: user.name,
      mobile_number: user.mobile,
      email: user.email,
      profile_photo_url: user.profile_photo || '',
      ...serializeUserProfileFields(user, countryObj),
      status: user.status || 'Active'
    });
  } catch (error) {
    next(error);
  }
});

// 5. PUT /api/v1/country-managers/:id (Update)
router.put('/:id', verifyJWT, upload.single('profile_photo'), async (req, res, next) => {
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
    
    if (req.file) {
      updateData.profile_photo = await saveFileToDisk(req.file, 'profile');
    } else if (req.body.profile_photo_url !== undefined) {
      updateData.profile_photo = req.body.profile_photo_url;
    }
    
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.salary_structure !== undefined) updateData.salary_structure = Number(req.body.salary_structure);
    if (req.body.joining_date !== undefined) updateData.joining_date = req.body.joining_date;
    if (req.body.residential_address !== undefined) updateData.residential_address = req.body.residential_address;
    if (req.body.aadhaar_number !== undefined) updateData.aadhaar_number = req.body.aadhaar_number;
    if (req.body.pan_number !== undefined) updateData.pan_number = req.body.pan_number;
    if (req.body.bank_name !== undefined) updateData.bank_name = req.body.bank_name;
    if (req.body.bank_account_number !== undefined) updateData.bank_account_number = req.body.bank_account_number;
    if (req.body.bank_ifsc !== undefined) updateData.bank_ifsc = req.body.bank_ifsc;
    
    if (isValidObjectId(req.body.assigned_country_id)) {
      const nextCountryId = req.body.assigned_country_id;
      const currentCountry = await Country.findOne({ manager: user._id });
      const isSameCountry = currentCountry?._id?.toString() === nextCountryId;

      if (!isSameCountry) {
        await validateCountryAvailable(nextCountryId, user._id);
      }

      updateData.country = nextCountryId;
      await Country.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
      await assignCountryManager(nextCountryId, user._id);
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
        total_cities: citiesCount,
        total_retailers: retailers.length,
        monthly_revenue: monthlyRevenue,
        monthly_orders: orders.length,
        performance_trend: monthlyRevenue > 0 ? 'Up' : 'Stable'
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

// 7b. GET /api/v1/country-managers/:id/state-manager-candidates
router.get('/:id/state-manager-candidates', verifyJWT, async (req, res, next) => {
  try {
    const { state_id: stateId } = req.query;
    const smRole = await getRoleByName('StateManager');
    if (!smRole) {
      return res.status(200).json({ success: true, candidates: [] });
    }

    const assignments = await getAssignedManagerMap();
    const users = await User.find({
      is_deleted: { $ne: true },
      $or: [
        { role: smRole._id },
        { roleName: 'StateManager' },
        { designationName: 'State Manager' }
      ]
    })
      .select('name email mobile role roleName designationName')
      .sort({ name: 1 });

    const normalizedStateId = stateId?.toString();
    const candidates = [];

    for (const user of users) {
      const userId = user._id.toString();
      const assignment = assignments.get(userId);

      const isUnassigned = !assignment;
      const isCurrentForState =
        normalizedStateId &&
        assignment?.type === 'State' &&
        assignment.entityId === normalizedStateId;

      if (!isUnassigned && !isCurrentForState) continue;

      candidates.push({
        _id: userId,
        name: user.name,
        email: user.email || '',
        mobile: user.mobile || '',
        is_current: !!isCurrentForState
      });
    }

    res.status(200).json({ success: true, candidates });
  } catch (error) {
    next(error);
  }
});

// 7c. POST /api/v1/country-managers/:id/state-manager-users
router.post('/:id/state-manager-users', verifyJWT, async (req, res, next) => {
  try {
    const { name, email, mobile } = req.body;

    if (!name?.trim() || !email?.trim() || !mobile?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and mobile are required.'
      });
    }

    const user = await createManagerUser({
      name,
      email,
      mobile,
      roleName: 'StateManager'
    });
    await user.populate('role');

    res.status(201).json({
      success: true,
      data: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roleName: user.roleName,
        designationName: user.designationName,
        role: user.role ? { name: user.role.name } : null
      },
      default_password: DEFAULT_USER_PASSWORD,
      message: `State Manager user created. Default login password: ${DEFAULT_USER_PASSWORD}.`
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to create state manager.' });
  }
});

// 8. POST /api/v1/country-managers/:id/states/assign-manager
router.post('/:id/states/assign-manager', verifyJWT, async (req, res, next) => {
  try {
    const { state_id, state_manager_id } = req.body;

    if (!isValidObjectId(state_id)) {
      return res.status(400).json({ success: false, message: 'Invalid state ID.' });
    }

    if (!state_manager_id || state_manager_id === 'unassign') {
      await unassignStateManager(state_id);
      return res.status(200).json({ success: true, updated: true, message: 'State manager unassigned.' });
    }

    if (!isValidObjectId(state_manager_id)) {
      return res.status(400).json({ success: false, message: 'Invalid state manager ID.' });
    }

    await assignStateManager(state_id, state_manager_id);
    res.status(200).json({ success: true, updated: true, message: 'State manager assigned.' });
  } catch (error) {
    const status = error.statusCode || 400;
    if (error.message) {
      return res.status(status).json({ success: false, message: error.message });
    }
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
            revenue: monthlyRevenue,
            orders: orders.length,
            retailers: retailers.length,
            target_pct: 0
          }
        });
      }
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
    
    const { countryObj, states, stateIds, retailers } = await getCountryContextForUser(user);
    const pendingApps = await buildPendingApprovals(user, countryObj, stateIds, retailers);

    const dbNotifs = await Notification.find({ recipient: user._id }).sort({ createdAt: -1 }).limit(10);
    const notificationsList = dbNotifs.map((n, idx) => ({
      id: n._id.toString(),
      country_manager_id: user._id.toString(),
      type: n.type || 'Approval_Request',
      title: n.title,
      message: n.message,
      reference_id: n.reference_id ? n.reference_id.toString() : String(idx + 1),
      reference_type: n.reference_type || 'approval',
      is_read: n.is_read ? 1 : 0,
      priority: n.priority || 'Normal',
      created_at: n.createdAt
    }));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfPrevMonth = new Date(startOfMonth);
    startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);
    const endOfPrevMonth = new Date(startOfMonth.getTime() - 1);

    const retailerIds = retailers.map((retailer) => retailer._id);
    const approvedStatuses = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

    const currentOrders = retailerIds.length
      ? await Order.find({ retailer: { $in: retailerIds }, status: { $in: approvedStatuses }, createdAt: { $gte: startOfMonth } })
      : [];
    const prevOrders = retailerIds.length
      ? await Order.find({ retailer: { $in: retailerIds }, status: { $in: approvedStatuses }, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } })
      : [];

    const currentRevenue = currentOrders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0);
    const prevRevenue = prevOrders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0);
    const growth = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 10000) / 100 : 0;

    const targetPeriod = new Date().toISOString().slice(0, 7);
    const [revenueTargetDoc, orderTargetDoc, retailerTargetDoc] = await Promise.all([
      Target.findOne({ assigned_to: user._id, period_type: 'Monthly', title: targetPeriod, kpi_type: 'Revenue', is_deleted: { $ne: true } }),
      Target.findOne({ assigned_to: user._id, period_type: 'Monthly', title: targetPeriod, kpi_type: 'OrderCount', is_deleted: { $ne: true } }),
      Target.findOne({ assigned_to: user._id, period_type: 'Monthly', title: targetPeriod, kpi_type: 'RetailerAcquisition', is_deleted: { $ne: true } })
    ]);

    const revTarget = revenueTargetDoc?.target_value || 0;
    const orderTarget = orderTargetDoc?.target_value || 0;
    const retailerTarget = retailerTargetDoc?.target_value || 0;
    const newRetailersThisMonth = retailers.filter((retailer) => retailer.createdAt >= startOfMonth).length;

    const totalCities = stateIds.length
      ? await City.countDocuments({ state: { $in: stateIds }, is_deleted: { $ne: true } })
      : 0;

    const statePerformance = [];
    for (const state of states) {
      const stateRetailers = retailers.filter((retailer) => retailer.state?.toString() === state._id.toString());
      const stateRetailerIds = stateRetailers.map((retailer) => retailer._id);
      const stateOrders = currentOrders.filter((order) => stateRetailerIds.some((id) => id.toString() === order.retailer?.toString()));
      const stateRevenue = stateOrders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0);
      statePerformance.push({
        state_id: state._id.toString(),
        state_name: state.name,
        state_manager_name: state.manager?.name || 'Not Assigned',
        revenue: stateRevenue,
        orders: stateOrders.length,
        retailers: stateRetailers.length,
        achievement_pct: revTarget > 0 ? Math.round((stateRevenue / revTarget) * 100) : 0,
        rank: 0,
        trend: stateRevenue > 0 ? 'Up' : 'Stable'
      });
    }
    statePerformance.sort((a, b) => b.revenue - a.revenue);
    statePerformance.forEach((entry, index) => { entry.rank = index + 1; });

    const cities = stateIds.length
      ? await City.find({ state: { $in: stateIds }, is_deleted: { $ne: true } }).populate('state')
      : [];
    const cityPerformance = [];
    for (const city of cities) {
      const cityRetailers = retailers.filter((retailer) => retailer.city?.toString() === city._id.toString());
      const cityRetailerIds = cityRetailers.map((retailer) => retailer._id);
      const cityOrders = currentOrders.filter((order) => cityRetailerIds.some((id) => id.toString() === order.retailer?.toString()));
      const cityRevenue = cityOrders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0);
      cityPerformance.push({
        city_name: city.name,
        state_name: city.state?.name || '—',
        revenue: cityRevenue,
        orders: cityOrders.length,
        retailers: cityRetailers.length
      });
    }
    cityPerformance.sort((a, b) => b.revenue - a.revenue);

    const categoryCounts = retailers.reduce((acc, retailer) => {
      const category = retailer.category || 'Unspecified';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      profile_snapshot: {
        name: user.name,
        employee_code: user.employee_id || user.user_code || null,
        assigned_country: countryObj ? countryObj.name : 'Not Assigned',
        status: user.status || 'Active',
        total_states_managed: states.length
      },
      kpi_cards: {
        total_states: states.length,
        total_cities: totalCities,
        total_retailers: retailers.length,
        active_retailers: retailers.filter((retailer) => retailer.is_active).length,
        total_promoters: 0,
        pending_approvals: pendingApps.filter((app) => app.action === 'Pending').length,
        unread_notifications: notificationsList.filter((notification) => !notification.is_read).length
      },
      current_period_targets: {
        revenue: {
          target: revTarget,
          achieved: currentRevenue,
          pct: revTarget > 0 ? Math.round((currentRevenue / revTarget) * 100) : 0,
          trend: currentRevenue >= prevRevenue ? 'Up' : 'Down'
        },
        orders: {
          target: orderTarget,
          achieved: currentOrders.length,
          pct: orderTarget > 0 ? Math.round((currentOrders.length / orderTarget) * 100) : 0
        },
        retailer_acquisition: {
          target: retailerTarget,
          achieved: newRetailersThisMonth,
          pct: retailerTarget > 0 ? Math.round((newRetailersThisMonth / retailerTarget) * 100) : 0
        }
      },
      state_performance: statePerformance,
      city_performance_top10: cityPerformance.slice(0, 10),
      retailer_performance: {
        total: retailers.length,
        active: retailers.filter((retailer) => retailer.is_active).length,
        new_this_month: newRetailersThisMonth,
        by_category: categoryCounts
      },
      revenue_analysis: {
        current_month: currentRevenue,
        previous_month: prevRevenue,
        growth_pct: growth,
        monthly_trend: currentRevenue > 0 || prevRevenue > 0
          ? [{ month: targetPeriod, revenue: currentRevenue }]
          : [],
        quarterly_trend: []
      },
      sales_trends: {
        daily_this_week: [],
        weekly_this_month: [],
        top_products: [],
        top_states: statePerformance.slice(0, 5)
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
    
    const { countryObj, stateIds, retailers } = await getCountryContextForUser(user);
    const pendingApps = await buildPendingApprovals(user, countryObj, stateIds, retailers);
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
      total_pending: totalPending,
      by_type: {
        Retailer_Registration: pendingRetailers,
        Large_Order: pendingOrders.length
      },
      urgent_count: urgentCount,
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
      country_id: null,
      commission_type: 'Country Manager Incentive',
      basis: 'Country Revenue',
      period_type: 'Monthly',
      period_label: c.period || null,
      base_revenue: c.base_revenue || 0,
      commission_percentage: c.rate || 0,
      commission_amount: c.amount || 0,
      bonus_amount: c.bonus || 0,
      total_payable: c.payout || c.amount || 0,
      status: c.status || 'Pending',
      remarks: c.remarks || ''
    }));
    
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
        summary: { total_revenue: 0, total_orders: 0, avg_order_value: 0 },
        by_state: [],
        by_city: [],
        by_product: [],
        daily_breakdown: []
      });
    } else if (type === 'revenue') {
      res.status(200).json({
        monthly_revenue: [],
        quarterly_revenue: [],
        yoy_comparison: { current_year: 0, previous_year: 0, growth_pct: 0 },
        by_category: {}
      });
    } else if (type === 'retailers') {
      res.status(200).json({
        total_retailers: 0,
        active: 0,
        pending: 0,
        new_this_period: 0,
        by_category: {},
        by_state: [],
        top_retailers: []
      });
    } else if (type === 'commissions') {
      res.status(200).json({
        annual_summary: { total_earned: 0, total_paid: 0, pending: 0 },
        monthly_breakdown: []
      });
    } else {
      res.status(200).json({
        total_under_country: { state_managers: 0, city_managers: 0, sales_executives: 0 },
        by_state: [],
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
    const user = await resolveCMUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Country Manager not found' });

    const { states, retailers } = await getCountryContextForUser(user);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const performance = [];
    for (const state of states) {
      const stateRetailers = retailers.filter((retailer) => retailer.state?.toString() === state._id.toString());
      const orders = await Order.find({
        retailer: { $in: stateRetailers.map((retailer) => retailer._id) },
        status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
        createdAt: { $gte: startOfMonth }
      });
      performance.push({
        state_name: state.name,
        revenue: orders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0),
        orders: orders.length,
        retailers: stateRetailers.length
      });
    }

    res.status(200).json(performance);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/analytics/city-performance', verifyJWT, async (req, res, next) => {
  try {
    const user = await resolveCMUser(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Country Manager not found' });

    const { stateIds, retailers } = await getCountryContextForUser(user);
    const cities = stateIds.length
      ? await City.find({ state: { $in: stateIds }, is_deleted: { $ne: true } }).populate('state')
      : [];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const performance = [];
    for (const city of cities) {
      const cityRetailers = retailers.filter((retailer) => retailer.city?.toString() === city._id.toString());
      const orders = await Order.find({
        retailer: { $in: cityRetailers.map((retailer) => retailer._id) },
        status: { $in: ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'] },
        createdAt: { $gte: startOfMonth }
      });
      performance.push({
        city_name: city.name,
        state_name: city.state?.name || '—',
        revenue: orders.reduce((sum, order) => sum + (order.grand_total || order.subtotal || 0), 0),
        orders: orders.length,
        retailers: cityRetailers.length
      });
    }

    res.status(200).json(performance);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/analytics/retailer-performance', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([]);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/analytics/sales-trends', verifyJWT, async (req, res, next) => {
  try {
    res.status(200).json([]);
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
