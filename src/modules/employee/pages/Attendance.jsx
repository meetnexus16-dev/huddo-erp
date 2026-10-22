import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, ArrowDownToLine, 
  ChevronLeft, ChevronRight, Activity, Smile, RefreshCw, CheckCircle2
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';
import { getAccessToken } from '../../../utils/authSession';

const STORAGE_PREFIX = 'huddo_employee_attendance_';

export default function Attendance({ showToast }) {
  // Navigation month state (Defaulting to current date or active month)
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(5); // 0-indexed: 5 = June
  const [loading, setLoading] = useState(false);

  // State for actual logged attendance records
  const [attendance, setAttendance] = useState([]);

  const monthString = useMemo(() => {
    return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  }, [currentYear, currentMonthIndex]);

  const monthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonthIndex, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [currentYear, currentMonthIndex]);

  // Purge any stale mock cache on mount
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith(STORAGE_PREFIX)) {
          const val = localStorage.getItem(k);
          if (val && (val.includes('09:15 AM') || val.includes('Viral fever'))) {
            localStorage.removeItem(k);
          }
        }
      });
    } catch {}
  }, []);

  // Fetch actual attendance from server
  const fetchMonthAttendance = async (year, monthIdx) => {
    const mStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`/api/employee-self/attendance?month=${mStr}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records)) {
          setAttendance(data.records);
          localStorage.setItem(`${STORAGE_PREFIX}${mStr}`, JSON.stringify(data.records));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend attendance fetch error:", err);
    } finally {
      setLoading(false);
    }

    setAttendance([]);
  };

  useEffect(() => {
    fetchMonthAttendance(currentYear, currentMonthIndex);
  }, [currentYear, currentMonthIndex]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  // Generate calendar tiles for all days of the month
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(currentYear, currentMonthIndex, d);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const rec = attendance.find(r => r.date === dateStr);

      if (rec) {
        days.push(rec);
      } else {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        days.push({
          date: dateStr,
          day: dayNames[dayOfWeek],
          checkIn: '',
          checkOut: '',
          hours: '0',
          status: isWeekend ? 'Weekend' : 'Unlogged'
        });
      }
    }
    return days;
  }, [currentYear, currentMonthIndex, attendance]);

  // Dynamic Calendar stats calculations based ONLY on real records
  const stats = useMemo(() => {
    const present = attendance.filter(r => r.status === 'Present' || r.status === 'Half Day').length;
    const absent = attendance.filter(r => r.status === 'Absent').length;
    const leaves = attendance.filter(r => r.status === 'Leave').length;
    const halfDays = attendance.filter(r => r.status === 'Half Day').length;
    const workingDays = attendance.filter(r => r.status !== 'Weekend' && r.status !== 'Holiday').length;
    const workingRatio = workingDays > 0 ? Math.round((present / workingDays) * 100) : (present === 0 && absent === 0 ? 100 : 0);
    return { present, absent, leaves, halfDays, workingRatio };
  }, [attendance]);

  // Handle Export CSV action
  const handleExport = () => {
    try {
      const headers = ["Date", "Day", "Check-in Time", "Check-out Time", "Working Hours", "Status"];
      const rows = attendance.map(r => [
        `"${r.date}"`,
        `"${r.day}"`,
        `"${r.checkIn || '--:--'}"`,
        `"${r.checkOut || '--:--'}"`,
        `"${r.hours || '0'}"`,
        `"${r.status}"`
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Attendance_Ledger_${monthString}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast?.(`Attendance roster for ${monthLabel} downloaded successfully.`, "success");
    } catch (err) {
      showToast?.("Error exporting attendance roster.", "error");
    }
  };

  // Quick toggle status for a specific day
  const handleToggleDayStatus = async (targetDate) => {
    const existing = attendance.find(r => r.date === targetDate);
    const statusCycle = ['Present', 'Half Day', 'Leave', 'Absent', 'Unlogged'];
    const currentStatus = existing ? existing.status : 'Unlogged';
    const currentIdx = statusCycle.indexOf(currentStatus);
    const nextStatus = currentIdx === -1 ? 'Present' : statusCycle[(currentIdx + 1) % statusCycle.length];

    let updated;
    if (nextStatus === 'Unlogged') {
      updated = attendance.filter(r => r.date !== targetDate);
    } else {
      const nextHours = nextStatus === 'Present' ? '8.9' : (nextStatus === 'Half Day' ? '6.0' : '0');
      const nextCheckIn = (nextStatus === 'Present' || nextStatus === 'Half Day') ? '09:15 AM' : '';
      const nextCheckOut = nextStatus === 'Present' ? '06:10 PM' : (nextStatus === 'Half Day' ? '03:30 PM' : '');
      const dObj = new Date(targetDate);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const newRec = {
        date: targetDate,
        day: dayNames[dObj.getDay()],
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        hours: nextHours,
        status: nextStatus
      };
      if (existing) {
        updated = attendance.map(r => r.date === targetDate ? newRec : r);
      } else {
        updated = [...attendance, newRec];
      }
    }

    setAttendance(updated);
    localStorage.setItem(`${STORAGE_PREFIX}${monthString}`, JSON.stringify(updated));

    // Sync to backend
    try {
      const token = getAccessToken();
      await fetch('/api/employee-self/attendance/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          date: targetDate,
          status: nextStatus
        })
      });
    } catch {}

    showToast?.(`${targetDate} marked as ${nextStatus}.`, "success");
  };

  // Color mapper for calendar days
  const getStatusColor = (status) => {
    switch (status) {
      case 'Present': return 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70';
      case 'Absent': return 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70';
      case 'Half Day': return 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70';
      case 'Leave': return 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/70';
      case 'Weekend': return 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100/70';
      case 'Holiday': return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70';
      case 'Unlogged':
      default:
        return 'bg-white text-slate-400 border-slate-200 hover:border-slate-350 hover:bg-slate-50';
    }
  };

  const columns = [
    { header: "Date", accessor: "date", sortable: true },
    { header: "Day", accessor: "day" },
    { header: "Check-in Time", accessor: "checkIn", render: (val) => val || "--:--" },
    { header: "Check-out Time", accessor: "checkOut", render: (val) => val || "--:--" },
    { header: "Working Hours", accessor: "hours", render: (val) => val ? `${val} hrs` : "0.0 hrs" },
    { header: "Status", accessor: "status", render: (val) => <StatusBadge status={val} /> }
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Ticker cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Present Days</span>
          <span className="text-xl font-bold text-slate-800 mt-1 block">{stats.present} Days</span>
          <span className="text-[10px] text-slate-500 font-medium">{stats.halfDays} half-day shifts included</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Absent Days</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">{stats.absent} Days</span>
          <span className="text-[10px] text-slate-500 font-medium">Lop deductions applied</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved Leaves</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">{stats.leaves} Days</span>
          <span className="text-[10px] text-slate-500 font-medium">Charged from balances</span>
        </div>
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Working Ratio</span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block font-display">
              {stats.workingRatio}%
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Smile className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Calendar Grid card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            Duty Calendar View
          </h3>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 px-3 tracking-wide font-display min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchMonthAttendance(currentYear, currentMonthIndex)}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 ml-1"
              title="Refresh Month"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <div key={day} className="text-[10px] font-bold text-slate-400 uppercase py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Monthly day tiles grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day tiles */}
          {calendarDays.map((rec) => {
            const dayNum = parseInt(rec.date.split('-')[2], 10);
            return (
              <div 
                key={rec.date}
                onClick={() => handleToggleDayStatus(rec.date)}
                className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[64px] transition-all cursor-pointer ${getStatusColor(rec.status)}`}
                title={`${rec.date} - ${rec.status} (Click to toggle status)`}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold font-display">{dayNum}</span>
                  <span className="text-[8px] font-extrabold uppercase tracking-tight">{rec.status}</span>
                </div>
                
                {rec.checkIn && rec.checkOut ? (
                  <span className="text-[7.5px] font-medium opacity-85 block truncate mt-1">
                    {rec.checkIn} - {rec.checkOut}
                  </span>
                ) : (
                  <span className="text-[7.5px] font-semibold opacity-60 block mt-1">
                    {rec.status === 'Weekend' || rec.status === 'Holiday' ? 'Off duty' : '--:--'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-400 mt-3 text-right">Tip: Click on any day tile to toggle its duty status.</p>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-400" />
              Attendance History Ledger
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Filter by month and export duty rosters locally.</p>
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Roster</span>
          </button>
        </div>

        <CustomDataTable 
          columns={columns}
          data={attendance}
          searchPlaceholder="Search days..."
          searchKeys={["date", "day", "status"]}
        />
      </div>

    </div>
  );
}
