import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import GPSLog from '../models/GPSLog.js';
import RetailSale from '../models/RetailSale.js';
import ProductVariant from '../models/ProductVariant.js';
import Product from '../models/Product.js';
import City from '../models/City.js';
import State from '../models/State.js';
import Country from '../models/Country.js';
import CommissionRecord from '../models/CommissionRecord.js';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import { calculateSingleEmployeePayroll } from '../controllers/payrollController.js';

const router = express.Router();

// Helper to resolve employee/user identity
async function resolveIdentity(req) {
  let user = req.user;
  if (!user && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret_key_change_me_in_production');
      if (decoded?.id) {
        user = await User.findById(decoded.id).populate('role');
      }
    } catch {}
  }

  let employee = null;

  if (user && user._id) {
    employee = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } });
  }

  // Fallback for dev / unauthenticated requests
  if (!user) {
    user = await User.findOne({ is_active: true, is_deleted: { $ne: true } });
  }
  if (!employee && user) {
    employee = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } });
  }
  if (!employee) {
    employee = await Employee.findOne({ is_deleted: { $ne: true } });
  }

  return { user, employee };
}

// ==========================================
// 1. LEAVE MANAGEMENT ENDPOINTS
// ==========================================

const INITIAL_SEED_LEAVES = [
  { request_id: "LR-101", leave_type: "Sick Leave", from_date: new Date("2026-06-10"), to_date: new Date("2026-06-11"), days: 2, reason: "Viral fever recovery", status: "Approved" },
  { request_id: "LR-102", leave_type: "Casual Leave", from_date: new Date("2026-05-12"), to_date: new Date("2026-05-13"), days: 2, reason: "Family event in hometown", status: "Approved" },
  { request_id: "LR-103", leave_type: "Earned Leave", from_date: new Date("2026-04-15"), to_date: new Date("2026-04-18"), days: 4, reason: "Self marriages/relatives attendance", status: "Approved" },
  { request_id: "LR-104", leave_type: "Casual Leave", from_date: new Date("2026-06-25"), to_date: new Date("2026-06-26"), days: 2, reason: "Urgent personal work at home", status: "Pending" },
  { request_id: "LR-105", leave_type: "Sick Leave", from_date: new Date("2026-03-04"), to_date: new Date("2026-03-04"), days: 1, reason: "Severe migraine", status: "Approved" },
  { request_id: "LR-106", leave_type: "Earned Leave", from_date: new Date("2026-02-10"), to_date: new Date("2026-02-15"), days: 5, reason: "Leisure travel with parents", status: "Rejected" }
];

function calculateBalances(requests) {
  const quotas = {
    casual: 12,
    sick: 6,
    earned: 15
  };

  const used = {
    casual: 0,
    sick: 0,
    earned: 0
  };

  requests.forEach(r => {
    // Only Approved and Pending count against balance
    if (r.status === 'Approved' || r.status === 'Pending') {
      const type = (r.leave_type || r.type || '').toLowerCase();
      const days = Number(r.days || 1);
      if (type.includes('casual') || type === 'cl') {
        used.casual += days;
      } else if (type.includes('sick') || type === 'sl') {
        used.sick += days;
      } else if (type.includes('earned') || type.includes('privilege') || type === 'el' || type === 'pl') {
        used.earned += days;
      }
    }
  });

  return {
    casual: {
      total: quotas.casual,
      used: used.casual,
      remaining: Math.max(0, quotas.casual - used.casual)
    },
    sick: {
      total: quotas.sick,
      used: used.sick,
      remaining: Math.max(0, quotas.sick - used.sick)
    },
    earned: {
      total: quotas.earned,
      used: used.earned,
      remaining: Math.max(0, quotas.earned - used.earned)
    }
  };
}

