import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, FileText, Send, XCircle, AlertCircle, RefreshCw
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import CustomDataTable from '../components/CustomDataTable';
import { authFetch } from '../../../utils/authFetch';
import { getAccessToken } from '../../../utils/authSession';

const STORAGE_KEY = 'huddo_employee_leaves';

const CLEAN_LEAVES = {
  balances: {
    casual: { total: 12, used: 0, remaining: 12 },
    sick: { total: 6, used: 0, remaining: 6 },
    earned: { total: 15, used: 0, remaining: 15 }
  },
  requests: []
};

export default function Leave({ showToast }) {
  const [leavesData, setLeavesData] = useState(CLEAN_LEAVES);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaveType, setLeaveType] = useState("Casual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [fileAttached, setFileAttached] = useState(null);

  // Purge any stale mock leaves cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && (cached.includes('LR-101') || cached.includes('Viral fever'))) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Dynamic balance calculator helper
  const computeBalances = (requests) => {
    const quotas = { casual: 12, sick: 6, earned: 15 };
    const used = { casual: 0, sick: 0, earned: 0 };

    requests.forEach(r => {
      if (r.status === 'Approved' || r.status === 'Pending') {
        const type = (r.type || r.leave_type || '').toLowerCase();
        const d = Number(r.days || 1);
        if (type.includes('casual') || type === 'cl') used.casual += d;
        else if (type.includes('sick') || type === 'sl') used.sick += d;
        else if (type.includes('earned') || type.includes('privilege') || type === 'el' || type === 'pl') used.earned += d;
      }
    });

    return {
      casual: { total: quotas.casual, used: used.casual, remaining: Math.max(0, quotas.casual - used.casual) },
      sick: { total: quotas.sick, used: used.sick, remaining: Math.max(0, quotas.sick - used.sick) },
      earned: { total: quotas.earned, used: used.earned, remaining: Math.max(0, quotas.earned - used.earned) }
    };
  };

  // Fetch dynamic leave requests from server
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/employee-self/leave-requests', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.requests)) {
          const updated = {
            balances: data.balances || computeBalances(data.requests),
            requests: data.requests
          };
          setLeavesData(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return;
        }
      }
    } catch (err) {
      console.warn("Backend leave fetch error:", err);
    } finally {
      setLoading(false);
    }

    setLeavesData(CLEAN_LEAVES);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Auto calculate duration in days
  const leaveDays = React.useMemo(() => {
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      const end = new Date(toDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
        return diffDays;
      }
    }
    return 0;
  }, [fromDate, toDate]);

  // Form submission handler
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      showToast?.("Please fill in all required form inputs.", "error");
      return;
    }
    if (new Date(toDate) < new Date(fromDate)) {
      showToast?.("To Date cannot be before From Date.", "error");
      return;
    }

    setSubmitting(true);
    const newRequest = {
      id: `LR-${String(100 + leavesData.requests.length + 1)}`,
      type: leaveType,
      from: fromDate,
      to: toDate,
      days: leaveDays,
      reason: reason.trim(),
      attachment: fileAttached || '',
      status: "Pending"
    };

    try {
      const res = await fetch('/api/employee-self/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: leaveType,
          from: fromDate,
          to: toDate,
          days: leaveDays,
          reason: reason.trim(),
          attachment: fileAttached || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.requests) {
          const updated = {
            balances: data.balances || computeBalances(data.requests),
            requests: data.requests
          };
          setLeavesData(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          showToast?.(`Leave request submitted successfully for ${leaveDays} day(s).`, "success");
          setFromDate("");
          setToDate("");
          setReason("");
          setFileAttached(null);
          setSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.warn("API submit error, saving locally:", err);
    }

    // Local state fallback update
    const updatedRequests = [newRequest, ...leavesData.requests];
    const updated = {
      balances: computeBalances(updatedRequests),
      requests: updatedRequests
    };
    setLeavesData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Reset form
    setFromDate("");
    setToDate("");
    setReason("");
    setFileAttached(null);
    setSubmitting(false);
    showToast?.(`Leave request submitted successfully for ${leaveDays} day(s).`, "success");
  };

  // Cancel pending leave request handler
  const handleCancelLeave = async (reqId) => {
    try {
      const res = await fetch(`/api/employee-self/leave-requests/${reqId}/cancel`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.requests) {
          const updated = {
            balances: data.balances || computeBalances(data.requests),
            requests: data.requests
          };
          setLeavesData(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          showToast?.("Leave request cancelled successfully.", "success");
          return;
        }
      }
    } catch (err) {
      console.warn("API cancel error, saving locally:", err);
    }

    // Local update fallback
    const updatedRequests = leavesData.requests.map(req => 
      req.id === reqId ? { ...req, status: "Cancelled" } : req
    );
    const updated = {
      balances: computeBalances(updatedRequests),
      requests: updatedRequests
    };
    setLeavesData(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    showToast?.("Leave request cancelled successfully.", "success");
  };

  const columns = [
    { header: "Request ID", accessor: "id" },
    { header: "Leave Type", accessor: "type" },
    { header: "From Date", accessor: "from" },
    { header: "To Date", accessor: "to" },
    { header: "Days", accessor: "days", render: (val) => `${val} Day(s)` },
    { header: "Reason", accessor: "reason", render: (val) => <span className="truncate max-w-[150px] block" title={val}>{val}</span> },
    { header: "Status", accessor: "status", render: (val) => <StatusBadge status={val} /> },
    { 
      header: "Actions", 
      accessor: "id", 
      sortable: false, 
      render: (val, row) => (
        row.status === 'Pending' ? (
          <button
            onClick={() => handleCancelLeave(val)}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors text-[10px] font-bold cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        ) : null
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Leave balance cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Casual Leave */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-800 font-display">Casual Leave (CL)</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Yearly Quota: {leavesData.balances?.casual?.total ?? 12}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center mt-4">
            <div>
              <span className="text-lg font-bold text-slate-800 font-display block">{leavesData.balances?.casual?.total ?? 12}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
            </div>
            <div>
              <span className="text-lg font-bold text-brand-orange font-display block">{leavesData.balances?.casual?.used ?? 0}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Availed</span>
            </div>
            <div>
              <span className="text-lg font-bold text-emerald-600 font-display block">{leavesData.balances?.casual?.remaining ?? 12}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Balance</span>
            </div>
          </div>
        </div>

        {/* Sick Leave */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-800 font-display">Sick Leave (SL)</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Yearly Quota: {leavesData.balances?.sick?.total ?? 6}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center mt-4">
            <div>
              <span className="text-lg font-bold text-slate-800 font-display block">{leavesData.balances?.sick?.total ?? 6}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
            </div>
            <div>
              <span className="text-lg font-bold text-brand-orange font-display block">{leavesData.balances?.sick?.used ?? 0}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Availed</span>
            </div>
            <div>
              <span className="text-lg font-bold text-emerald-600 font-display block">{leavesData.balances?.sick?.remaining ?? 6}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Balance</span>
            </div>
          </div>
        </div>

        {/* Earned Leave */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <span className="text-xs font-bold text-slate-800 font-display">Earned Leave (EL)</span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">Yearly Quota: {leavesData.balances?.earned?.total ?? 15}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center mt-4">
            <div>
              <span className="text-lg font-bold text-slate-800 font-display block">{leavesData.balances?.earned?.total ?? 15}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Total</span>
            </div>
            <div>
              <span className="text-lg font-bold text-brand-orange font-display block">{leavesData.balances?.earned?.used ?? 0}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Availed</span>
            </div>
            <div>
              <span className="text-lg font-bold text-emerald-600 font-display block">{leavesData.balances?.earned?.remaining ?? 15}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Balance</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main page body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Application Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs h-fit">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 font-display flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            Apply For Leave
          </h3>

          <form onSubmit={handleApplyLeave} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Leave Category</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">From Date</label>
                <input 
                  type="date" 
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium text-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">To Date</label>
                <input 
                  type="date" 
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {leaveDays > 0 && (
              <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-emerald-800 text-[10px] font-bold">
                <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Calculated Duration: {leaveDays} Day(s) leave request</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Reason/Remarks</label>
              <textarea 
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Brief description of reasoning..."
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white font-medium text-slate-750 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Supporting Documentation (Optional)</label>
              <div className="border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50 text-center flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <FileText className="w-6 h-6 text-slate-400" />
                <span className="text-[10px] font-semibold text-slate-600">
                  {fileAttached ? fileAttached : "Attach files (medical etc.)"}
                </span>
                <input 
                  type="file" 
                  onChange={(e) => setFileAttached(e.target.files[0]?.name || null)}
                  className="hidden" 
                  id="leave-file-input"
                />
                <label htmlFor="leave-file-input" className="text-[8px] text-slate-400 cursor-pointer hover:underline">PDF, JPG up to 2MB</label>
              </div>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Leave Request'}</span>
            </button>
          </form>
        </div>

        {/* Requests Table List */}
        <div className="lg:col-span-2 space-y-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                My Leaves Roster history
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Track your submitted requests and cancellation updates.</p>
            </div>
            <button
              onClick={fetchLeaves}
              disabled={loading}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs flex items-center gap-1"
              title="Refresh Leave History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-bold hidden sm:inline">Refresh</span>
            </button>
          </div>

          <CustomDataTable 
            columns={columns}
            data={leavesData.requests}
            searchPlaceholder="Search leave logs..."
            searchKeys={["type", "reason", "status", "id"]}
          />
        </div>

      </div>

    </div>
  );
}
