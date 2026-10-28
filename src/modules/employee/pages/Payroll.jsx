import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Landmark, CreditCard, ChevronRight, ArrowDownToLine, 
  Eye, CheckCircle2, ClipboardList, Calendar, X,
  Clock, AlertTriangle, TrendingUp, Award, DollarSign,
  Percent, RefreshCw, ShieldAlert, Sparkles, Building2, User,
  Printer, CheckSquare, Square, FileText, Check, ShieldCheck, Download
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import { getAccessToken } from '../../../utils/authSession';

// Helper: Convert numbers to Indian Rupees words for official payslip
function numberToWordsINR(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 
             'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n === 0) return '';
    let str = '';
    if (Math.floor(n / 10000000) > 0) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (Math.floor(n / 100000) > 0) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (Math.floor(n / 1000) > 0) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (Math.floor(n / 100) > 0) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) {
        str += a[n] + ' ';
      } else {
        str += b[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + a[n % 10] : '') + ' ';
      }
    }
    return str.trim();
  }

  const rounded = Math.round(Number(num));
  return inWords(rounded) + ' Rupees Only';
}

// Generate past 12 dynamic monthly options
const generateMonthOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      month: d.getMonth() + 1,
      year: d.getFullYear()
    });
  }
  return options;
};

const MONTH_OPTIONS = generateMonthOptions();

