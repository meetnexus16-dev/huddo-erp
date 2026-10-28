import Employee from '../models/Employee.js';
import Attendance from '../models/Attendance.js';
import Order from '../models/Order.js';
import RetailSale from '../models/RetailSale.js';
import Payroll from '../models/Payroll.js';
import Promoter from '../models/Promoter.js';
import CommissionRecord from '../models/CommissionRecord.js';

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

  // Check if employee joined after the selected month
  if (employee.joining_date && new Date(employee.joining_date) > endDate) {
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
        : 'HDFC Bank - Primary',
      month: monthNum,
      year: yearNum,
      monthLabel: new Date(yearNum, monthNum - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      baseMonthlyRate: 0,
      basic: 0,
      hra: 0,
      allowances: 0,
      perDayRate: 0,
      totalDays: totalDaysInMonth,
      presentDays: 0,
      halfDays: 0,
      paidLeaves: 0,
      absentDays: 0,
      payableDays: 0,
      attendanceDeductionLOP: 0,
      earnedBasic: 0,
      directSalesVolume: 0,
      salesIncentive: 0,
      promoterSalesVolume: 0,
      promoterOverrideIncentive: 0,
      manualIncentive: 0,
      totalIncentive: 0,
      pfDeduction: 0,
      tdsDeduction: 0,
      totalDeductions: 0,
      gross: 0,
      netSalary: 0,
      status: 'Not Joined'
    };
  }

  // 3. Variable Sales Incentives (Direct POS + Supervised Promoters + Month-Scoped Founder Incentive)
  const directIncentivePct = Number(employee.salary_structure?.incentive_pct ?? 5);
  const promoterOverridePct = Number(employee.salary_structure?.promoter_override_pct ?? 1);
  const userRef = employee.user?._id || employee.user;

  // Query manual incentives/bonuses awarded strictly during this specific month
  let manualIncentive = 0;
  if (userRef) {
    const bonusRecords = await CommissionRecord.find({
      user: userRef,
      commission_type: { $in: ['ManualIncentive', 'Bonus', 'PromoterBonus'] },
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'Rejected' }
    });

    manualIncentive = bonusRecords.reduce((sum, rec) => sum + Number(rec.amount || 0), 0);
  }

  // Fall back to employee.salary_structure.incentive_earned ONLY for current active month if no records yet
  const now = new Date();
  const isCurrentActiveMonth = (now.getMonth() + 1 === monthNum) && (now.getFullYear() === yearNum);
  if (isCurrentActiveMonth && manualIncentive === 0) {
    manualIncentive = Number(employee.salary_structure?.incentive_earned ?? 0);
  }
  let directSalesVolume = 0;
  let salesIncentive = 0;
  let directPairsSold = 0;
  let activeSalesDays = 0;
  const incentiveMode = employee.salary_structure?.incentive_mode || 'slab_per_pair';
  const customSlabs = Array.isArray(employee.salary_structure?.incentive_slabs) && employee.salary_structure.incentive_slabs.length > 0
    ? employee.salary_structure.incentive_slabs
    : null;

  if (userRef) {
    // 1. Fetch direct orders (executed with Mongoose getters for rupee amounts)
    const directSalesOrders = await Order.find({
      $or: [
        { seller_user: userRef },
        { created_by: userRef }
      ],
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ['Cancelled', 'Draft'] }
    });

    // 2. Fetch direct retail POS sales
    const directRetailSales = await RetailSale.find({
      $or: [
        { seller_user: userRef },
        { created_by: userRef }
      ],
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Map sales by date (YYYY-MM-DD) for Per-Day calculation
    const dailySalesMap = {};

    for (const ord of directSalesOrders) {
      const vol = Number(ord.grand_total || ord.subtotal || 0);
      directSalesVolume += vol;

      let pairs = 0;
      if (Array.isArray(ord.items) && ord.items.length > 0) {
        pairs = ord.items.reduce((s, itm) => s + (Number(itm.quantity) || 1), 0);
      } else {
        pairs = Number(ord.pairs_sold) || 1;
      }
      directPairsSold += pairs;

      const dateKey = new Date(ord.createdAt).toISOString().split('T')[0];
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = { date: dateKey, pairs: 0, volume: 0 };
      }
      dailySalesMap[dateKey].pairs += pairs;
      dailySalesMap[dateKey].volume += vol;
    }

    for (const sale of directRetailSales) {
      const vol = Number(sale.grand_total || sale.subtotal || 0);
      directSalesVolume += vol;

      let pairs = 0;
      if (Array.isArray(sale.items) && sale.items.length > 0) {
        pairs = sale.items.reduce((s, itm) => s + (Number(itm.quantity) || 1), 0);
      } else {
        pairs = Number(sale.pairs_sold) || 1;
      }
      directPairsSold += pairs;

      const dateKey = new Date(sale.createdAt).toISOString().split('T')[0];
      if (!dailySalesMap[dateKey]) {
        dailySalesMap[dateKey] = { date: dateKey, pairs: 0, volume: 0 };
      }
      dailySalesMap[dateKey].pairs += pairs;
      dailySalesMap[dateKey].volume += vol;
    }

    const dayKeys = Object.keys(dailySalesMap);
    activeSalesDays = dayKeys.length;

    if (incentiveMode === 'slab_per_pair') {
      // Per-Day Tiered Slab Incentive:
      // Evaluates total pairs sold by the employee on each respective day
      for (const dayKey of dayKeys) {
        const dayPairs = dailySalesMap[dayKey].pairs;
        let ratePerPair = 0;

        if (customSlabs) {
          const matched = customSlabs.find(sl => {
            const min = Number(sl.min_qty) || 0;
            const max = (sl.max_qty !== null && sl.max_qty !== undefined && sl.max_qty !== '') ? Number(sl.max_qty) : Infinity;
            return dayPairs >= min && dayPairs <= max;
          });
          if (matched) {
            ratePerPair = Number(matched.incentive_per_pair || 0);
          }
        } else {
          // Dynamic default rule per day:
          // 10 or more pairs / day -> 500 per pair
          // 5 to 9 pairs / day -> 300 per pair
          // 2 to 4 pairs / day -> 200 per pair
          // 1 pair / day -> 0
          if (dayPairs >= 10) {
            ratePerPair = 500;
          } else if (dayPairs >= 5) {
            ratePerPair = 300;
          } else if (dayPairs >= 2) {
            ratePerPair = 200;
          } else {
            ratePerPair = 0;
          }
        }

        salesIncentive += (dayPairs * ratePerPair);
      }
    } else {
      // Percentage mode
      salesIncentive = Math.round((directSalesVolume * directIncentivePct) / 100);
    }
  }

  // Supervised Promoters Override Incentive
  let promoterSalesVolume = 0;
  let promoterOverrideIncentive = 0;

  if (Array.isArray(employee.assigned_promoters) && employee.assigned_promoters.length > 0) {
    const promoterIds = employee.assigned_promoters.map(p => p._id || p);
    
    // Find promoter user accounts or promoter codes
    const promoters = await Promoter.find({ _id: { $in: promoterIds } });
    const promoterUserIds = promoters.map(p => p.user).filter(Boolean);

    if (promoterUserIds.length > 0) {
      const promoterOrders = await Order.find({
        $or: [
          { seller_user: { $in: promoterUserIds } },
          { created_by: { $in: promoterUserIds } }
        ],
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $nin: ['Cancelled', 'Draft'] }
      });

      promoterSalesVolume = promoterOrders.reduce((sum, ord) => {
        return sum + Number(ord.grand_total || ord.subtotal || 0);
      }, 0);

      promoterOverrideIncentive = Math.round((promoterSalesVolume * promoterOverridePct) / 100);
    }
  }

  const totalIncentive = salesIncentive + promoterOverrideIncentive + manualIncentive;

  // 4. Gross & Statutory Deductions
  const gross = earnedBasic + totalIncentive;
  const pfDeduction = Math.round(earnedBasic * 0.06);
  
  // Dynamic TDS calculation:
  // Strictly calculated using the configured TDS % in employee salary structure (0 if not configured)
  let tdsDeduction = 0;
  const rawTdsPct = employee.salary_structure?.tds_pct;
  const configuredTdsPct = (rawTdsPct !== undefined && rawTdsPct !== null && rawTdsPct !== '' && !isNaN(Number(rawTdsPct)))
    ? Number(rawTdsPct)
    : 0;
  if (configuredTdsPct > 0) {
    tdsDeduction = Math.round(gross * (configuredTdsPct / 100));
  }
  const totalDeductions = pfDeduction + tdsDeduction;

  // 5. Net Payable
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
    panNumber: employee.pan_number || 'N/A',
    aadhaarNumber: employee.aadhaar_number || 'N/A',
    aadhaarCardFile: employee.aadhaar_card_file || null,
    panCardFile: employee.pan_card_file || null,
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
    directPairsSold,
    activeSalesDays,
    incentiveMode,
    salesIncentive,
    promoterSalesVolume,
    promoterOverrideIncentive,
    manualIncentive,
    totalIncentive,

    // Deductions & Totals
    pfDeduction,
    tdsDeduction,
    tdsPct: configuredTdsPct,
    totalDeductions,
    gross,
    netSalary,
    status: employee.is_active ? 'Pending' : 'Inactive'
  };
}

