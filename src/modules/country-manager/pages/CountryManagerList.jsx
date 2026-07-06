// CM-MODULE: Frontend component for listing Country Managers
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, RefreshCw, Eye, Edit2, ShieldAlert, Trash2, Globe, TrendingUp, CheckCircle, Shield } from 'lucide-react';
import { DataTable } from '../../../components/Common';
import { useConfirm } from '../../../context/ConfirmContext';

export default function CountryManagerList({ onNavigate, showToast }) {
  const { confirm } = useConfirm();
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    country: 'All'
  });
  const [countryOptions, setCountryOptions] = useState([]);

  useEffect(() => {
    fetch('/api/countries')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setCountryOptions(data.data);
        }
      })
      .catch(err => console.error('Error loading countries for filter:', err));
  }, []);

  // Fetch all managers
  const fetchManagers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.search) query.append('search', filters.search);
      if (filters.status && filters.status !== 'All') query.append('status', filters.status);
      if (filters.country && filters.country !== 'All') query.append('country_id', filters.country);

      const res = await fetch(`/api/country-managers?${query.toString()}`);
      const result = await res.json();
      if (res.ok) {
        setManagers(Array.isArray(result.data) ? result.data : []);
      } else {
        setManagers([]);
        showToast(result.message || "Failed to fetch Country Managers", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch Country Managers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, [filters]);

  // Handle suspend action
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`/api/country-managers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast(`Manager status changed to ${newStatus}`, "success");
        fetchManagers();
      }
    } catch (err) {
      showToast("Failed to update status", "error");
    }
  };

  // Handle delete action
  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Country Manager?',
      message: 'Are you sure you want to delete this Country Manager? All assigned states will be unassigned.',
      confirmText: 'Delete',
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/country-managers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Country Manager deleted successfully", "success");
        fetchManagers();
      }
    } catch (err) {
      showToast("Failed to delete Country Manager", "error");
    }
  };

  // KPI Statistics
  const totalManagers = managers.length;
  const activeManagers = managers.filter(m => m.status === 'Active').length;
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    return `₹${Number(value).toLocaleString('en-IN')}`;
  };

  const formatCount = (value, suffix = '') => {
    if (value === null || value === undefined) return '—';
    return `${value}${suffix}`;
  };

  const countriesCovered = new Set(
    managers
      .map((m) => m.assigned_country_name)
      .filter((name) => name && name !== 'Not Assigned')
  ).size;

  const totalRevenue = managers.reduce((sum, manager) => sum + (manager.current_month_revenue || 0), 0);
  const avgRevenue = totalManagers > 0 ? formatCurrency(Math.round(totalRevenue / totalManagers)) : '—';

  const getProfileImage = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const columns = [
    { header: "Code", accessor: "employee_code", render: (val) => <span className="font-bold font-mono text-[13px] text-slate-700">{val || '—'}</span> },
    { header: "Full Name", accessor: "full_name", render: (val, row) => (
      <div className="flex items-center gap-2">
        <img src={getProfileImage(row.profile_photo_url)} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200" />
        <span className="font-bold text-slate-800 font-display">{val}</span>
      </div>
    )},
    { header: "Contact Details", accessor: "mobile_number", render: (val, row) => (
      <div className="flex flex-col text-[11px]">
        <span className="font-bold text-slate-700">{val}</span>
        <span className="text-slate-400 font-semibold">{row.email}</span>
      </div>
    )},
    { header: "Country", accessor: "assigned_country_name", render: (val) => (
      <span className={`font-bold flex items-center gap-1 ${val === 'Not Assigned' ? 'text-slate-400' : 'text-slate-800'}`}>
        <Globe className="w-3.5 h-3.5 text-slate-400" />
        {val || 'Not Assigned'}
      </span>
    ) },
    { header: "States", accessor: "total_states", render: (val) => <span className="font-bold text-slate-700">{formatCount(val, ' States')}</span> },
    { header: "Monthly Sales", accessor: "current_month_revenue", render: (val) => <span className="font-bold text-slate-900">{formatCurrency(val)}</span> },
    { header: "Target %", accessor: "target_achievement_pct", render: (val) => (
      val === null || val === undefined ? (
        <span className="text-[11px] font-semibold text-slate-400">No target set</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
            <div className="bg-orange-500 h-full" style={{ width: `${Math.min(val, 100)}%` }}></div>
          </div>
          <span className="text-[11px] font-bold text-slate-700">{val}%</span>
        </div>
      )
    )},
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
        val === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
        val === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' :
        'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        {val}
      </span>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button 
          onClick={() => onNavigate(`detail-${val}`)} 
          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
          title="View profile logs"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onNavigate(`edit-${val}`)} 
          className="p-1 text-blue-500 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          title="Edit profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleToggleStatus(val, row.status)} 
          className={`p-1 rounded transition-colors ${
            row.status === 'Active' 
              ? 'text-amber-500 hover:text-amber-800 hover:bg-amber-50' 
              : 'text-emerald-500 hover:text-emerald-800 hover:bg-emerald-50'
          }`}
          title={row.status === 'Active' ? 'Suspend manager' : 'Activate manager'}
        >
          <ShieldAlert className="w-4 h-4" />
        </button>
        <button 
          onClick={() => handleDelete(val)} 
          className="p-1 text-rose-500 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
          title="Delete profile"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 cm-list-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Country Managers</h1>
          <p className="text-sm text-slate-500">Add new regional directors, scope country configurations, and monitor country operations.</p>
        </div>
        <button
          onClick={() => onNavigate("add")}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Country Manager</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "Total Country Managers", value: totalManagers, icon: Users, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { title: "Active Managers", value: activeManagers, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { title: "Countries Covered", value: countriesCovered, icon: Globe, color: "text-purple-600 bg-purple-50 border-purple-200" },
          { title: "Avg Sales per CM", value: avgRevenue, icon: TrendingUp, color: "text-orange-600 bg-orange-50 border-orange-200" }
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{card.title}</span>
                <h3 className="text-2xl font-bold text-slate-800 font-display">{card.value}</h3>
              </div>
              <span className={`p-2.5 rounded-lg border ${card.color}`}>
                <Icon className="w-5 h-5" />
              </span>
            </div>
          );
        })}
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap gap-4 items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, code..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-9 pr-4 py-1.5 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-white text-slate-800 placeholder-slate-400 font-medium"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="text-xs font-bold border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none cursor-pointer hover:border-slate-350"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            value={filters.country}
            onChange={(e) => setFilters({ ...filters, country: e.target.value })}
            className="text-xs font-bold border border-slate-200 rounded-lg p-2 bg-white text-slate-700 focus:outline-none cursor-pointer hover:border-slate-350"
          >
            <option value="All">Country: All</option>
            {countryOptions.map((country) => (
              <option key={country._id} value={country._id}>{country.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={fetchManagers}
          className="ml-auto p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          title="Refresh List"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
            <span>Fetching country manager registry...</span>
          </div>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={managers}
          searchPlaceholder="Filter records..."
          searchKeys={["full_name", "employee_code", "email", "mobile_number"]}
          emptyStateText="No Country Managers found matching filters"
          emptyStateAction={() => onNavigate("add")}
          emptyStateActionText="Register Country Manager"
        />
      )}
    </div>
  );
}