// GET /api/employee-self/leave-requests
router.get('/leave-requests', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    
    const query = { is_deleted: { $ne: true } };
    if (employee?._id) {
      query.$or = [{ employee: employee._id }, { user: user?._id }];
    } else if (user?._id) {
      query.user = user._id;
    }

    let records = await LeaveRequest.find(query).sort({ createdAt: -1 });

    // Return actual database records without auto-seeding mock data

    const formatted = records.map(r => ({
      _id: r._id,
      id: r.request_id || `LR-${r._id.toString().slice(-4)}`,
      type: r.leave_type,
      from: r.from_date ? r.from_date.toISOString().split('T')[0] : '',
      to: r.to_date ? r.to_date.toISOString().split('T')[0] : '',
      days: r.days,
      reason: r.reason,
      attachment: r.attachment_url || null,
      status: r.status
    }));

    const balances = calculateBalances(formatted);

    return res.json({
      success: true,
      balances,
      requests: formatted
    });
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employee-self/leave-requests
router.post('/leave-requests', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    const { type, from, to, days, reason, attachment } = req.body;

    if (!from || !to || !reason) {
      return res.status(400).json({ success: false, message: 'From date, to date, and reason are required.' });
    }

    const count = await LeaveRequest.countDocuments();
    const requestId = `LR-${String(100 + count + 1)}`;

    const newDoc = await LeaveRequest.create({
      request_id: requestId,
      employee: employee?._id || null,
      user: user?._id || null,
      leave_type: type || 'Casual Leave',
      from_date: new Date(from),
      to_date: new Date(to),
      days: Number(days) || 1,
      reason: reason.trim(),
      attachment_url: attachment || '',
      status: 'Pending'
    });

    // Recompute balances
    const all = await LeaveRequest.find({ is_deleted: { $ne: true } }).sort({ createdAt: -1 });
    const formatted = all.map(r => ({
      _id: r._id,
      id: r.request_id || `LR-${r._id.toString().slice(-4)}`,
      type: r.leave_type,
      from: r.from_date ? r.from_date.toISOString().split('T')[0] : '',
      to: r.to_date ? r.to_date.toISOString().split('T')[0] : '',
      days: r.days,
      reason: r.reason,
      status: r.status
    }));

    const balances = calculateBalances(formatted);

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      data: {
        _id: newDoc._id,
        id: newDoc.request_id,
        type: newDoc.leave_type,
        from: newDoc.from_date.toISOString().split('T')[0],
        to: newDoc.to_date.toISOString().split('T')[0],
        days: newDoc.days,
        reason: newDoc.reason,
        status: newDoc.status
      },
      balances,
      requests: formatted
    });
  } catch (err) {
    console.error("Error creating leave request:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/employee-self/leave-requests/:id/cancel
router.patch('/leave-requests/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    let doc = null;

    if (id.startsWith('LR-')) {
      doc = await LeaveRequest.findOne({ request_id: id });
    }
    if (!doc) {
      doc = await LeaveRequest.findById(id).catch(() => null);
    }

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    doc.status = 'Cancelled';
    await doc.save();

    // Recompute balances
    const all = await LeaveRequest.find({ is_deleted: { $ne: true } }).sort({ createdAt: -1 });
    const formatted = all.map(r => ({
      _id: r._id,
      id: r.request_id || `LR-${r._id.toString().slice(-4)}`,
      type: r.leave_type,
      from: r.from_date ? r.from_date.toISOString().split('T')[0] : '',
      to: r.to_date ? r.to_date.toISOString().split('T')[0] : '',
      days: r.days,
      reason: r.reason,
      status: r.status
    }));

    const balances = calculateBalances(formatted);

    return res.json({
      success: true,
      message: 'Leave request cancelled successfully.',
      balances,
      requests: formatted
    });
  } catch (err) {
    console.error("Error cancelling leave request:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 2. ATTENDANCE ENDPOINTS
// ==========================================

function generateScheduleForMonth(year, month) {
  // month is 1-indexed (1..12)
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const records = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dayName = dayNames[dayOfWeek];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    let status = 'Present';
    let checkIn = '09:15 AM';
    let checkOut = '06:10 PM';
    let hours = '8.9';

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = 'Weekend';
      checkIn = '';
      checkOut = '';
      hours = '0';
    } else if (d === 5) {
      status = 'Half Day';
      checkIn = '09:30 AM';
      checkOut = '03:30 PM';
      hours = '6.0';
    } else if (d === 10 || d === 11) {
      status = 'Leave';
      checkIn = '';
      checkOut = '';
      hours = '0';
    } else if (d === 17) {
      status = 'Holiday';
      checkIn = '';
      checkOut = '';
      hours = '0';
    } else if (d === 18 || d === 19) {
      status = 'Absent';
      checkIn = '';
      checkOut = '';
      hours = '0';
    } else {
      // Normal variation
      const minsIn = 5 + (d % 25);
      const minsOut = 5 + ((d * 3) % 25);
      checkIn = `09:${String(minsIn).padStart(2, '0')} AM`;
      checkOut = `06:${String(minsOut).padStart(2, '0')} PM`;
      hours = (8.5 + ((d % 7) * 0.1)).toFixed(1);
    }

    records.push({
      date: dateStr,
      day: dayName,
      checkIn,
      checkOut,
      hours,
      status
    });
  }

  return records;
}

// GET /api/employee-self/attendance?month=2026-06
router.get('/attendance', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    const monthQuery = req.query.month || new Date().toISOString().slice(0, 7); // e.g. "2026-06"
    const [yearStr, monthStr] = monthQuery.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const query = {
      date: { $gte: startDate, $lte: endDate },
      is_deleted: { $ne: true }
    };
    if (employee?._id) {
      query.$or = [{ employee: employee._id }, { user: user?._id }];
    } else if (user?._id) {
      query.user = user._id;
    }

    let dbRecords = await Attendance.find(query).sort({ date: 1 });

    let records = [];
    if (dbRecords.length > 0) {
      records = dbRecords.map(r => ({
        _id: r._id,
        date: r.date_str || (r.date ? r.date.toISOString().split('T')[0] : ''),
        day: r.day_name || (r.date ? new Date(r.date).toLocaleDateString('en-US', { weekday: 'long' }) : ''),
        checkIn: r.check_in_time || (r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
        checkOut: r.check_out_time || (r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
        hours: r.working_hours || '0',
        status: r.status === 'HalfDay' ? 'Half Day' : r.status
      }));
    }

    // Calculate dynamic stats
    const present = records.filter(r => r.status === 'Present' || r.status === 'Half Day').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    const leaves = records.filter(r => r.status === 'Leave').length;
    const halfDays = records.filter(r => r.status === 'Half Day').length;
    const workingDays = records.filter(r => r.status !== 'Weekend' && r.status !== 'Holiday').length;
    const workingRatio = workingDays > 0 ? Math.round((present / workingDays) * 100) : 100;

    return res.json({
      success: true,
      month: monthQuery,
      stats: {
        present,
        absent,
        leaves,
        halfDays,
        workingRatio
      },
      records
    });
  } catch (err) {
    console.error("Error fetching attendance:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employee-self/attendance/log
router.post('/attendance/log', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    const { date, status, checkIn, checkOut, hours } = req.body;

    const dateObj = date ? new Date(date) : new Date();
    const dateStr = dateObj.toISOString().split('T')[0];
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

    const updated = await Attendance.findOneAndUpdate(
      {
        date_str: dateStr,
        $or: [{ employee: employee?._id }, { user: user?._id }]
      },
      {
        employee: employee?._id || null,
        user: user?._id || null,
        date: dateObj,
        date_str: dateStr,
        day_name: dayName,
        check_in_time: checkIn || '09:15 AM',
        check_out_time: checkOut || '06:15 PM',
        working_hours: hours || '8.9',
        status: status || 'Present'
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: `Attendance marked as ${updated.status} for ${dateStr}.`,
      data: updated
    });
  } catch (err) {
    console.error("Error logging attendance:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. TASKS REGISTER ENDPOINTS
// ==========================================

const INITIAL_SEED_TASKS = [
  { task_id: "TSK-001", title: "Compile Q2 Marketing Analytics Sheets", due_date: "2026-06-18", priority: "Critical", status: "In Progress", notes: "Analyze click-through rates and ROI across Facebook ads campaign." },
  { task_id: "TSK-002", title: "Review Summer Catalog print mockups", due_date: "2026-06-20", priority: "Medium", status: "Not Started", notes: "Verify color compliance with branding guideline docs." },
  { task_id: "TSK-003", title: "Schedule onboarding check-ins with new interns", due_date: "2026-06-15", priority: "Low", status: "Completed", notes: "Introductory session completed on June 15." }
];

// GET /api/employee-self/tasks
router.get('/tasks', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    
    let tasks = await Task.find({ is_deleted: { $ne: true } }).sort({ createdAt: -1 });

    // Return actual database tasks without auto-seeding mock data

    const formatted = tasks.map(t => ({
      _id: t._id,
      id: t.task_id,
      title: t.title,
      dueDate: t.due_date,
      priority: t.priority,
      status: t.status,
      notes: t.notes || ''
    }));

    return res.json({
      success: true,
      tasks: formatted
    });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/employee-self/tasks
router.post('/tasks', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    const { title, dueDate, priority, notes } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Title and due date are required.' });
    }

    const count = await Task.countDocuments();
    const taskId = `TSK-${String(count + 1).padStart(3, '0')}`;

    const newTask = await Task.create({
      task_id: taskId,
      title: title.trim(),
      due_date: dueDate,
      priority: priority || 'Medium',
      status: 'Not Started',
      notes: notes || '',
      assigned_to: user?._id || null,
      created_by: user?._id || null
    });

    return res.status(201).json({
      success: true,
      message: `Task ${newTask.task_id} created successfully.`,
      task: {
        _id: newTask._id,
        id: newTask.task_id,
        title: newTask.title,
        dueDate: newTask.due_date,
        priority: newTask.priority,
        status: newTask.status,
        notes: newTask.notes
      }
    });
  } catch (err) {
    console.error("Error creating task:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/employee-self/tasks/:id/status
router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let task = null;
    if (id.startsWith('TSK-')) {
      task = await Task.findOne({ task_id: id });
    }
    if (!task) {
      task = await Task.findById(id).catch(() => null);
    }

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.status = status;
    await task.save();

    return res.json({
      success: true,
      message: `Task ${task.task_id} status updated to ${status}.`,
      task: {
        _id: task._id,
        id: task.task_id,
        title: task.title,
        dueDate: task.due_date,
        priority: task.priority,
        status: task.status,
        notes: task.notes
      }
    });
  } catch (err) {
    console.error("Error updating task status:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. DATA CLEANUP (TEAM MEMBERS)
// ==========================================
router.post('/cleanup-data', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    
    // Purge test / activity records
    const [tasksRes, attendRes, leavesRes, gpsRes, commsRes] = await Promise.all([
      Task.deleteMany({}),
      Attendance.deleteMany({}),
      LeaveRequest.deleteMany({}),
      GPSLog.deleteMany({}),
      CommissionRecord.deleteMany({
        commission_type: { $in: ['Bonus', 'ManualIncentive', 'SalesIncentive'] }
      })
    ]);

    return res.json({
      success: true,
      message: 'All team member activity records and caches successfully cleared.',
      cleared: {
        tasks: tasksRes.deletedCount,
        attendance: attendRes.deletedCount,
        leaves: leavesRes.deletedCount,
        gpsLogs: gpsRes.deletedCount,
        commissions: commsRes.deletedCount
      }
    });
  } catch (err) {
    console.error("Error cleaning team member data:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. GPS LOCATION TRACKING & DYNAMIC INTERVAL
// ==========================================
router.get('/tracking-interval', async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'employee_tracking_interval_minutes' });
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'employee_tracking_interval_minutes',
        value: 5,
        description: 'Periodic GPS location tracking interval in minutes for clocked-in team members'
      });
    }
    return res.json({
      success: true,
      intervalMinutes: Number(setting.value) || 5
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/tracking-interval', async (req, res) => {
  try {
    const { intervalMinutes } = req.body;
    const mins = Math.max(1, Math.min(60, Number(intervalMinutes) || 5));

    const setting = await SystemSetting.findOneAndUpdate(
      { key: 'employee_tracking_interval_minutes' },
      { value: mins, description: 'Periodic GPS location tracking interval in minutes for clocked-in team members' },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      intervalMinutes: setting.value,
      message: `Tracking interval set to ${setting.value} minutes.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gps-ping', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    const { lat, lng, battery_level } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude coordinates are required.' });
    }

    const log = await GPSLog.create({
      user: user?._id,
      location: { lat: Number(lat), lng: Number(lng) },
      battery_level: battery_level !== undefined ? Number(battery_level) : undefined,
      recorded_at: new Date()
    });

    return res.json({
      success: true,
      message: 'GPS location ping recorded successfully.',
      logId: log._id
    });
  } catch (err) {
    console.error("Error recording GPS ping:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/gps-status', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    const latest = user?._id 
      ? await GPSLog.findOne({ user: user._id }).sort({ recorded_at: -1 })
      : null;

    return res.json({
      success: true,
      latestLog: latest,
      isGpsRequired: true
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. FOUNDER MANUAL INCENTIVE
// ==========================================
router.post('/manual-incentive', async (req, res) => {
  try {
    const { user: founderUser } = await resolveIdentity(req);
    const { userId, amount, description, date } = req.body;

    if (!userId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Recipient employee and a valid positive amount are required.' });
    }

    const recipient = await User.findById(userId);
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient user not found.' });
    }

    const record = await CommissionRecord.create({
      user: recipient._id,
      commission_type: 'ManualIncentive',
      beneficiary_role: recipient.roleName || 'TeamMember',
      amount: Number(amount),
      percentage: 100,
      description: description?.trim() || 'Manual performance incentive awarded by Founder',
      manual_incentive_by: founderUser?._id,
      status: 'Approved',
      settlement_date: date ? new Date(date) : new Date()
    });

    return res.status(201).json({
      success: true,
      message: `Manual incentive of ₹${amount} awarded to ${recipient.name}.`,
      record
    });
  } catch (err) {
    console.error("Error awarding manual incentive:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 7. TEAM MEMBER CENTRAL INVENTORY & SALES
// ==========================================
router.get('/customers/lookup', async (req, res) => {
  try {
    const mobile = String(req.query.mobile || '').replace(/\D/g, '').trim();
    if (!mobile || mobile.length < 5) {
      return res.status(200).json({ success: true, data: null });
    }
    const customer = await Customer.findOne({ mobile: { $regex: mobile + '$' } });
    return res.status(200).json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/stock', async (req, res) => {
  try {
    // Return available stock from Founder's central inventory (ProductVariant)
    const variants = await ProductVariant.find({ 
      is_active: true, 
      is_deleted: { $ne: true },
      stock_quantity: { $gt: 0 }
    }).populate({
      path: 'product',
      populate: { path: 'category' }
    });

    const data = variants.map(v => ({
      _id: v._id,
      variant_id: v._id,
      product_id: v.product?._id,
      product_name: v.product?.name || 'Huddo Product',
      sku: v.sku_variant || v.product?.sku,
      category: v.product?.category?.name || 'Footwear',
      size: v.size,
      color: v.color,
      mrp: v.mrp || v.selling_price || 0,
      selling_price: v.selling_price || v.mrp || 0,
      cost_price: v.cost_price || 0,
      available_qty: v.stock_quantity || 0,
      image: (v.images && v.images[0]) || v.product?.image || null
    }));

    return res.json({
      success: true,
      data,
      total_items: data.length,
      total_quantity: data.reduce((sum, item) => sum + item.available_qty, 0)
    });
  } catch (err) {
    console.error("Error fetching central stock for team member:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Fetch active cities configured by Founder in ERP
router.get('/cities', async (req, res) => {
  try {
    const cities = await City.find({
      is_deleted: { $ne: true },
      is_active: { $ne: false }
    })
      .populate('state', 'name')
      .sort({ name: 1 });

    const formatted = cities.map(c => ({
      _id: c._id,
      name: c.name,
      state: c.state?.name || '',
      state_id: c.state?._id || c.state
    }));

    return res.json({
      success: true,
      data: formatted
    });
  } catch (err) {
    console.error("Error fetching cities for team member:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/sales', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    const filter = {
      is_deleted: { $ne: true },
      $or: [
        { seller_user: user?._id },
        { created_by: user?._id },
        { is_team_member_sale: true }
      ]
    };

    const sales = await RetailSale.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('items.product', 'name sku image');

    let empDoc = employee;
    if (!empDoc && user?._id) {
      empDoc = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } });
    }
    if (!empDoc) {
      empDoc = await Employee.findOne({ is_deleted: { $ne: true } });
    }

    const incentivePct = Number(empDoc?.salary_structure?.incentive_pct ?? 1);
    const totalRev = sales.reduce((acc, s) => acc + (s.grand_total || 0), 0);
    const calculatedIncentive = Math.round(totalRev * (incentivePct / 100));

    // Ensure database incentive_earned is synchronized with calculated incentive
    if (empDoc && empDoc._id) {
      const currentEarned = Number(empDoc.salary_structure?.incentive_earned || 0);
      if (currentEarned !== calculatedIncentive) {
        await Employee.findByIdAndUpdate(empDoc._id, {
          $set: { 'salary_structure.incentive_earned': calculatedIncentive }
        });
      }
    }

    return res.json({
      success: true,
      data: sales,
      incentive_pct: incentivePct,
      incentive_earned: calculatedIncentive,
      total_revenue: totalRev,
      pairs_sold: sales.reduce((acc, s) => acc + (s.pairs_sold || 0), 0)
    });
  } catch (err) {
    console.error("Error fetching team member sales:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/commissions', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    let empDoc = employee;
    if (!empDoc && user?._id) {
      empDoc = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } });
    }
    const incentivePct = Number(empDoc?.salary_structure?.incentive_pct ?? 1);

    const records = await CommissionRecord.find({
      user: user?._id,
      is_deleted: { $ne: true }
    }).sort({ createdAt: -1 });

    const totalEarned = records.reduce((sum, r) => sum + (r.amount || 0), 0);

    return res.json({
      success: true,
      data: records,
      totalEarned,
      incentive_pct: incentivePct
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sales', async (req, res) => {
  try {
    const { user } = await resolveIdentity(req);
    const {
      items = [],
      customer_name = 'Walk-in Customer',
      customer_mobile = '',
      customer_city = '',
      payment_mode = 'Cash',
      tendered_amount = 0,
      change_due = 0,
      note = ''
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one item to complete the sale.' });
    }

    // 1. Verify central inventory stock for each variant
    const variantIds = items.map(i => i.product_variant || i.variant_id);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } }).populate({
      path: 'product',
      populate: { path: 'category' }
    });

    const variantMap = new Map(variants.map(v => [v._id.toString(), v]));

    for (const item of items) {
      const vid = (item.product_variant || item.variant_id).toString();
      const variant = variantMap.get(vid);
      if (!variant) {
        return res.status(404).json({ success: false, message: `Product variant not found: ${vid}` });
      }
      const requestedQty = Number(item.quantity) || 1;
      if (variant.stock_quantity < requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory in Founder stock for ${variant.product?.name || 'Product'} (${variant.size}/${variant.color}). Available: ${variant.stock_quantity}, requested: ${requestedQty}.`
        });
      }
    }

    // 2. Build line items and deduct from Founder's central inventory
    let subtotal = 0;
    const saleItems = [];

    for (const item of items) {
      const vid = (item.product_variant || item.variant_id).toString();
      const variant = variantMap.get(vid);
      const qty = Number(item.quantity) || 1;
      const unitPrice = Number(item.unit_price) || Number(variant.selling_price) || Number(variant.mrp) || 0;
      const discountPct = Number(item.discount_percent) || 0;
      const lineSubtotal = unitPrice * qty;
      const lineDiscount = lineSubtotal * (discountPct / 100);
      const lineTotal = lineSubtotal - lineDiscount;

      subtotal += lineTotal;

      saleItems.push({
        product: variant.product?._id || variant.product,
        product_variant: variant._id,
        product_name: variant.product?.name || '',
        sku_variant: variant.sku_variant,
        size: variant.size,
        color: variant.color,
        quantity: qty,
        unit_price: unitPrice,
        discount_percent: discountPct,
        line_subtotal: lineSubtotal,
        line_discount_amount: lineDiscount,
        line_total: lineTotal
      });

      // Deduct stock from Founder central inventory
      await ProductVariant.findByIdAndUpdate(variant._id, {
        $inc: { stock_quantity: -qty }
      });
    }

    const grandTotal = Math.round(subtotal);
    const saleNumber = `SL-TM-${Date.now().toString().slice(-6)}`;

    // Resolve geographic managers hierarchy for the selling team member
    const seller = user?._id 
      ? await User.findById(user._id).populate('city').populate('state').populate('country')
      : null;

    let cityDoc = null;
    let stateDoc = null;
    let countryDoc = null;

    if (seller?.city) {
      cityDoc = await City.findById(seller.city?._id || seller.city).populate('manager');
    }
    if (seller?.state) {
      stateDoc = await State.findById(seller.state?._id || seller.state).populate('manager');
    }
    if (seller?.country) {
      countryDoc = await Country.findById(seller.country?._id || seller.country).populate('manager');
    }

    // 3a. Create RetailSale document
    const sale = await RetailSale.create({
      sale_number: saleNumber,
      is_team_member_sale: true,
      seller_user: user?._id || null,
      items: saleItems,
      discount_mode: 'line',
      subtotal,
      discount_amount: saleItems.reduce((acc, i) => acc + (i.line_discount_amount || 0), 0),
      grand_total: grandTotal,
      city: cityDoc?._id || null,
      state: stateDoc?._id || null,
      country: countryDoc?._id || null,
      city_name: cityDoc?.name || '',
      state_name: stateDoc?.name || '',
      country_name: countryDoc?.name || '',
      created_by: user?._id || null,
      pairs_sold: saleItems.reduce((acc, i) => acc + i.quantity, 0),
      customer_name: customer_name.trim(),
      customer_mobile: customer_mobile.trim(),
      customer_id: customer_mobile ? `CUST-${customer_mobile.slice(-4)}` : 'WALKIN',
      payment_mode: payment_mode || 'Cash',
      tendered_amount: Number(tendered_amount) || grandTotal,
      change_due: Number(change_due) || 0,
      counter_number: 'Direct POS',
      cashier_name: user?.name || 'Team Member',
      note: note || ''
    });

    // 3b. Also create Order document so direct sales appear in Founder / Admin Orders & Sales registers
    const orderItems = saleItems.map(si => ({
      product: si.product,
      product_variant: si.product_variant,
      product_name: si.product_name,
      sku: si.sku_variant,
      size: si.size,
      color: si.color,
      quantity: si.quantity,
      unit_price: si.unit_price,
      total_price: si.line_total,
      discount_percent: si.discount_percent,
      line_discount_amount: si.line_discount_amount
    }));

    const orderDoc = await Order.create({
      order_number: saleNumber,
      order_type: 'TeamMemberPOS',
      retailer: null,
      customer_name: customer_name.trim() || 'Walk-in Customer',
      customer_mobile: customer_mobile.trim(),
      customer_city: customer_city.trim() || cityDoc?.name || '',
      seller_user: user?._id || null,
      city: cityDoc?._id || null,
      state: stateDoc?._id || null,
      country: countryDoc?._id || null,
      city_name: cityDoc?.name || '',
      state_name: stateDoc?.name || '',
      country_name: countryDoc?.name || '',
      counter_number: 'Direct POS',
      payment_mode: payment_mode || 'Cash',
      tendered_amount: Number(tendered_amount) || grandTotal,
      change_due: Number(change_due) || 0,
      note: note || '',
      items: orderItems,
      subtotal,
      tax_amount: 0,
      discount_amount: saleItems.reduce((acc, i) => acc + (i.line_discount_amount || 0), 0),
      grand_total: grandTotal,
      payment_status: 'Verified',
      status: 'Delivered',
      created_by: user?._id || null,
      commissions_calculated: true,
      delivered_at: new Date(),
      status_history: [
        {
          status: 'Delivered',
          note: `Direct POS Counter sale completed by ${user?.name || 'Team Member'}.`,
          changed_by: user?._id || null,
          changed_at: new Date()
        }
      ]
    });

    // 4. Multi-level manager and team member incentive calculations
    // Strictly retrieve Founder's configured sales incentive rate for this team member / employee
    let sellerEmp = null;
    if (user?._id) {
      sellerEmp = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } });
    }
    const founderConfiguredIncentivePct = sellerEmp?.salary_structure?.incentive_pct !== undefined && sellerEmp.salary_structure.incentive_pct !== null
      ? Number(sellerEmp.salary_structure.incentive_pct)
      : null;

    const commissionRecords = [];

    for (const item of saleItems) {
      const variant = variantMap.get(item.product_variant.toString());
      const product = variant?.product;
      const category = product?.category;

      const lineTotal = item.line_total || (item.unit_price * item.quantity);

      // (a) Team Member Direct Incentive: strictly follow Founder's configured rate on Employee model
      const tmIncentivePct = founderConfiguredIncentivePct !== null
        ? founderConfiguredIncentivePct
        : (Number(product?.employeeIncentive) || 1);
      const tmIncentiveAmount = Math.round((lineTotal * (tmIncentivePct / 100)) * 100) / 100;
      if (user?._id && tmIncentiveAmount > 0) {
        commissionRecords.push({
          user: user._id,
          retail_sale: sale._id,
          product: product?._id,
          product_category: category?._id,
          commission_type: 'SalesIncentive',
          beneficiary_role: 'TeamMember',
          amount: tmIncentiveAmount,
          percentage: tmIncentivePct,
          quantity: item.quantity,
          description: `Team Member direct sales incentive (${tmIncentivePct}%) on ${product?.name} (${item.quantity} pairs)`,
          status: 'Approved'
        });
      }

      // (b) City Manager Incentive (product.cityManagerIncentive or category.commissions.cityManager or 2%)
      const cityManagerUser = cityDoc?.manager;
      if (cityManagerUser?._id) {
        const cmIncentivePct = Number(product?.cityManagerIncentive) || Number(category?.commissions?.cityManager) || 2;
        const cmAmount = Math.round((lineTotal * (cmIncentivePct / 100)) * 100) / 100;
        if (cmAmount > 0) {
          commissionRecords.push({
            user: cityManagerUser._id,
            retail_sale: sale._id,
            product: product?._id,
            product_category: category?._id,
            commission_type: 'ManagerIncentive',
            beneficiary_role: 'CityManager',
            amount: cmAmount,
            percentage: cmIncentivePct,
            quantity: item.quantity,
            description: `City Manager incentive (${cmIncentivePct}%) on ${product?.name} from ${cityDoc.name}`,
            status: 'Approved'
          });
        }
      }

      // (c) State Manager Incentive (product.stateManagerIncentive or category.commissions.stateManager or 1%)
      const stateManagerUser = stateDoc?.manager;
      if (stateManagerUser?._id) {
        const smIncentivePct = Number(product?.stateManagerIncentive) || Number(category?.commissions?.stateManager) || 1;
        const smAmount = Math.round((lineTotal * (smIncentivePct / 100)) * 100) / 100;
        if (smAmount > 0) {
          commissionRecords.push({
            user: stateManagerUser._id,
            retail_sale: sale._id,
            product: product?._id,
            product_category: category?._id,
            commission_type: 'ManagerIncentive',
            beneficiary_role: 'StateManager',
            amount: smAmount,
            percentage: smIncentivePct,
            quantity: item.quantity,
            description: `State Manager incentive (${smIncentivePct}%) on ${product?.name} from ${stateDoc.name}`,
            status: 'Approved'
          });
        }
      }

      // (d) Country Manager Incentive (category.commissions.countryManager or 0.5%)
      const countryManagerUser = countryDoc?.manager;
      if (countryManagerUser?._id) {
        const ctryIncentivePct = Number(category?.commissions?.countryManager) || 0.5;
        const ctryAmount = Math.round((lineTotal * (ctryIncentivePct / 100)) * 100) / 100;
        if (ctryAmount > 0) {
          commissionRecords.push({
            user: countryManagerUser._id,
            retail_sale: sale._id,
            product: product?._id,
            product_category: category?._id,
            commission_type: 'ManagerIncentive',
            beneficiary_role: 'CountryManager',
            amount: ctryAmount,
            percentage: ctryIncentivePct,
            quantity: item.quantity,
            description: `Country Manager incentive (${ctryIncentivePct}%) on ${product?.name} from ${countryDoc.name}`,
            status: 'Approved'
          });
        }
      }
    }

    if (commissionRecords.length > 0) {
      // Link commission records to both retail sale and order
      commissionRecords.forEach(c => {
        c.order = orderDoc._id;
      });
      await CommissionRecord.insertMany(commissionRecords);

      // Accumulate sales incentive into employee's profile
      const totalTmIncentive = commissionRecords
        .filter(c => c.beneficiary_role === 'TeamMember' && String(c.user) === String(user?._id))
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      if (user?._id && totalTmIncentive > 0) {
        await Employee.findOneAndUpdate(
          { user: user._id },
          { $inc: { 'salary_structure.incentive_earned': totalTmIncentive } }
        );
      }
    }

    // 5. Customer record update
    if (customer_mobile) {
      try {
        await Customer.findOneAndUpdate(
          { mobile: customer_mobile },
          {
            $set: {
              customer_name: customer_name.trim(),
              city: customer_city || cityDoc?.name || '',
              lastOrderDate: new Date().toISOString().split('T')[0]
            },
            $inc: {
              totalOrders: 1,
              totalSpend: grandTotal
            }
          },
          { upsert: true, new: true }
        );
      } catch (custErr) {
        console.warn("Customer update error:", custErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Sale successfully completed, inventory deducted from central stock, and incentives distributed across hierarchy.',
      sale,
      commissionsGenerated: commissionRecords.length
    });
  } catch (err) {
    console.error("Error creating team member direct sale:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8. DYNAMIC ATTENDANCE & INCENTIVE PAYROLL
// ==========================================
router.get('/payroll', async (req, res) => {
  try {
    const { user, employee } = await resolveIdentity(req);
    const monthQuery = req.query.month || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = monthQuery.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);

    let targetEmp = employee;
    if (!targetEmp && user?._id) {
      targetEmp = await Employee.findOne({ user: user._id, is_deleted: { $ne: true } })
        .populate('department')
        .populate('designation')
        .populate('assigned_promoters');
    }

    if (!targetEmp) {
      // Fallback: pick the first active employee for workspace demo preview
      targetEmp = await Employee.findOne({ is_deleted: { $ne: true } })
        .populate('department')
        .populate('designation')
        .populate('assigned_promoters');
    }

    if (!targetEmp) {
      return res.status(404).json({ success: false, message: 'No employee record found.' });
    }

    const calculated = await calculateSingleEmployeePayroll(targetEmp, year, month);
    return res.json({ success: true, payroll: calculated });
  } catch (err) {
    console.error("Error fetching self payroll:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
