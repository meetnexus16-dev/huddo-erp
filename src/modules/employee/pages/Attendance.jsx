import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, ArrowDownToLine, 
  ChevronLeft, ChevronRight, Activity, Smile, RefreshCw, CheckCircle2
} from 'lucide-react';
import { mockAttendance as initialAttendance } from '../mockData/mockAttendance';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';

const STORAGE_PREFIX = 'huddo_employee_attendance_';

export default function Attendance({ showToast }) {
  // Navigation month state (Defaulting to June 2026 as per design, with full dynamic navigation)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(5); // 0-indexed: 5 = June
  const [loading, setLoading] = useState(false);

  const monthString = useMemo(() => {
    return `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  }, [currentYear, currentMonthIndex]);

  const monthLabel = useMemo(() => {
    const d = new Date(currentYear, currentMonthIndex, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  }, [currentYear, currentMonthIndex]);

  // Generate dynamic records for a given month
  const generateMonthRecords = (year, monthIdx) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const records = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, monthIdx, d);
      const dayOfWeek = dateObj.getDay();
      const dayName = dayNames[dayOfWeek];
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

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
  };

  // State for attendance records of active month
  const [attendance, setAttendance] = useState(() => {
    try {
      const cached = localStorage.getItem(`${STORAGE_PREFIX}2026-06`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return initialAttendance;
  });

  // Fetch dynamic attendance from server or local storage
  const fetchMonthAttendance = async (year, monthIdx) => {
    const mStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
    setLoading(true);
    try {
      const res = await fetch(`/api/employee-self/attendance?month=${mStr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.records) && data.records.length > 0) {
          setAttendance(data.records);
          localStorage.setItem(`${STORAGE_PREFIX}${mStr}`, JSON.stringify(data.records));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend attendance fetch fallback:", err);
    } finally {
      setLoading(false);
    }

    // Cached or dynamic generated records
    try {
      const cached = localStorage.getItem(`${STORAGE_PREFIX}${mStr}`);
      if (cached) {
        setAttendance(JSON.parse(cached));
        return;
      }
    } catch {}

    const generated = (mStr === '2026-06') ? initialAttendance : generateMonthRecords(year, monthIdx);
    setAttendance(generated);
    localStorage.setItem(`${STORAGE_PREFIX}${mStr}`, JSON.stringify(generated));
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

  // Dynamic Calendar stats calculations
  const stats = useMemo(() => {
    const present = attendance.filter(r => r.status === 'Present' || r.status === 'Half Day').length;
    const absent = attendance.filter(r => r.status === 'Absent').length;
    const leaves = attendance.filter(r => r.status === 'Leave').length;
    const halfDays = attendance.filter(r => r.status === 'Half Day').length;
    const workingDays = attendance.filter(r => r.status !== 'Weekend' && r.status !== 'Holiday').length;
    const workingRatio = workingDays > 0 ? Math.round((present / workingDays) * 100) : 100;
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
    const currentRecord = attendance.find(r => r.date === targetDate);
    if (!currentRecord) return;

    const statusCycle = ['Present', 'Half Day', 'Leave', 'Absent'];
    const currentIdx = statusCycle.indexOf(currentRecord.status);
    const nextStatus = currentIdx === -1 ? 'Present' : statusCycle[(currentIdx + 1) % statusCycle.length];

    const nextHours = nextStatus === 'Present' ? '8.9' : (nextStatus === 'Half Day' ? '6.0' : '0');
    const nextCheckIn = (nextStatus === 'Present' || nextStatus === 'Half Day') ? '09:15 AM' : '';
    const nextCheckOut = nextStatus === 'Present' ? '06:10 PM' : (nextStatus === 'Half Day' ? '03:30 PM' : '');

    const updated = attendance.map(r => 
      r.date === targetDate
        ? { ...r, status: nextStatus, checkIn: nextCheckIn, checkOut: nextCheckOut, hours: nextHours }
        : r
    );

    setAttendance(updated);
    localStorage.setItem(`${STORAGE_PREFIX}${monthString}`, JSON.stringify(updated));

    // Sync to backend
    try {
      await fetch('/api/employee-self/attendance/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate,
          status: nextStatus,
          checkIn: nextCheckIn,
          checkOut: nextCheckOut,
          hours: nextHours
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
      case 'Holiday':
      case 'Weekend':
      default:
        return 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100/70';
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
          {attendance.map((rec) => {
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