export default function Payroll({ showToast, isSelfView = false }) {
  const authContext = useEmployeeAuth?.() || {};
  const activeRole = authContext.activeRole;
  
  const [selectedMonthObj, setSelectedMonthObj] = useState(MONTH_OPTIONS[0]);
  const [payrollList, setPayrollList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scopeFilter, setScopeFilter] = useState('team_members'); // 'team_members' | 'all'

  // Multi-Employee Selection State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

  // Modals
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [isBatchSettleOpen, setIsBatchSettleOpen] = useState(false);
  const [settling, setSettling] = useState(false);
  const [batchSettlingEmployees, setBatchSettlingEmployees] = useState([]); // Array of employee records to settle
  const [settlementForm, setSettlementForm] = useState({
    paymentMode: 'Bank Transfer',
    referenceNo: '',
    notes: ''
  });

  // Multiple printable payslips modal state
  const [batchPrintingList, setBatchPrintingList] = useState(null);

  // Check if current session has HR/Founder processing rights
  const isHR = activeRole === 'hr_manager' || activeRole === 'Founder' || activeRole === 'founder' || !isSelfView;

  // Fetch dynamic attendance-based payroll from backend
  const loadPayrolls = async (month, year, scope = scopeFilter) => {
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

      // Fetch dynamic calculation endpoint with role scope filter
      const res = await fetch(`/api/payrolls/calculate?month=${month}&year=${year}&scope=${scope}`, { headers });
      if (res.ok) {
        const resData = await res.json();
        if (resData.success && Array.isArray(resData.data)) {
          setPayrollList(resData.data);
          // Clean selection if month/scope changes
          setSelectedEmployeeIds(prev => prev.filter(id => resData.data.some(d => d.employeeMongoId === id)));
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
    loadPayrolls(selectedMonthObj.month, selectedMonthObj.year, scopeFilter);
  }, [selectedMonthObj, isSelfView, scopeFilter]);

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

  // Selected employees computation
  const selectedRecords = useMemo(() => {
    return payrollList.filter(p => selectedEmployeeIds.includes(p.employeeMongoId));
  }, [payrollList, selectedEmployeeIds]);

  const selectedStats = useMemo(() => {
    const count = selectedRecords.length;
    const totalEarnedBase = selectedRecords.reduce((acc, p) => acc + (p.earnedBasic || 0), 0);
    const totalIncentive = selectedRecords.reduce((acc, p) => acc + (p.totalIncentive || 0), 0);
    const totalNet = selectedRecords.reduce((acc, p) => acc + (p.netSalary || 0), 0);
    return { count, totalEarnedBase, totalIncentive, totalNet };
  }, [selectedRecords]);

  // Toggle selection handlers
  const handleToggleSelectAll = () => {
    if (selectedEmployeeIds.length === payrollList.length && payrollList.length > 0) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(payrollList.map(p => p.employeeMongoId));
    }
  };

  const handleToggleSelectRow = (employeeMongoId) => {
    setSelectedEmployeeIds(prev => {
      if (prev.includes(employeeMongoId)) {
        return prev.filter(id => id !== employeeMongoId);
      } else {
        return [...prev, employeeMongoId];
      }
    });
  };

  // Open batch settle modal for selected employees
  const handleOpenBatchSettleModal = (specificEmployees = null) => {
    const targetList = specificEmployees || selectedRecords;
    if (!targetList || targetList.length === 0) {
      showToast?.('Please select at least one employee to settle.', 'error');
      return;
    }
    setBatchSettlingEmployees(targetList);
    setSettlementForm({
      paymentMode: 'Bank Transfer',
      referenceNo: `PAY-${selectedMonthObj.year}${String(selectedMonthObj.month).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: `Monthly compensation for ${selectedMonthObj.label}`
    });
    setIsBatchSettleOpen(true);
  };

  // Execute batch settle
  const handleConfirmBatchSettle = async () => {
    if (!batchSettlingEmployees || batchSettlingEmployees.length === 0) return;

    setSettling(true);
    try {
      const token = getAccessToken();
      const targetIds = batchSettlingEmployees.map(e => e.employeeMongoId);

      const res = await fetch('/api/payrolls/batch-settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          employeeIds: targetIds,
          month: selectedMonthObj.month,
          year: selectedMonthObj.year,
          status: 'Paid',
          paymentMode: settlementForm.paymentMode,
          notes: `${settlementForm.referenceNo ? `Ref: ${settlementForm.referenceNo}. ` : ''}${settlementForm.notes}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(`Successfully settled & recorded payment for ${targetIds.length} team members!`, 'success');
        
        // Update local list
        setPayrollList(prev => prev.map(p => {
          if (targetIds.includes(p.employeeMongoId)) {
            return {
              ...p,
              status: 'Paid',
              paidAt: new Date().toISOString(),
              paymentMode: settlementForm.paymentMode,
              paymentNotes: settlementForm.referenceNo
            };
          }
          return p;
        }));

        setIsBatchSettleOpen(false);
        setSelectedEmployeeIds([]);
      } else {
        showToast?.(data.message || 'Failed to settle payroll.', 'error');
      }
    } catch (err) {
      console.error("Error settling payroll:", err);
      showToast?.('Error processing payroll settlement.', 'error');
    } finally {
      setSettling(false);
    }
  };

  // Dedicated Calculate Selected Month Handler
  const handleCalculateSelectedMonth = async () => {
    setCalculating(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/payrolls/calculate-month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          month: selectedMonthObj.month,
          year: selectedMonthObj.year,
          scope: scopeFilter
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.(data.message || `Calculated payroll for ${selectedMonthObj.label}!`, 'success');
        if (Array.isArray(data.data)) {
          setPayrollList(data.data);
        } else {
          loadPayrolls(selectedMonthObj.month, selectedMonthObj.year, scopeFilter);
        }
      } else {
        showToast?.(data.message || 'Failed to calculate payroll.', 'error');
      }
    } catch (err) {
      console.error("Error calculating month payroll:", err);
      showToast?.('Error calculating payroll for the selected month.', 'error');
    } finally {
      setCalculating(false);
    }
  };

  // Reset payroll status back to Pending
  const handleResetPayrollStatus = async (employeeId = null) => {
    try {
      const token = getAccessToken();
      const res = await fetch('/api/payrolls/reset-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          employeeId: employeeId || undefined,
          month: selectedMonthObj.month,
          year: selectedMonthObj.year
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast?.('Payroll status reset to Pending.', 'success');
        loadPayrolls(selectedMonthObj.month, selectedMonthObj.year, scopeFilter);
      } else {
        showToast?.(data.message || 'Failed to reset status.', 'error');
      }
    } catch (err) {
      showToast?.('Error resetting status.', 'error');
    }
  };

  // Generate & Save into official Payroll collection (Recalculate & save all)
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
          year: selectedMonthObj.year,
          scope: scopeFilter
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(`Generated attendance & incentive payroll for ${data.count} team members.`, 'success');
        loadPayrolls(selectedMonthObj.month, selectedMonthObj.year, scopeFilter);
      } else {
        showToast?.(data.message || 'Failed to generate payroll.', 'error');
      }
    } catch (err) {
      showToast?.('Error generating payroll.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Browser print trigger
  const handlePrintSlip = () => {
    window.print();
  };

  const isAllSelected = payrollList.length > 0 && selectedEmployeeIds.length === payrollList.length;
  const isIndeterminate = selectedEmployeeIds.length > 0 && selectedEmployeeIds.length < payrollList.length;

  // Custom Table Columns with Multi-Select Checkboxes
  const columns = [
    {
      header: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={el => { if (el) el.indeterminate = isIndeterminate; }}
            onChange={handleToggleSelectAll}
            className="w-4 h-4 rounded text-brand-orange border-slate-300 focus:ring-brand-orange cursor-pointer"
            title="Select / Deselect All Team Members"
          />
        </div>
      ),
      accessor: "employeeMongoId",
      sortable: false,
      render: (val) => (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedEmployeeIds.includes(val)}
            onChange={() => handleToggleSelectRow(val)}
            className="w-4 h-4 rounded text-brand-orange border-slate-300 focus:ring-brand-orange cursor-pointer"
          />
        </div>
      )
    },
    { 
      header: "Team Member", 
      accessor: "name", 
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-900 block">{val}</span>
          <span className="text-[10px] text-slate-500 font-mono">
            {row.employeeId} · {row.designation || 'Sales Executive'}
          </span>
          <span className="text-[10px] text-slate-400 block font-sans">
            {row.bank || 'HDFC Bank - Primary'}
          </span>
        </div>
      )
    },
    { 
      header: "Monthly Base Rate", 
      accessor: "baseMonthlyRate", 
      render: (val) => (
        <div>
          <span className="font-bold text-slate-800">₹{(val || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block">Master Configured</span>
        </div>
      )
    },
    { 
      header: "Attendance & LOP", 
      accessor: "payableDays", 
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1">
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
      header: "Earned Base Salary", 
      accessor: "earnedBasic", 
      render: (val) => (
        <div>
          <span className="font-extrabold text-slate-900">₹{(val || 0).toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-slate-400 block">Attendance Adjusted</span>
        </div>
      ) 
    },
    { 
      header: "Company-Paid Incentive", 
      accessor: "totalIncentive", 
      render: (val, row) => (
        <div>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
            (val || 0) > 0 
              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
              : 'bg-slate-50 text-slate-400 border border-slate-200'
          }`}>
            +₹{(val || 0).toLocaleString('en-IN')}
          </span>
          {(row.salesIncentive > 0 || row.promoterOverrideIncentive > 0 || row.manualIncentive > 0) && (
            <span className="text-[9px] text-amber-800 block mt-0.5 font-medium">
              POS ₹{row.salesIncentive || 0}{row.directPairsSold > 0 ? ` (${row.directPairsSold} prs)` : ''} | PRO ₹{row.promoterOverrideIncentive || 0}
              {row.manualIncentive > 0 ? ` | Bonus ₹${row.manualIncentive}` : ''}
            </span>
          )}
        </div>
      ) 
    },
    { 
      header: "Deductions", 
      accessor: "totalDeductions", 
      render: (val, row) => (
        <div>
          <span className="text-slate-700 font-bold text-xs block">
            -₹{(val || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-slate-400 block font-medium">
            PF: ₹{row.pfDeduction || 0} | TDS: ₹{row.tdsDeduction || 0}
          </span>
        </div>
      ) 
    },
    { 
      header: "Net Disbursed", 
      accessor: "netSalary", 
      render: (val) => (
        <div>
          <span className="font-extrabold text-emerald-700 font-display text-sm block">
            ₹{(val || 0).toLocaleString('en-IN')}
          </span>
          <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
            Total Take-Home
          </span>
        </div>
      ) 
    },
    { 
      header: "Status", 
      accessor: "status", 
      render: (val, row) => (
        <div>
          <StatusBadge status={val} />
          {val === 'Paid' && row.paidAt && (
            <span className="text-[9px] text-slate-400 block mt-0.5">
              {new Date(row.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>
      )
    },
    { 
      header: "Actions", 
      accessor: "employeeMongoId", 
      sortable: false, 
      render: (val, row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setViewingPayslip(row)}
            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
            title="Inspect & Print Official Payslip"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {isHR && row.status !== 'Paid' && (
            <button 
              onClick={() => handleOpenBatchSettleModal([row])}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-[10px] font-bold cursor-pointer"
              title="Settle & Pay this team member"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settle</span>
            </button>
          )}

          {row.status === 'Paid' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setViewingPayslip(row)}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-[10px] font-bold cursor-pointer"
                title="Download/Print Salary Slip"
              >
                <Printer className="w-3 h-3 text-slate-500" />
                <span>Slip</span>
              </button>
              {isHR && (
                <button 
                  onClick={() => handleResetPayrollStatus(row.employeeMongoId)}
                  className="flex items-center gap-1 px-1.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors text-[10px] font-bold cursor-pointer"
                  title="Reset status back to Pending to recalculate"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
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
            {isSelfView ? "My Attendance-Based Payslip & Incentives" : "Team Member Monthly Payroll Management"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Dynamic payroll calculated strictly from monthly attendance clock-ins, LOP absent deductions, and company sales incentives.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Scope Filter Switcher */}
          {!isSelfView && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setScopeFilter('team_members')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  scopeFilter === 'team_members'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Team Members Only
              </button>
              <button
                onClick={() => setScopeFilter('all')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  scopeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Employees
              </button>
            </div>
          )}

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

          {/* Dedicated Calculate Month Button */}
          {!isSelfView && (
            <button 
              onClick={handleCalculateSelectedMonth}
              disabled={calculating || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-600 hover:to-brand-orange text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-60"
              title={`Calculate attendance, updated base salary & sales incentives strictly for ${selectedMonthObj.label}`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${calculating ? 'animate-spin text-white' : 'text-amber-200'}`} />
              <span>{calculating ? `Calculating...` : `Calculate (${selectedMonthObj.label})`}</span>
            </button>
          )}

          {/* Refresh View Button */}
          <button 
            onClick={() => loadPayrolls(selectedMonthObj.month, selectedMonthObj.year, scopeFilter)}
            disabled={loading || calculating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Refresh current view from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-orange' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>

          {/* Settle All Button */}
          {!isSelfView && isHR && stats.pendingCount > 0 && (
            <button 
              onClick={() => handleOpenBatchSettleModal(payrollList.filter(p => p.status !== 'Paid'))}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settle All ({stats.pendingCount})</span>
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
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Company-Paid Incentives</span>
          <span className="text-lg font-bold text-amber-600 mt-0.5 block">+₹{stats.totalIncentives.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-amber-700 font-medium">Direct POS + Promoters</span>
        </div>

        <div className="bg-white border border-emerald-200 p-3.5 rounded-xl shadow-xs bg-emerald-50/20">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Net Disbursed Total</span>
          <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block font-display">₹{stats.totalNet.toLocaleString('en-IN')}</span>
          <span className="text-[10px] text-emerald-600 font-medium">
            {stats.processedCount} Paid / {stats.pendingCount} Pending
          </span>
        </div>
      </div>

      {/* FLOATING / STICKY BATCH ACTION BAR (When 1+ Employees are Selected) */}
      {selectedEmployeeIds.length > 0 && !isSelfView && (
        <div className="sticky top-4 z-30 bg-slate-900 text-white rounded-xl p-4 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-white">
                  {selectedStats.count} Team Members Selected
                </span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                  {selectedMonthObj.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-0.5">
                <span>Earned Base: <strong className="text-white">₹{selectedStats.totalEarnedBase.toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>Incentives: <strong className="text-amber-400">+₹{selectedStats.totalIncentive.toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>Total Net Pay: <strong className="text-emerald-400 font-display">₹{selectedStats.totalNet.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenBatchSettleModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Settle Selected ({selectedStats.count})</span>
            </button>

            <button
              onClick={() => setBatchPrintingList(selectedRecords)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all border border-slate-700 cursor-pointer"
              title="Preview and print payslips for all selected members"
            >
              <Printer className="w-4 h-4 text-brand-orange" />
              <span>Print Slips</span>
            </button>

            <button
              onClick={() => setSelectedEmployeeIds([])}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Month Isolation & Calculation Banner */}
      <div className="bg-gradient-to-r from-amber-50/70 via-orange-50/50 to-amber-50/70 border border-amber-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-bold text-amber-950">
            Current Selected Ledger: <span className="font-extrabold text-brand-orange">{selectedMonthObj.label}</span>
          </span>
          <span className="text-[11px] text-amber-800 hidden md:inline">
            — Attendance LOP, direct counter POS (5%), promoter overrides (1%), and bonuses are strictly scoped to {selectedMonthObj.label}.
          </span>
        </div>
        {!isSelfView && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Updated base salary or incentives?
            </span>
            <button 
              onClick={handleCalculateSelectedMonth}
              disabled={calculating || loading}
              className="text-xs font-bold text-brand-orange hover:text-amber-700 hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Calculate {selectedMonthObj.label}</span>
            </button>
          </div>
        )}
      </div>

      {/* Roster Database Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display">
              Team Member Payroll Ledger ({selectedMonthObj.label})
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
              Attendance + Incentive
            </span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            Showing {payrollList.length} records · Select rows for batch settlement
          </span>
        </div>

        <CustomDataTable 
          columns={columns}
          data={payrollList}
          searchKeys={["employeeId", "name", "department", "designation", "status"]}
          searchPlaceholder="Search by team member name, code, bank or status..."
        />
      </div>

      {/* BATCH SETTLEMENT CONFIRMATION MODAL */}
      {isBatchSettleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Settle Monthly Payroll ({batchSettlingEmployees.length} Members)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedMonthObj.label} · Official Data Recording & Status Update
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsBatchSettleOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Financial Summary Box */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-emerald-900 font-semibold">
                  <span>Total Base Earned (Attendance Adjusted):</span>
                  <span>₹{batchSettlingEmployees.reduce((sum, e) => sum + (e.earnedBasic || 0), 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-amber-900 font-semibold">
                  <span>Total Variable Incentive Paid by Company:</span>
                  <span>+₹{batchSettlingEmployees.reduce((sum, e) => sum + (e.totalIncentive || 0), 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Less: Total Statutory Deductions:</span>
                  <span>-₹{batchSettlingEmployees.reduce((sum, e) => sum + (e.totalDeductions || 0), 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-emerald-200 flex justify-between items-center font-bold text-sm text-emerald-950">
                  <span>Total Net Payable Disbursal:</span>
                  <span className="font-extrabold text-base text-emerald-700 font-display">
                    ₹{batchSettlingEmployees.reduce((sum, e) => sum + (e.netSalary || 0), 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Disbursal Payment Mode
                  </label>
                  <select
                    value={settlementForm.paymentMode}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="UPI">UPI Direct Pay</option>
                    <option value="Cheque">Company Cheque</option>
                    <option value="Cash">Cash Ledger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Payment Transaction Reference / UTR No.
                  </label>
                  <input
                    type="text"
                    value={settlementForm.referenceNo}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, referenceNo: e.target.value }))}
                    placeholder="e.g. UTR-9834271892"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Audit Notes / Comments
                  </label>
                  <input
                    type="text"
                    value={settlementForm.notes}
                    onChange={(e) => setSettlementForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Approved and settled by Management"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700">Permanent Record Notice:</span> Clicking settle will update each employee's record in the MongoDB <code>Payroll</code> collection to <strong>Paid</strong> with a permanent timestamp and audit trail.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setIsBatchSettleOpen(false)}
                className="flex-1 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBatchSettle}
                disabled={settling}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{settling ? 'Recording & Disbursing...' : 'Confirm & Record Disbursal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DETAILED ATTENDANCE & PAYROLL AUDIT DRAWER */}
      {viewingPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto print:overflow-visible">
              
              {/* Drawer Header (Hidden when printing) */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-brand-orange shadow-xs">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 font-display">
                      Team Member Monthly Payslip
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      {viewingPayslip.name} ({viewingPayslip.employeeId}) · {viewingPayslip.monthLabel}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintSlip}
                    className="p-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Print Payslip"
                  >
                    <Printer className="w-4 h-4 text-brand-orange" />
                    <span>Print</span>
                  </button>
                  <button 
                    onClick={() => setViewingPayslip(null)}
                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* OFFICIAL PRINTABLE PAYSLIP BODY */}
              <div className="p-6 space-y-5 text-xs bg-white" id="official-payslip-print">
                
                {/* Official Letterhead */}
                <div className="border-b-2 border-slate-900 pb-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-black tracking-widest text-brand-orange font-display">HUDDO</span>
                    <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded uppercase">Footwear</span>
                  </div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest mt-1">
                    Salary & Performance Incentive Computation Slip
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Month of Computation: <strong>{viewingPayslip.monthLabel}</strong>
                  </p>
                </div>

                {/* 1. Employee & Organization Particulars */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 border border-slate-200 rounded-xl text-[11px]">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Employee Code:</span>
                      <span className="font-mono font-bold text-slate-800">{viewingPayslip.employeeId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Full Name:</span>
                      <span className="font-bold text-slate-900">{viewingPayslip.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Designation:</span>
                      <span className="font-medium text-slate-700">{viewingPayslip.designation}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Department:</span>
                      <span className="font-medium text-slate-700">{viewingPayslip.department}</span>
                    </div>
                  </div>

                  <div className="space-y-1 border-l border-slate-200 pl-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Bank Account:</span>
                      <span className="font-mono font-bold text-slate-800">{viewingPayslip.bank}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">PAN Card:</span>
                      <span className="font-mono font-bold text-slate-800">{viewingPayslip.panNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Aadhaar No:</span>
                      <span className="font-mono font-bold text-slate-800">{viewingPayslip.aadhaarNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Payment Mode:</span>
                      <span className="font-medium text-slate-800">{viewingPayslip.paymentMode || 'Bank Transfer'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Disbursal Status:</span>
                      <span className={`font-bold ${viewingPayslip.status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {viewingPayslip.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Contact:</span>
                      <span className="font-medium text-slate-700">{viewingPayslip.mobile}</span>
                    </div>
                  </div>
                </div>

                {/* 2. ATTENDANCE AUDIT SHEET */}
                <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Monthly Attendance Log & Loss of Pay (LOP)
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
                      Payable Days: <strong>{viewingPayslip.payableDays || 0} Days</strong> (Including Weekends & Leaves)
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
                      <span>Base Salary & Attendance</span>
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
                        <span className="text-slate-500 font-medium">Provident Fund (PF):</span>
                        <span>-₹{(viewingPayslip.pfDeduction || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <span className="text-slate-500 font-medium block">
                            Income Tax (TDS{viewingPayslip.tdsPct ? ` @ ${viewingPayslip.tdsPct}%` : ''}):
                          </span>
                          {viewingPayslip.panNumber && (
                            <span className="text-[9px] text-slate-400 font-mono">PAN: {viewingPayslip.panNumber}</span>
                          )}
                        </div>
                        <span className="font-bold text-rose-600">-₹{(viewingPayslip.tdsDeduction || 0).toLocaleString('en-IN')}</span>
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
                      Variable Performance Incentives (Paid by Company)
                    </h4>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Segregated from Base
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100">
                      <div>
                        <span className="font-bold text-slate-800 block">Direct Counter / POS Sales Incentive</span>
                        <span className="text-[10px] text-slate-500 block">
                          {viewingPayslip.incentiveMode === 'slab_per_pair' ? (
                            <span>Daily Tiered Slab: <strong>{viewingPayslip.directPairsSold || 0} pairs sold</strong>{viewingPayslip.activeSalesDays ? ` across ${viewingPayslip.activeSalesDays} selling days` : ''} (Vol: ₹{(viewingPayslip.directSalesVolume || 0).toLocaleString('en-IN')})</span>
                          ) : (
                            <span>Percentage Model · Vol: ₹{(viewingPayslip.directSalesVolume || 0).toLocaleString('en-IN')}</span>
                          )}
                        </span>
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
                          <span className="font-bold text-slate-800 block">Founder Special Performance Bonus</span>
                          <span className="text-[10px] text-slate-400">Awarded by Company Management</span>
                        </div>
                        <span className="font-black text-emerald-700 text-sm">
                          +₹{(viewingPayslip.manualIncentive || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 font-bold text-amber-950">
                      <span>Total Company Performance Incentive:</span>
                      <span className="font-black text-amber-800 text-base">
                        +₹{(viewingPayslip.totalIncentive || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. FINAL NET CREDITED DISPATCH SUMMARY */}
                <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider block font-display">
                        Net Disbursed Take-Home Pay
                      </span>
                      <span className="text-2xl font-black font-display block mt-0.5 text-white">
                        ₹{(viewingPayslip.netSalary || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      viewingPayslip.status === 'Paid'
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {viewingPayslip.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-800">
                    Amount in Words: <strong>{numberToWordsINR(viewingPayslip.netSalary)}</strong>
                  </p>
                </div>

                {/* Signatures */}
                <div className="pt-8 pb-4 grid grid-cols-2 gap-8 text-center text-[10px] text-slate-500">
                  <div className="border-t border-slate-300 pt-2">
                    <span className="font-bold text-slate-800 block">Employee Signature</span>
                    <span>{viewingPayslip.name}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-2">
                    <span className="font-bold text-slate-800 block">Authorized Signatory</span>
                    <span>Huddo Shoes Management</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer Actions (Hidden when printing) */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 print:hidden">
              <button 
                onClick={handlePrintSlip}
                className="flex-1 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>

              {isHR && viewingPayslip.status !== 'Paid' && (
                <button 
                  onClick={() => handleOpenBatchSettleModal([viewingPayslip])}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Settle Now</span>
                </button>
              )}

              <button 
                onClick={() => setViewingPayslip(null)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BATCH PRINTING MULTIPLE PAYSLIPS MODAL */}
      {batchPrintingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-brand-orange" />
                <h3 className="text-sm font-bold">
                  Batch Print Payslips ({batchPrintingList.length} Team Members)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print All</span>
                </button>
                <button
                  onClick={() => setBatchPrintingList(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
              {batchPrintingList.map((emp, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 page-break-after">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{emp.name} ({emp.employeeId})</h4>
                      <p className="text-[10px] text-slate-500">{emp.designation} · {emp.department} · {emp.bank}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-700 block">₹{(emp.netSalary || 0).toLocaleString('en-IN')}</span>
                      <span className="text-[9px] uppercase font-bold text-slate-400">{emp.monthLabel}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                    <div>Attendance: <strong>{emp.payableDays}/{emp.totalDays} Days</strong></div>
                    <div>Earned Base: <strong>₹{(emp.earnedBasic || 0).toLocaleString('en-IN')}</strong></div>
                    <div>Incentive: <strong className="text-amber-700">+₹{(emp.totalIncentive || 0).toLocaleString('en-IN')}</strong></div>
                    <div>Deductions: <strong className="text-rose-600">-₹{(emp.totalDeductions || 0).toLocaleString('en-IN')}{emp.tdsDeduction > 0 ? ` (TDS: ₹${emp.tdsDeduction})` : ''}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