// Staff roles eligible for monthly payroll (Sales Manager, Sales Executive, Purchase Manager, Inventory Manager, Finance Manager, HR Manager, Team Member)
export function isEligibleStaffPayroll(emp) {
  if (!emp) return false;
  const roleName = (emp.user?.role?.name || emp.user?.roleName || '').toLowerCase().trim();
  const roleClean = roleName.replace(/[\s_-]+/g, '');

  const desig = (emp.designation?.name || emp.designation_name || '').toLowerCase().trim();
  const desigClean = desig.replace(/[\s_-]+/g, '');

  const dept = (emp.department?.name || emp.department_name || '').toLowerCase().trim();

  // Exclude hierarchy geo managers, founder/ceo, external partners
  const excludedRoles = [
    'founder', 'ceo', 'admin', 
    'countrymanager', 
    'statemanager', 
    'citymanager', 
    'retailer', 'promoter', 'distributor'
  ];
  if (excludedRoles.some(ex => roleClean === ex || desigClean === ex)) {
    return false;
  }

  // Allowed staff roles requested by client:
  const allowedStaff = [
    'salesmanager', 'salesexecutive', 'teammember', 
    'purchasemanager', 'inventorymanager', 'financemanager', 'hrmanager',
    'sales', 'purchase', 'inventory', 'finance', 'hr'
  ];

  if (allowedStaff.some(s => roleClean.includes(s) || desigClean.includes(s))) {
    return true;
  }

  const allowedDepts = ['sales', 'purchase', 'inventory', 'finance', 'hr', 'human resources', 'accounts'];
  if (allowedDepts.some(d => dept.includes(d))) {
    return true;
  }

  return true;
}

