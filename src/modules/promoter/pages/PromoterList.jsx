// PROMO-MODULE: Promoter list page implementation with filters, stats cards, and action events.

import React, { useState, useEffect } from 'react';
import { Plus, Eye, Edit, Trash2, CheckCircle2, UserCheck, UserMinus, ShieldAlert, Download, BarChart2 } from 'lucide-react';
import { DataTable } from '../../../components/Common';
import { useConfirm } from '../../../context/ConfirmContext';
import { GEOGRAPHY } from '../../../mockData';

export default function PromoterList({ onNavigate, showToast }) {
  const { confirm } = useConfirm();
  const [promoters, setPromoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    total_promoters: 0,
    active_promoters: 0,
    pending_verification: 0,
    total_revenue_generated: 0,
    total_royalty_pending: 0
  });

  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [paymentStatus, setPaymentStatus] = useState('All');
  const [verification, setVerification] = useState('All');
  const [selectedState, setSelectedState] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All');

  // Fetch functions
  const fetchPromoters = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        status,
        payment_status: paymentStatus,
        verification,
        state: selectedState,
        city: selectedCity
      });
      const res = await fetch(`/api/promoters?${q.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setPromoters(result.data || []);
      }
    } catch (err) {
      showToast("Failed to fetch promoters list.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/promoters/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to fetch promoter analytics", err);
    }
  };

  useEffect(() => {
    fetchPromoters();
    fetchAnalytics();
  }, [search, status, paymentStatus, verification, selectedState, selectedCity]);

  // Actions
  const handleToggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/promoters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(`Promoter status updated to ${nextStatus}.`, "success");
        fetchPromoters();
        fetchAnalytics();
      }
    } catch (err) {
      showToast("Failed to update status.", "error");
    }
  };

  const handleVerify = async (id, action) => {
    try {
      const res = await fetch(`/api/promoters/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showToast(`Promoter has been ${action.toLowerCase()}.`, "success");
        fetchPromoters();
        fetchAnalytics();
      }
    } catch (err) {
      showToast("Verification action failed.", "error");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete promoter?',
      message: 'Are you sure you want to delete this promoter? All retailer mappings will be unlinked.',
      confirmText: 'Delete',
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/promoters/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Promoter soft deleted successfully.", "success");
        fetchPromoters();
        fetchAnalytics();
      }
    } catch (err) {
      showToast("Delete operation failed.", "error");
    }
  };

  const exportAllPromoters = () => {
    if (!promoters || !promoters.length) {
      showToast("No promoter data to export.", "error");
      return;
    }
    try {
      const headers = ["Code ID", "Name", "Mobile", "Email", "Retailers Mapped", "Revenue (Month)", "Earned Royalty (5%)", "Status"];
      const rows = promoters.map(p => [
        p.promoter_code || "",
        p.full_name || "",
        p.mobile_number || "",
        p.email || "",
        `${p.total_retailers_mapped || 0} shops`,
        `₹${(p.current_month_revenue || 0).toLocaleString('en-IN')}`,
        `₹${(p.royalty_pending || 0).toLocaleString('en-IN')}`,
        p.status || "Active"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `promoters_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Report exported successfully.", "success");
    } catch (err) {
      console.error("CSV Export error:", err);
      showToast("Export failed.", "error");
    }
  };

  // Columns for DataTable
  const columns = [
    {
      header: "Code ID",
      accessor: "promoter_code",
      render: (val) => <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">{val}</code>
    },
    {
      header: "Name",
      accessor: "full_name",
      render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span>
    },
    { header: "Mobile", accessor: "mobile_number" },
    { header: "Email", accessor: "email", render: (val) => val || <span className="text-slate-400 font-semibold">N/A</span> },
    {
      header: "Retailers Mapped",
      accessor: "total_retailers_mapped",
      render: (val) => <span className="font-bold text-slate-700">{val || 0} shops</span>
    },
    {
      header: "Revenue (Month)",
      accessor: "current_month_revenue",
      render: (val) => <span className="font-bold text-slate-900">₹{(val || 0).toLocaleString('en-IN')}</span>
    },
    // PROMO-MODULE: Earned Royalty label strictly updated to show 5%
    {
      header: "Earned Royalty (5%)",
      accessor: "total_royalty_earned",
      render: (val) => <span className="font-bold text-emerald-600 font-display">₹{(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: "Pending Royalty",
      accessor: "pending_royalty",
      render: (val) => <span className="font-bold text-rose-600">₹{(val || 0).toLocaleString('en-IN')}</span>
    },
    {
      header: "Payment Status",
      accessor: "payment_status",
      render: (val) => {
        const color = val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : val === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{val || 'Unpaid'}</span>;
      }
    },
    {
      header: "Verification",
      accessor: "verification_status",
      render: (val) => {
        const color = val === 'Verified' ? 'bg-emerald-100 text-emerald-800' : val === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{val || 'Pending'}</span>;
      }
    },
    {
      header: "Status",
      accessor: "status",
      render: (val) => {
        const color = val === 'Active' ? 'bg-emerald-100 text-emerald-800' : val === 'Suspended' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{val || 'Active'}</span>;
      }
    },
    {
      header: "Actions",
      accessor: "promoter_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate(`detail-${val}`)}
            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate(`edit-${val}`)}
            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors"
            title="Edit promoter"
          >
            <Edit className="w-4 h-4" />
          </button>
          {row.verification_status === 'Pending' && (
            <>
              <button
                onClick={() => handleVerify(val, 'Verified')}
                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition-colors"
                title="Verify Profile"
              >
                <UserCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleVerify(val, 'Rejected')}
                className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
                title="Reject Profile"
              >
                <UserMinus className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={() => handleToggleStatus(val, row.status)}
            className="p-1 hover:bg-amber-50 text-amber-600 rounded transition-colors"
            title={row.status === 'Active' ? 'Deactivate' : 'Activate'}
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(val)}
            className="p-1 hover:bg-rose-50 text-rose-600 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Promoter Management</h1>
          <p className="text-sm text-slate-500">Track independent business partners, audit accrued royalty ledgers, manage retailer mapping rules, and configure incentives.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={exportAllPromoters}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster</span>
          </button>
          <button 
            onClick={() => onNavigate('analytics')}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-xs transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
            <span>View Analytics</span>
          </button>
          <button 
            onClick={() => onNavigate('add')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start"
          >
            <Plus className="w-4 h-4" />
            <span>Add Promoter</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Total Promoters</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-2 font-display">{analytics.total_promoters || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Promoters</span>
          <span className="text-2xl font-extrabold text-emerald-600 mt-2 font-display">{analytics.active_promoters || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Pending Verification</span>
          <span className="text-2xl font-extrabold text-amber-600 mt-2 font-display">{analytics.pending_verification || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Revenue (Month)</span>
          <span className="text-2xl font-extrabold text-slate-800 mt-2 font-display">₹{(analytics.total_revenue_generated || 0).toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Royalty Pending</span>
          <span className="text-2xl font-extrabold text-rose-600 mt-2 font-display">₹{(analytics.total_royalty_pending || 0).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Search Keywords</label>
            <input
              type="text"
              placeholder="Name, mobile, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-medium"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
            >
              <option value="All">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
            </select>
          </div>

          {/* Verification */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Verification</label>
            <select
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
            >
              <option value="All">All Verifications</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* State */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">State</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedCity('All');
              }}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
            >
              <option value="All">All States</option>
              {GEOGRAPHY.states.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">City</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none focus:border-brand-orange font-semibold"
            >
              <option value="All">All Cities</option>
              {GEOGRAPHY.cities
                .filter(c => selectedState === 'All' || c.state === selectedState)
                .map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <DataTable
          columns={columns}
          data={promoters}
          searchPlaceholder="Filter cached table roster..."
          searchKeys={["full_name", "promoter_code", "mobile_number"]}
          emptyStateText={loading ? "Loading promoters..." : "No promoters match selected filters."}
        />
      </div>
    </div>
  );
}
