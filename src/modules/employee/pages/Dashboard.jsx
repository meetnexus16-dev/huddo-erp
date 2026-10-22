import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, CheckCircle, Clock, Calendar, CheckSquare, 
  ArrowRight, Landmark, ShoppingBag, Percent, Users, 
  AlertTriangle, CreditCard, ClipboardList, Briefcase, Plus, MapPin
} from 'lucide-react';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';
import StatusBadge from '../components/StatusBadge';
import { getAccessToken } from '../../../utils/authSession';

export default function Dashboard({ onNavigate, showToast }) {
  const { currentEmployee, activeRole } = useEmployeeAuth();
  
  // Real check-in state
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    return localStorage.getItem('huddo_duty_checked_in') === 'true';
  });
  const [checkInTime, setCheckInTime] = useState(() => {
    return localStorage.getItem('huddo_duty_checkin_time') || '';
  });
  const [checkOutTime, setCheckOutTime] = useState(() => {
    return localStorage.getItem('huddo_duty_checkout_time') || '';
  });

  // Dynamic Metrics
  const [dynamicSalesToday, setDynamicSalesToday] = useState({ count: 0, revenue: 0, pairsSold: 0 });
  const [dynamicCommissionEarned, setDynamicCommissionEarned] = useState(0);
  const [incentivePct, setIncentivePct] = useState(1);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState({ total: 33, used: 0, remaining: 33 });

  // Load live sales & commission data
  useEffect(() => {
    const token = getAccessToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/employee-self/sales', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          const todayStr = new Date().toISOString().split('T')[0];
          const todaySales = data.data.filter(s => s.createdAt && s.createdAt.startsWith(todayStr));
          const todayRev = todaySales.reduce((acc, s) => acc + (s.grand_total || 0), 0);
          const pairs = data.data.reduce((acc, s) => acc + (s.pairs_sold || 0), 0);
          const totalRev = data.data.reduce((acc, s) => acc + (s.grand_total || 0), 0);
          
          setDynamicSalesToday({
            count: todaySales.length,
            revenue: todayRev,
            pairsSold: pairs
          });
          
          // Estimate commission strictly following Founder's configured rate
          const incRate = Number(data.incentive_pct ?? 1);
          setIncentivePct(incRate);
          const earned = data.incentive_earned !== undefined 
            ? Number(data.incentive_earned) 
            : Math.round(totalRev * (incRate / 100));
          setDynamicCommissionEarned(earned);
        }
      })
      .catch(() => {});

    // Load live tasks
    fetch('/api/employee-self/tasks', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.tasks)) {
          const pending = data.tasks.filter(t => t.status !== 'Completed').length;
          setPendingTasksCount(pending);
        }
      })
      .catch(() => {});

    // Load live leaves
    fetch('/api/employee-self/leave-requests', { headers })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.balances) {
          const b = data.balances;
          const total = (b.casual?.total || 0) + (b.sick?.total || 0) + (b.earned?.total || 0);
          const used = (b.casual?.used || 0) + (b.sick?.used || 0) + (b.earned?.used || 0);
          const remaining = (b.casual?.remaining || 0) + (b.sick?.remaining || 0) + (b.earned?.remaining || 0);
          setLeaveBalance({ total, used, remaining });
        }
      })
      .catch(() => {});
  }, []);

  const handleCheckInToggle = () => {
    if (!isCheckedIn) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCheckInTime(now);
      setIsCheckedIn(true);
      localStorage.setItem('huddo_duty_checked_in', 'true');
      localStorage.setItem('huddo_duty_checkin_time', now);
      showToast("Successfully Checked In for the day! GPS live tracking started.", "success");
      
      // Send immediate GPS ping
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          fetch('/api/employee-self/gps-ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          }).catch(() => {});
        }, () => {});
      }
    } else {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCheckOutTime(now);
      setIsCheckedIn(false);
      localStorage.setItem('huddo_duty_checked_in', 'false');
      localStorage.setItem('huddo_duty_checkout_time', now);
      showToast("Successfully Checked Out. Work hours logged.", "success");
    }
  };

  const upcomingHolidays = [
    { name: "Bakri Id / Eid al-Adha", date: "2026-06-17", day: "Wednesday" },
    { name: "Muharram", date: "2026-07-17", day: "Friday" }
  ];

  // Role specific summaries
  const renderRoleSummaryCards = () => {
    switch (activeRole) {
      case 'sales_executive':
      case 'sales_manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Orders Collected Today</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">4 Orders</span>
                <span className="text-xs text-slate-500 font-medium">Value: ₹1,02,000</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-brand-orange">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Target Progress</span>
                  <span className="text-xl font-bold text-slate-800 mt-1 block">81.6%</span>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div className="bg-brand-orange h-full rounded-full" style={{ width: '81.6%' }}></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1.5">
                <span>Achieved: ₹2.45L</span>
                <span>Target: ₹3.00L</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commission This Month</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">₹12,500</span>
                <span className="text-xs text-emerald-600 font-bold">Pending: ₹9,800</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>
        );

      case 'hr_manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Headcount</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">15 Active</span>
                <span className="text-xs text-slate-500 font-medium">1 Inactive / Resigned</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Leave Approvals</span>
                <span className="text-xl font-bold text-rose-600 mt-1 block">1 Request</span>
                <span className="text-xs text-slate-500 font-medium">Awaiting action</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Upcoming Appraisals</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">3 Appraisals</span>
                <span className="text-xs text-slate-500 font-medium">Cycle: June/July</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
          </div>
        );

      case 'finance_manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Revenue (Month)</span>
                <span className="text-xl font-bold text-slate-850 mt-1 block">₹3,45,000</span>
                <span className="text-xs text-emerald-600 font-bold">+12.4% vs last month</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Landmark className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Settlements</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">₹9,800</span>
                <span className="text-xs text-slate-500 font-medium">4 Commissions records</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Outstanding Payments</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">₹40,000</span>
                <span className="text-xs text-rose-500 font-bold">Overdue: ₹15,000</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </div>
        );

      case 'inventory_manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Low Stock Alerts</span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">5 Items</span>
                <span className="text-xs text-rose-600 font-bold">Out of stock: 2 SKUs</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Stock Transfers</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">2 Transfers</span>
                <span className="text-xs text-slate-500 font-medium">1 In Transit, 1 Requested</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total SKUs Managed</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">12 SKUs</span>
                <span className="text-xs text-slate-500 font-medium">Across 3 warehouses</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
          </div>
        );

      case 'purchase_manager':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open Purchase Orders</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">2 Open POs</span>
                <span className="text-xs text-slate-500 font-medium">PO-2026-003, 005</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
                <span className="text-xl font-bold text-amber-600 mt-1 block">1 Awaiting</span>
                <span className="text-xs text-slate-500 font-medium">PO-2026-006 (Apex Pack)</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Vendor Count</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">5 Vendors</span>
                <span className="text-xs text-slate-500 font-medium">1 Inactive vendor</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        );

      case 'team_member':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Direct Sales</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">{dynamicSalesToday.count} Orders</span>
                <span className="text-xs text-emerald-600 font-bold">Revenue: ₹{dynamicSalesToday.revenue.toLocaleString()}</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-brand-orange">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimated Incentive</span>
                <span className="text-xl font-bold text-slate-800 mt-1 block">₹{dynamicCommissionEarned.toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-medium">{dynamicSalesToday.pairsSold} pairs sold ({incentivePct}% POS)</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duty & GPS Status</span>
                <span className="text-xl font-bold text-emerald-600 mt-1 block">
                  {isCheckedIn ? "Active Duty" : "Standby"}
                </span>
                <span className="text-xs text-slate-500 font-medium">Auto-Tracking Ready</span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
    }
  };

  const getQuickLinks = () => {
    switch (activeRole) {
      case 'sales_executive':
        return [
          { label: "My Orders", tab: "My Orders" },
          { label: "Retailer Visits", tab: "Retailer Visits" },
          { label: "Targets & KPIs", tab: "Targets" },
          { label: "Commissions", tab: "Commission" }
        ];
      case 'sales_manager':
        return [
          { label: "Team Orders", tab: "Team Orders" },
          { label: "Retailer Visits", tab: "Retailer Visits" },
          { label: "Targets & KPIs", tab: "Targets" },
          { label: "Commissions", tab: "Commission" }
        ];
      case 'hr_manager':
        return [
          { label: "Employee Directory", tab: "Employee Directory" },
          { label: "Attendance Grid", tab: "Attendance" },
          { label: "Leave Approvals", tab: "Leave Management" },
          { label: "Payroll calculations", tab: "Payroll" }
        ];
      case 'finance_manager':
        return [
          { label: "Commission Calculations", tab: "Commission Calculations" },
          { label: "Revenue Reports", tab: "Revenue Reports" },
          { label: "Expense Tracking", tab: "Expense Tracking" },
          { label: "GST Invoices", tab: "GST Management" }
        ];
      case 'inventory_manager':
        return [
          { label: "Stock Roster", tab: "Stock Management" },
          { label: "Warehouse status", tab: "Warehouse" },
          { label: "Inter-WH Transfers", tab: "Stock Transfers" },
          { label: "Stock Alerts", tab: "Stock Alerts" }
        ];
      case 'purchase_manager':
        return [
          { label: "Vendor Database", tab: "Vendor Management" },
          { label: "Create PO", tab: "Purchase Orders" },
          { label: "PO Approvals", tab: "Purchase Approvals" },
          { label: "Inspection logs", tab: "Material Tracking" }
        ];
      case 'team_member':
      default:
        return [
          { label: "Direct Sales (POS)", tab: "Direct Sales" },
          { label: "My Tasks", tab: "My Tasks" },
          { label: "My Profile", tab: "Profile" },
          { label: "My Attendance", tab: "Attendance" }
        ];
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-md">
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 translate-y-1/4">
          <Briefcase className="w-96 h-96" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-widest block font-display">Welcome Back</span>
            <h1 className="text-2xl font-bold text-white font-display mt-0.5">{currentEmployee.name}</h1>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {currentEmployee.designation} &bull; {currentEmployee.department} Department
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-1.5 bg-slate-800/80 border border-slate-700/50 rounded-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-orange" />
              <div className="text-left">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Duty Session</span>
                <span className="text-xs font-bold text-white">
                  {isCheckedIn ? "Active (Checked In)" : "Not Checked In"}
                </span>
              </div>
            </div>
            <button
              onClick={handleCheckInToggle}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isCheckedIn 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-brand-orange hover:bg-brand-orange-hover text-white'
              }`}
            >
              {isCheckedIn ? "Check Out Now" : "Check In Now"}
            </button>
          </div>
        </div>
      </div>

      {/* Role specific summaries section */}
      {renderRoleSummaryCards()}

      {/* Roster detail widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance Check-in log */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Today's Attendance Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Status:</span>
                <StatusBadge status={isCheckedIn ? "Present" : "Not Checked In"} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Check-in Time:</span>
                <span className="font-bold text-slate-800">{checkInTime || "--:--"}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Check-out Time:</span>
                <span className="font-bold text-slate-800">{checkOutTime || "--:--"}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => onNavigate("Attendance")}
            className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100/80 text-xs font-bold text-slate-600 rounded-lg border border-slate-200 mt-4 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>View Attendance Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Leaves & Balance */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              This Month's Leave Balance
            </h3>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-lg font-extrabold text-slate-700 font-display block">{leaveBalance.total}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Total Granted</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-lg font-extrabold text-brand-orange font-display block">{leaveBalance.used}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Availed</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-lg font-extrabold text-emerald-600 font-display block">{leaveBalance.remaining}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Balance</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate("Leave")}
            className="w-full text-center py-2 bg-slate-50 hover:bg-slate-100/80 text-xs font-bold text-slate-600 rounded-lg border border-slate-200 mt-4 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Request Leave Off</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Holidays */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3.5 font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Upcoming Holidays
            </h3>
            
            <div className="space-y-3">
              {upcomingHolidays.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-b-0 last:pb-0">
                  <div>
                    <span className="font-bold text-slate-700 block">{h.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{h.day}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-250/30 text-[9px] font-extrabold text-slate-500 uppercase">
                    {new Date(h.date).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 italic text-center mt-3">
            Next holiday is in {Math.round((new Date("2026-06-17") - new Date("2026-06-16")) / (1000 * 60 * 60 * 24))} day(s)
          </div>
        </div>

      </div>

      {/* Quick Links Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-slate-400" />
          Role Quick Links
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {getQuickLinks().map((link, i) => (
            <button
              key={i}
              onClick={() => onNavigate(link.tab)}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 text-left transition-colors flex items-center justify-between group cursor-pointer"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-orange group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
