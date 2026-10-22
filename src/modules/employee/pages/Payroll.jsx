import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, CreditCard, ChevronRight, ArrowDownToLine, 
  Eye, CheckCircle2, ClipboardList, Calendar, X,
  Clock, AlertTriangle, TrendingUp, Award, DollarSign,
  Percent, RefreshCw, ShieldAlert, Sparkles, Building2, User
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { getAccessToken } from '../../../utils/authSession';

const MONTH_OPTIONS = [
  { label: 'October 2026', month: 10, year: 2026 },
  { label: 'September 2026', month: 9, year: 2026 },
  { label: 'August 2026', month: 8, year: 2026 },
  { label: 'July 2026', month: 7, year: 2026 },
  { label: 'June 2026', month: 6, year: 2026 },
  { label: 'May 2026', month: 5, year: 2026 }
];

export default function Payroll({ showToast, isSelfView = false }) {
  const { activeRole } = useEmployeeAuth();
  
  const [selectedMonthObj, setSelectedMonthObj] = useState(MONTH_OPTIONS[0]);
  const [payrollList, setPayrollList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState(null);

  // Check if current role has HR/processing rights
  const isHR = activeRole === 'hr_manager' || activeRole === 'Founder' || activeRole === 'founder' || !isSelfView;

  // Fetch dynamic attendance-based payroll
  const loadPayrolls = async (month, year) => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (isSelfView) {
        // Fetch personal self payroll
        const res = await fetch(`/api/employee-self/payroll?month=${year}-${String(month).padStart(2, '0')}`, { headers });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.payroll) {
            setPayrollList([resData.payroll]);
            setLoading(false);
            return;
          }
        }
      }

      // Fetch all employees dynamic calculation
      const res = await fetch(`/api/payrolls/calculate?month=${month}&year=${year}`, { headers });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && Array.isArray(resData.data)) {
          setPayrollList(resData.data);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not load dynamic payroll from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls(selectedMonthObj.month, selectedMonthObj.year);
  }, [selectedMonthObj, isSelfView]);

  // Aggregate stats across loaded records
  const stats = useMemo(() => {
    const totalBaseMonthly = payrollList.reduce((acc, p) => acc + (p.baseMonthlyRate || 0), 0);
    const totalLOPDeductions = payrollList.reduce((acc, p) => acc + (p.attendanceDeductionLOP || 0), 0);
    const totalEarnedBase = payrollList.reduce((acc, p) => acc + (p.earnedBasic || 0), 0);
    const totalIncentives = payrollList.reduce((acc, p) => acc + (p.totalIncentive || 0), 0);
    const totalGross = payrollList.reduce((acc, p) => acc + (p.gross || 0), 0);
    const totalNet = payrollList.reduce((acc, p) => acc + (p.netSalary || 0), 0);
    const processedCount = payrollList.filter(p => p.status === 'Processed' || p.status === 'Paid').length;
    const pendingCount = payrollList.filter(p => p.status === 'Pending').length;
    return {
      totalBaseMonthly,
      totalLOPDeductions,
      totalEarnedBase,
      totalIncentives,
      totalGross,
      totalNet,
      processedCount,
      pendingCount
    };
  }, [payrollList]);

  // Generate & Save into official Payroll collection
  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/payrolls/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          month: selectedMonthObj.month,
          year: selectedMonthObj.year
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Generated official payroll for ${data.count} employees.`, 'success');
        loadPayrolls(selectedMonthObj.month, selectedMonthObj.year);
      } else {
        showToast?.(data.message || 'Failed to generate payroll.', 'error');
      }
    } catch (err) {
      showToast?.('Error generating payroll.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Mark single employee payroll as Processed / Paid
  const handleProcessPayroll = async (employeeMongoId) => {
    try {
      const token = getAccessToken();
      const res = await fetch('/api/payrolls/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          employeeId: employeeMongoId,
          month: selectedMonthObj.month,
          year: selectedMonthObj.year,
          status: 'Processed'
        })
      });
      if (res.ok) {
        setPayrollList(prev => prev.map(p => 
          p.employeeMongoId === employeeMongoId ? { ...p, status: 'Processed' } : p
        ));
        const emp = payrollList.find(p => p.employeeMongoId === employeeMongoId);
        showToast?.(`Payroll marked as Processed for ${emp?.name || 'employee'}.`, 'success');
      }
    } catch (err) {
      showToast?.('Failed to update payroll status.', 'error');
    }
  };

  const handleDownloadPayslip = (empName) => {
    showToast?.(`Downloading official payslip for ${empName} - ${selectedMonthObj.label}.`, 'success');
    window.print();
  };

  const columns = [
    { 
      header: "Employee", 
      accessor: "name", 
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{val}</span>
          <span className="text-[10px] text-slate-500 font-mono">{row.employeeId} · {row.department}</span>
        </div>
      )
    },
    { 
      header: "Base (Monthly Rate)", 
      accessor: "baseMonthlyRate", 
      render: (val) => (
        <div>
          <span className="font-bold text-slate-800">₹{(val || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block">Entered Rate</span>
        </div>
      )
    },
    { 
      header: "Attendance & LOP", 
      accessor: "payableDays", 
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800 text-xs">
              {row.payableDays || row.presentDays || 0} / {row.totalDays || 30} Days
            </span>
          </div>
          {(row.attendanceDeductionLOP || 0) > 0 ? (
            <span className="text-[10px] font-bold text-rose-600 block">
              -{row.absentDays}d Absent (-₹{(row.attendanceDeductionLOP || 0).toLocaleString('en-IN')})
            </span>
          ) : (
            <span className="text-[10px] font-bold text-emerald-600 block">
              100% Present / Paid
            </span>
          )}
        </div>
      )
    },
    { 
      header: "Earned Base Pay", 
      accessor: "earnedBasic", 
      render: (val) => (
        <div>
          <span className="font-extrabold text-slate-900">₹{(val || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block">After Attendance</span>
        </div>
      ) 
    },
    { 
      header: "Sales & Overrides Incentive", 
      accessor: "totalIncentive", 
      render: (val, row) => (
        <div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
            (val || 0) > 0 
              ? 'bg-amber-50 text-amber-800 border border-amber-300' 
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`}>
            +₹{(val || 0).toLocaleString('en-IN')}
          </span>
          {(row.salesIncentive > 0 || row.promoterOverrideIncentive > 0) && (
            <span className="text-[9px] text-amber-700 block mt-0.5 font-medium">
              POS ₹{row.salesIncentive || 0} | PRO ₹{row.promoterOverrideIncentive || 0}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "Deductions", 
      accessor: "totalDeductions", 
      render: (val) => (
        <span className="text-slate-500 font-semibold text-xs">
          -₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ) 
    },
    { 
      header: "Net Disbursed", 
      accessor: "netSalary", 
      render: (val) => (
        <span className="font-extrabold text-emerald-600 font-display text-sm">
          ₹{(val || 0).toLocaleString('en-IN')}
        </span>
      ) 
    },
    { 
      header: "Status", 
      accessor: "status", 
      render: (val) => <StatusBadge status={val} /> 
    },
    { 
      header: "Actions", 
      accessor: "employeeMongoId", 
      sortable: false, 
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setViewingPayslip(row)}
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Inspect Detailed Attendance & Incentive Payslip"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {isHR && row.status === 'Pending' && (
            <button 
              onClick={() => handleProcessPayroll(val)}
              className="flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settle</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
            <Landmark className="w-5 h-5 text-brand-orange" />
            {isSelfView ? "My Attendance-Based Payslip & Incentives" : "Dynamic Payroll & Compensation Management"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Base salary is dynamically calculated from actual clock-in attendance & leaves, with variable sales incentives segregated.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Month Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={`${selectedMonthObj.month}-${selectedMonthObj.year}`}
              onChange={(e) => {
                const [m, y] = e.target.value.split('-').map(Number);
                const found = MONTH_OPTIONS.find(opt => opt.month === m && opt.year === y);
                if (found) setSelectedMonthObj(found);
              }}
              className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              {MONTH_OPTIONS.map(opt => (
                <option key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sync Button */}
          <button 
            onClick={() => loadPayrolls(selectedMonthObj.month, selectedMonthObj.year)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Recalculate live from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-orange' : 'text-slate-500'}`} />
            <span>Recalculate</span>
          </button>

          {/* Settle All Button */}
          {!isSelfView && isHR && stats.pendingCount > 0 && (
            <button 
              onClick={handleGeneratePayroll}
              disabled={generating}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{generating ? 'Processing...' : `Generate & Settle (${stats.pendingCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Monthly Rate</span>
          <span className="text-lg font-bold text-slate-800 mt-0.5 block">₹{stats.totalBaseMonthly.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-500 font-medium">Entered master rate</span>
        </div>

        <div className="bg-white border border-rose-200 p-3.5 rounded-xl shadow-xs bg-rose-50/20">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Attendance LOP Deductions</span>
          <span className="text-lg font-bold text-rose-600 mt-0.5 block">-₹{stats.totalLOPDeductions.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-rose-600 font-medium">Loss of pay for absent days</span>
        </div>

        <div className="bg-white border border-indigo-200 p-3.5 rounded-xl shadow-xs bg-indigo-50/20">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Earned Base Salary</span>
          <span className="text-lg font-bold text-indigo-700 mt-0.5 block">₹{stats.totalEarnedBase.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-indigo-600 font-medium">Payable on attendance</span>
        </div>

        <div className="bg-white border border-amber-200 p-3.5 rounded-xl shadow-xs bg-amber-50/20">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Sales & Overrides Incentives</span>
          <span className="text-lg font-bold text-amber-600 mt-0.5 block">+₹{stats.totalIncentives.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-amber-700 font-medium">Direct POS + Promoters</span>
        </div>

        <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Net Disbursed Total</span>
          <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block font-display">₹{stats.totalNet.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-medium">Final credited to bank</span>
        </div>
      </div>

      {/* Roster Database Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            Payroll Register Ledger ({selectedMonthObj.label})
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            Showing {payrollList.length} employee compensation records
          </span>
        </div>

        <CustomDataTable 
          columns={columns}
          data={payrollList}
          searchKeys={["employeeId", "name", "department", "status"]}
          searchPlaceholder="Search by name, ID, role or department..."
        />
      </div>

      {/* DETAILED ATTENDANCE & PAYROLL AUDIT DRAWER */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-brand-orange shadow-xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 font-display">
                      Monthly Payslip — {selectedMonthObj.label}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      {viewingPayslip.name} ({viewingPayslip.employeeId}) · {viewingPayslip.designation}
                    </p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setViewingPayslip(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-5 text-xs">

                {/* 1. Bank & Organization Details Card */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department / Team</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">{viewingPayslip.department}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Credit Bank Account</span>
                    <span className="font-mono font-bold text-slate-800 mt-0.5 block">{viewingPayslip.bank}</span>
                  </div>
                </div>

                {/* 2. ATTENDANCE AUDIT SHEET (CRITICAL REQUIREMENT) */}
                <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Monthly Attendance & Leave Log
                    </h4>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      Daily Rate: ₹{(viewingPayslip.perDayRate || 0).toLocaleString('en-IN')}/day
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-indigo-100">
                      <span className="text-[10px] text-slate-400 font-medium block">Total Days</span>
                      <span className="text-sm font-extrabold text-slate-800">{viewingPayslip.totalDays || 30}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 font-medium block">Present Days</span>
                      <span className="text-sm font-extrabold text-emerald-700">{viewingPayslip.presentDays || 0}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-600 font-medium block">Half Days</span>
                      <span className="text-sm font-extrabold text-blue-700">{viewingPayslip.halfDays || 0}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-rose-100">
                      <span className="text-[10px] text-rose-600 font-medium block">Absent (LOP)</span>
                      <span className="text-sm font-extrabold text-rose-700">{viewingPayslip.absentDays || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-indigo-100 text-[11px]">
                    <span className="text-slate-600 font-medium">
                      Payable Work Days ({viewingPayslip.payableDays || 0}d) Attendance:
                    </span>
                    <span className="font-extrabold text-indigo-900">
                      {Math.round(((viewingPayslip.payableDays || 30) / (viewingPayslip.totalDays || 30)) * 100)}% Fulfilled
                    </span>
                  </div>
                </div>

                {/* 3. SALARY EARNINGS & DEDUCTIONS BREAKDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Earnings */}
                  <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-between">
                      <span>Base Salary & Allowances</span>
                      <span className="text-[9px] text-emerald-600 uppercase font-bold">Credit</span>
                    </h4>

                    <div className="space-y-2 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Configured Base Rate:</span>
                        <span className="font-bold text-slate-900">₹{(viewingPayslip.baseMonthlyRate || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex justify-between text-rose-600 bg-rose-50/60 p-1.5 rounded border border-rose-100">
                        <span className="font-medium">Less: Attendance LOP ({viewingPayslip.absentDays}d):</span>
                        <span className="font-extrabold">-₹{(viewingPayslip.attendanceDeductionLOP || 0).toLocaleString('en-IN')}</span>
                      </div>

                      <div className="flex justify-between pt-1 border-t border-slate-100 text-slate-900 font-bold">
                        <span>Earned Base Salary:</span>
                        <span className="text-indigo-700 font-extrabold">₹{(viewingPayslip.earnedBasic || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-3 bg-white p-4 border border-slate-200 rounded-xl">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1 flex items-center justify-between">
                      <span>Statutory Deductions</span>
                      <span className="text-[9px] text-rose-600 uppercase font-bold">Debit</span>
                    </h4>

                    <div className="space-y-2 text-xs font-semibold text-slate-700">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Provident Fund (PF 6%):</span>
                        <span>-₹{(viewingPayslip.pfDeduction || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Income Tax (TDS):</span>
                        <span>-₹{(viewingPayslip.tdsDeduction || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 text-slate-900 font-bold">
                        <span>Total Deductions:</span>
                        <span className="text-rose-600 font-extrabold">-₹{(viewingPayslip.totalDeductions || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. PERFORMANCE INCENTIVES (SEGREGATED AS REQUESTED) */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-amber-200/80 pb-1.5">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Variable Performance Incentives Breakdown
                    </h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Separate from Base
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100">
                      <div>
                        <span className="font-bold text-slate-800 block">Direct POS / Counter Sales Incentive</span>
                        <span className="text-[10px] text-slate-400">Total Sales Volume: ₹{(viewingPayslip.directSalesVolume || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <span className="font-black text-amber-700 text-sm">
                        +₹{(viewingPayslip.salesIncentive || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100">
                      <div>
                        <span className="font-bold text-slate-800 block">Supervised Promoters Override Incentive</span>
                        <span className="text-[10px] text-slate-400">Promoter Volume: ₹{(viewingPayslip.promoterSalesVolume || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <span className="font-black text-blue-700 text-sm">
                        +₹{(viewingPayslip.promoterOverrideIncentive || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {Number(viewingPayslip.manualIncentive || 0) > 0 && (
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100">
                        <div>
                          <span className="font-bold text-slate-800 block">Founder Special Bonus / Award</span>
                          <span className="text-[10px] text-slate-400">Approved by Founder Management</span>
                        </div>
                        <span className="font-black text-emerald-700 text-sm">
                          +₹{(viewingPayslip.manualIncentive || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 font-bold text-amber-950">
                      <span>Total Performance Incentive:</span>
                      <span className="font-black text-amber-800 text-base">
                        +₹{(viewingPayslip.totalIncentive || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. FINAL NET CREDITED DISPATCH SUMMARY */}
                <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between shadow-md">
                  <div>
                    <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider block font-display">
                      Net Disbursed Take-Home Pay
                    </span>
                    <span className="text-xl font-black font-display block mt-0.5 text-white">
                      ₹{(viewingPayslip.netSalary || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      (Earned Base ₹{(viewingPayslip.earnedBasic || 0).toLocaleString('en-IN')} + Incentive ₹{(viewingPayslip.totalIncentive || 0).toLocaleString('en-IN')} - Deductions ₹{(viewingPayslip.totalDeductions || 0).toLocaleString('en-IN')})
                    </span>
                  </div>
                  
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    viewingPayslip.status === 'Processed' || viewingPayslip.status === 'Paid'
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-amber-500 text-slate-950'
                  }`}>
                    {viewingPayslip.status}
                  </span>
                </div>

              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                onClick={() => handleDownloadPayslip(viewingPayslip.name)}
                className="flex-1 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Print / Download Payslip</span>
              </button>
              <button 
                onClick={() => setViewingPayslip(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
