import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Order from '../models/Order.js';
import Payroll from '../models/Payroll.js';
import Promoter from '../models/Promoter.js';

/**
 * Helper to calculate attendance-based salary and variable incentives for a single employee
 */
export async function calculateSingleEmployeePayroll(employee, year, month) {
  // Ensure month is 1-12
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  const totalDaysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const startDate = new Date(yearNum, monthNum - 1, 1);
  const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59);

  // 1. Base Salary Structure (Configured in Employee Master)
  const basic = Number(employee.salary_structure?.basic || 30000);
  const hra = Number(employee.salary_structure?.hra || Math.round(basic * 0.25));
  const allowances = Number(employee.salary_structure?.allowances || Math.round(basic * 0.15));
  const baseMonthlyRate = basic + hra + allowances;
  const perDayRate = Math.round(baseMonthlyRate / totalDaysInMonth);

  // 2. Query Monthly Attendance
  const query = {
    date: { $gte: startDate, $lte: endDate },
    is_deleted: { $ne: true }
  };
  if (employee.user) {
    query.$or = [{ employee: employee._id }, { user: employee.user._id || employee.user }];
  } else {
    query.employee = employee._id;
  }

  const attendanceRecords = await Attendance.find(query).lean();

  let presentDays = 0;
  let halfDays = 0;
  let paidLeaves = 0;
  let absentDays = 0;

  // Count standard weekend days in the month
  let weekendDays = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dayOfWeek = new Date(yearNum, monthNum - 1, d).getDay();
    if (dayOfWeek === 0) {
      weekendDays++; // Sundays
    }
  }

  if (attendanceRecords.length > 0) {
    attendanceRecords.forEach(rec => {
      const st = String(rec.status || '').toLowerCase().replace(/\s+/g, '');
      if (st === 'present') {
        presentDays++;
      } else if (st === 'halfday') {
        halfDays++;
      } else if (st === 'leave' || st === 'holiday') {
        paidLeaves++;
      } else if (st === 'absent') {
        absentDays++;
      }
    });

    // Payable Days formula:
    // Full Days + (Half Days * 0.5) + Paid Leaves + Weekends (company policy)
    const payableWorkDays = presentDays + (halfDays * 0.5) + paidLeaves;
    // Any unlogged weekdays could be absent if tracking was active, or present if new
    const loggedCount = presentDays + halfDays + paidLeaves + absentDays;
    const remainingDays = Math.max(0, totalDaysInMonth - loggedCount - weekendDays);

    // If explicit absent days exist, record them; otherwise consider remaining weekdays
    const totalEffectiveAbsent = absentDays + remainingDays;
    absentDays = totalEffectiveAbsent;

    var payableDays = Math.max(0, Math.min(totalDaysInMonth, payableWorkDays + weekendDays));
  } else {
    // If no attendance records logged yet for this month, default to full attendance
    presentDays = totalDaysInMonth - weekendDays;
    payableDays = totalDaysInMonth;
    absentDays = 0;
  }

  // Attendance Deduction (Loss of Pay)
  const attendanceDeductionLOP = Math.min(baseMonthlyRate, Math.round(absentDays * perDayRate));
  const earnedBasic = Math.max(0, baseMonthlyRate - attendanceDeductionLOP);

  // 3. Variable Sales Incentives (Direct POS + Supervised Promoters + Manual Founder Incentive)
  const directIncentivePct = Number(employee.salary_structure?.incentive_pct ?? 5);
  const promoterOverridePct = Number(employee.salary_structure?.promoter_override_pct ?? 1);
  const manualIncentive = Number(employee.salary_structure?.incentive_earned ?? 0);

  // Direct Sales Orders (Team Member Counter POS or DirectSale)
  const userRef = employee.user?._id || employee.user;
  const directSalesOrders = await Order.find({
    $or: [
      { seller_user: userRef },
      { created_by: userRef },
      { order_type: 'TeamMemberPOS' }
    ],
    createdAt: { $gte: startDate, $lte: endDate },
    status: { $nin: ['Cancelled', 'Draft'] }
  }).lean();

  const directSalesVolume = directSalesOrders.reduce((sum, ord) => {
    return sum + Number(ord.grand_total || ord.subtotal || 0);
  }, 0);

  const salesIncentive = Math.round((directSalesVolume * directIncentivePct) / 100);

  // Supervised Promoters Override Incentive
  let promoterSalesVolume = 0;
  let promoterOverrideIncentive = 0;

  if (Array.isArray(employee.assigned_promoters) && employee.assigned_promoters.length > 0) {
    const promoterIds = employee.assigned_promoters.map(p => p._id || p);
    
    // Find promoter user accounts or promoter codes
    const promoters = await Promoter.find({ _id: { $in: promoterIds } }).lean();
    const promoterUserIds = promoters.map(p => p.user).filter(Boolean);

    const promoterOrders = await Order.find({
      $or: [
        { seller_user: { $in: promoterUserIds } },
        { created_by: { $in: promoterUserIds } }
      ],
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ['Cancelled', 'Draft'] }
    }).lean();

    promoterSalesVolume = promoterOrders.reduce((sum, ord) => {
      return sum + Number(ord.grand_total || ord.subtotal || 0);
    }, 0);

    promoterOverrideIncentive = Math.round((promoterSalesVolume * promoterOverridePct) / 100);
  }

  const totalIncentive = salesIncentive + promoterOverrideIncentive + manualIncentive;

  // 4. Statutory Deductions
  const pfDeduction = Math.round(earnedBasic * 0.06);
  const taxableGross = earnedBasic + totalIncentive;
  const tdsDeduction = taxableGross > 50000 ? Math.round(taxableGross * 0.05) : 0;
  const totalDeductions = pfDeduction + tdsDeduction;

  // 5. Net Payable
  const gross = earnedBasic + totalIncentive;
  const netSalary = Math.max(0, gross - totalDeductions);

  return {
    employeeId: employee.employee_code || employee._id,
    employeeMongoId: employee._id,
    name: employee.full_name,
    email: employee.email,
    mobile: employee.mobile,
    department: employee.department?.name || 'Sales',
    designation: employee.designation?.name || 'Sales Executive',
    bank: employee.bank_details?.bank_name 
      ? `${employee.bank_details.bank_name} - XXXX${String(employee.bank_details.account_no || '').slice(-4)}`
      : 'HDFC Bank - XXXX5544',
    month: monthNum,
    year: yearNum,
    monthLabel: new Date(yearNum, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),

    // Salary Structure
    baseMonthlyRate,
    basic,
    hra,
    allowances,
    perDayRate,

    // Attendance Metrics
    totalDays: totalDaysInMonth,
    presentDays,
    halfDays,
    paidLeaves,
    absentDays,
    payableDays: Number(payableDays.toFixed(1)),
    attendanceDeductionLOP,
    earnedBasic,

    // Performance Incentives
    directSalesVolume,
    salesIncentive,
    promoterSalesVolume,
    promoterOverrideIncentive,
    manualIncentive,
    totalIncentive,

    // Deductions & Totals
    pfDeduction,
    tdsDeduction,
    totalDeductions,
    gross,
    netSalary,
    status: employee.is_active ? 'Pending' : 'Inactive'
  };
}

