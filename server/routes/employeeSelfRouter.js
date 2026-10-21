import express from 'express';
import LeaveRequest from '../models/LeaveRequest.js';
import Attendance from '../models/Attendance.js';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';

const router = express.Router();

// Helper to resolve employee/user identity
async function resolveIdentity(req) {
  let user = req.user;
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

    // Seed initial records if empty
    if (records.length === 0) {
      const toInsert = INITIAL_SEED_LEAVES.map(item => ({
        ...item,
        employee: employee?._id || null,
        user: user?._id || null
      }));
      records = await LeaveRequest.insertMany(toInsert);
    }

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
    } else {
      // Dynamic fallback schedule for the requested month
      records = generateScheduleForMonth(year, month);
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

    // Seed if empty
    if (tasks.length === 0) {
      const toInsert = INITIAL_SEED_TASKS.map(t => ({
        ...t,
        assigned_to: user?._id || null,
        created_by: user?._id || null
      }));
      tasks = await Task.insertMany(toInsert);
    }

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

export default router;