/**
 * Controller: Preview / calculate dynamic payroll for team members & staff for a given month
 * GET /api/payrolls/calculate?month=10&year=2026&scope=team_members
 */
export async function calculateMonthlyPayrolls(req, res) {
  try {
    const now = new Date();
    const month = parseInt(req.query.month || (now.getMonth() + 1), 10);
    const year = parseInt(req.query.year || now.getFullYear(), 10);
    const scope = String(req.query.scope || 'team_members').toLowerCase();

    let employees = await Employee.find({ is_deleted: { $ne: true } })
      .populate({ path: 'user', populate: 'role' })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters')
      .sort({ createdAt: -1 });

    // Filter for eligible staff roles (Sales Manager, Sales Executive, Purchase, Inventory, Finance, HR, Team Member)
    if (scope !== 'all') {
      employees = employees.filter(isEligibleStaffPayroll);
    }

    const results = await Promise.all(
      employees.map(emp => calculateSingleEmployeePayroll(emp, year, month))
    );

    // Clean up earlier synthetic test record for July 2026 if present
    if (month === 7 && year === 2026) {
      await Payroll.deleteMany({ month: 7, year: 2026 });
    }
    if (req.query.reset === 'true') {
      await Payroll.deleteMany({ month, year });
    }

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
          paymentMode: saved.payment_mode || 'Bank Transfer',
          paymentNotes: saved.notes || ''
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
    const scope = String(req.body.scope || 'team_members').toLowerCase();

    let employees = await Employee.find({ is_deleted: { $ne: true }, is_active: true })
      .populate({ path: 'user', populate: 'role' })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters');

    if (scope !== 'all') {
      employees = employees.filter(isEligibleStaffPayroll);
    }

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
      message: `Successfully generated attendance-based payroll for ${savedRecords.length} team members for month ${month}/${year}.`,
      count: savedRecords.length
    });
  } catch (err) {
    console.error("Error generating payrolls:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Calculate and process payroll for a specific selected month
 * POST /api/payrolls/calculate-month
 */
export async function calculateAndProcessMonthPayroll(req, res) {
  try {
    const now = new Date();
    const month = parseInt(req.body.month || (now.getMonth() + 1), 10);
    const year = parseInt(req.body.year || now.getFullYear(), 10);
    const scope = String(req.body.scope || 'team_members').toLowerCase();
    const resetStatus = Boolean(req.body.resetStatus);

    let employees = await Employee.find({ is_deleted: { $ne: true }, is_active: true })
      .populate({ path: 'user', populate: 'role' })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters')
      .sort({ createdAt: -1 });

    if (scope !== 'all') {
      employees = employees.filter(isEligibleStaffPayroll);
    }

    const calculated = await Promise.all(
      employees.map(emp => calculateSingleEmployeePayroll(emp, year, month))
    );

    // If reset was explicitly requested, clear existing saved records for this month
    if (resetStatus) {
      await Payroll.deleteMany({ month, year });
    }

    const savedRecords = [];
    for (const calc of calculated) {
      const existing = await Payroll.findOne({ employee: calc.employeeMongoId, month, year });

      // Preserve Paid status unless user explicitly requested reset
      let finalStatus = 'Processed';
      let paidAt = undefined;
      let paymentMode = 'Bank Transfer';

      if (existing && !resetStatus) {
        finalStatus = existing.status || 'Processed';
        paidAt = existing.paid_at;
        paymentMode = existing.payment_mode || 'Bank Transfer';
      }

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
          status: finalStatus,
          paid_at: paidAt,
          payment_mode: paymentMode
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(updated);
    }

    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return res.json({
      success: true,
      message: `Successfully calculated & synchronized payroll for ${monthLabel} (${savedRecords.length} team members).`,
      month,
      year,
      count: savedRecords.length,
      data: calculated.map(c => {
        const s = savedRecords.find(r => String(r.employee) === String(c.employeeMongoId));
        return {
          ...c,
          payrollId: s?._id,
          status: s?.status || c.status,
          paidAt: s?.paid_at,
          paymentMode: s?.payment_mode
        };
      })
    });
  } catch (err) {
    console.error("Error calculating month payroll:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Reset single or all payroll records for a month back to Pending
 * POST /api/payrolls/reset-status
 */
export async function resetPayrollStatus(req, res) {
  try {
    const { employeeId, employeeIds, month, year } = req.body;
    const filter = {};
    if (month) filter.month = parseInt(month, 10);
    if (year) filter.year = parseInt(year, 10);
    if (employeeId) filter.employee = employeeId;
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      filter.employee = { $in: employeeIds };
    }

    await Payroll.deleteMany(filter);

    return res.json({
      success: true,
      message: 'Payroll status reset to Pending successfully.'
    });
  } catch (err) {
    console.error("Error resetting payroll status:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Batch settle payroll for multiple selected employees
 * POST /api/payrolls/batch-settle
 */
export async function batchSettlePayrolls(req, res) {
  try {
    const { 
      employeeIds = [], 
      month, 
      year, 
      status = 'Paid',
      paymentMode = 'Bank Transfer',
      notes = ''
    } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one employee to settle.' });
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const employees = await Employee.find({ 
      _id: { $in: employeeIds },
      is_deleted: { $ne: true } 
    })
      .populate({ path: 'user', populate: 'role' })
      .populate('department')
      .populate('designation')
      .populate('assigned_promoters');

    const settledRecords = [];

    for (const emp of employees) {
      const calc = await calculateSingleEmployeePayroll(emp, yearNum, monthNum);

      const record = await Payroll.findOneAndUpdate(
        { employee: emp._id, month: monthNum, year: yearNum },
        {
          employee: emp._id,
          month: monthNum,
          year: yearNum,
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
          status: status || 'Paid',
          paid_at: (status === 'Paid') ? new Date() : undefined,
          payment_mode: paymentMode || 'Bank Transfer',
          notes: notes || `Monthly Payroll Settle (${monthNum}/${yearNum})`
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      settledRecords.push(record);
    }

    return res.json({
      success: true,
      message: `Successfully settled and recorded payroll for ${settledRecords.length} team members.`,
      count: settledRecords.length,
      data: settledRecords
    });
  } catch (err) {
    console.error("Error batch settling payrolls:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * Controller: Settle / mark single or all payroll records as Processed or Paid
 * POST /api/payrolls/settle
 */
export async function settlePayroll(req, res) {
  try {
    const { 
      employeeId, 
      employeeIds, 
      month, 
      year, 
      status = 'Processed',
      paymentMode = 'Bank Transfer',
      notes = ''
    } = req.body;

    // If an array of employeeIds is passed, delegate to batchSettlePayrolls logic
    if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      req.body.employeeIds = employeeIds;
      return batchSettlePayrolls(req, res);
    }

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (employeeId) {
      // Find employee to ensure full calculation is saved permanently in Payroll model
      const emp = await Employee.findById(employeeId)
        .populate({ path: 'user', populate: 'role' })
        .populate('department')
        .populate('designation')
        .populate('assigned_promoters');

      if (emp) {
        const calc = await calculateSingleEmployeePayroll(emp, yearNum, monthNum);
        const record = await Payroll.findOneAndUpdate(
          { employee: emp._id, month: monthNum, year: yearNum },
          {
            employee: emp._id,
            month: monthNum,
            year: yearNum,
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
            status: status || 'Paid',
            paid_at: (status === 'Paid') ? new Date() : undefined,
            payment_mode: paymentMode || 'Bank Transfer',
            notes: notes || `Payroll Settle (${monthNum}/${yearNum})`
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.json({
          success: true,
          message: `Payroll status updated to ${status} for ${emp.full_name}.`,
          data: record
        });
      }
    }

    const filter = {};
    if (monthNum) filter.month = monthNum;
    if (yearNum) filter.year = yearNum;
    if (employeeId) filter.employee = employeeId;

    const result = await Payroll.updateMany(filter, {
      $set: {
        status,
        paid_at: status === 'Paid' ? new Date() : undefined,
        payment_mode: paymentMode,
        notes: notes || undefined
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