/**
 * Controller: Preview / calculate dynamic payroll for all employees for a given month
 * GET /api/payrolls/calculate?month=10&year=2026
 */
export async function calculateMonthlyPayrolls(req, res) {
  try {
    const now = new Date();
    const month = parseInt(req.query.month || (now.getMonth() + 1), 10);
    const year = parseInt(req.query.year || now.getFullYear(), 10);

    const employees = await Employee.find({ is_deleted: { $ne: true } })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters')
      .sort({ createdAt: -1 });

    const results = await Promise.all(
      employees.map(emp => calculateSingleEmployeePayroll(emp, year, month))
    );

    // Also look up any already processed records from the Payroll collection
    const existingRecords = await Payroll.find({
      month,
      year,
      is_deleted: { $ne: true }
    }).lean();

    const existingMap = new Map();
    existingRecords.forEach(rec => {
      existingMap.set(String(rec.employee), rec);
    });

    // Merge status from official Payroll collection if already processed/paid
    const merged = results.map(item => {
      const saved = existingMap.get(String(item.employeeMongoId));
      if (saved) {
        return {
          ...item,
          payrollId: saved._id,
          status: saved.status || 'Processed',
          paidAt: saved.paid_at,
          paymentMode: saved.payment_mode || 'Bank Transfer'
        };
      }
      return item;
    });

    return res.json({
      success: true,
      month,
      year,
      count: merged.length,
      data: merged
    });
  } catch (err) {
    console.error("Error calculating payrolls:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Generate & save official payrolls into Payroll collection
 * POST /api/payrolls/generate
 */
export async function generateMonthlyPayrolls(req, res) {
  try {
    const now = new Date();
    const month = parseInt(req.body.month || (now.getMonth() + 1), 10);
    const year = parseInt(req.body.year || now.getFullYear(), 10);

    const employees = await Employee.find({ is_deleted: { $ne: true }, is_active: true })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters');

    const calculated = await Promise.all(
      employees.map(emp => calculateSingleEmployeePayroll(emp, year, month))
    );

    const savedRecords = [];
    for (const calc of calculated) {
      const updated = await Payroll.findOneAndUpdate(
        { employee: calc.employeeMongoId, month, year },
        {
          employee: calc.employeeMongoId,
          month,
          year,
          basic: calc.basic,
          hra: calc.hra,
          allowances: calc.allowances,
          base_monthly_rate: calc.baseMonthlyRate,
          total_days: calc.totalDays,
          present_days: calc.presentDays,
          half_days: calc.halfDays,
          paid_leaves: calc.paidLeaves,
          absent_days: calc.absentDays,
          payable_days: calc.payableDays,
          per_day_rate: calc.perDayRate,
          attendance_deduction_lop: calc.attendanceDeductionLOP,
          earned_basic: calc.earnedBasic,
          sales_incentive: calc.salesIncentive,
          promoter_override_incentive: calc.promoterOverrideIncentive,
          manual_incentive: calc.manualIncentive,
          incentive_amount: calc.totalIncentive,
          pf_deduction: calc.pfDeduction,
          tds_deduction: calc.tdsDeduction,
          deductions: calc.totalDeductions,
          gross: calc.gross,
          net_salary: calc.netSalary,
          status: 'Processed',
          payment_mode: 'Bank Transfer'
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(updated);
    }

    return res.json({
      success: true,
      message: `Successfully generated attendance-based payroll for ${savedRecords.length} employees for month ${month}/${year}.`,
      count: savedRecords.length
    });
  } catch (err) {
    console.error("Error generating payrolls:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Settle / mark single or all payroll records as Processed or Paid
 * POST /api/payrolls/settle
 */
export async function settlePayroll(req, res) {
  try {
    const { employeeId, month, year, status = 'Processed' } = req.body;

    const filter = {};
    if (month) filter.month = parseInt(month, 10);
    if (year) filter.year = parseInt(year, 10);
    if (employeeId) filter.employee = employeeId;

    const result = await Payroll.updateMany(filter, {
      $set: {
        status,
        paid_at: status === 'Paid' ? new Date() : undefined
      }
    });

    return res.json({
      success: true,
      message: `Updated payroll status to ${status}.`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("Error settling payroll:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
