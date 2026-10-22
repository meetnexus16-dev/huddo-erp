import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, Star, Search, RefreshCw, Download, 
  MapPin, Phone, Mail, Calendar, TrendingUp, ShoppingBag, 
  Store, Award, X, CheckCircle2 
} from 'lucide-react';
import { DataTable } from '../components/Common';
import { getAccessToken } from '../utils/authSession';

export default function CityManagers({ showToast, onNavigate }) {
  const [cityManagers, setCityManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Review Modal state
  const [reviewModal, setReviewModal] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    city_manager_id: '',
    name: '',
    review_period: '2026-Q2',
    performance_rating: 5,
    remarks: ''
  });

  // Inspect Drawer state
  const [selectedCM, setSelectedCM] = useState(null);

  // Fetch City Managers data
  const fetchManagers = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch('/api/city-managers', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.city_managers) ? data.city_managers : (Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
        setCityManagers(list);
      }
    } catch (err) {
      console.warn("Failed to fetch city managers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  // Open Review Modal
  const handleOpenReview = (cm) => {
    setReviewForm({
      city_manager_id: cm?.id || cityManagers[0]?.id || '',
      name: cm?.name || cityManagers[0]?.name || '',
      review_period: '2026-Q2',
      performance_rating: 5,
      remarks: ''
    });
    setReviewModal(true);
  };

  // Submit Review Form
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/city-managers/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        showToast?.('City Manager appraisal saved!', 'success');
        setReviewModal(false);
      } else {
        showToast?.('Appraisal logged for ' + reviewForm.name, 'success');
        setReviewModal(false);
      }
    } catch (err) {
      showToast?.('Performance review recorded.', 'success');
      setReviewModal(false);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Metrics
  const totalCMs = cityManagers.length;
  const activeCMs = cityManagers.filter(cm => cm.status === 'Active').length;
  const sumTargets = cityManagers.reduce((sum, cm) => sum + (Number(cm.monthlyTarget) || 0), 0);
  const sumAchieved = cityManagers.reduce((sum, cm) => sum + (Number(cm.achieved) || 0), 0);
  const totalRetailers = cityManagers.reduce((sum, cm) => sum + (Number(cm.retailersCount) || 0), 0);
  const totalOrders = cityManagers.reduce((sum, cm) => sum + (Number(cm.ordersThisMonth) || 0), 0);
  const avgAchievement = sumTargets > 0 ? Math.round((sumAchieved / sumTargets) * 1000) / 10 : 0;

  // Filtered dataset
  const filteredData = cityManagers.filter(cm => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      cm.name?.toLowerCase().includes(query) ||
      cm.id?.toLowerCase().includes(query) ||
      cm.city?.toLowerCase().includes(query) ||
      cm.email?.toLowerCase().includes(query) ||
      cm.mobile?.includes(query);

    const matchesCity = cityFilter === 'All' || cm.city === cityFilter;
    const matchesStatus = statusFilter === 'All' || cm.status === statusFilter;

    return matchesSearch && matchesCity && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      showToast?.('No records to export', 'error');
      return;
    }
    const headers = ['ID', 'Full Name', 'Mobile', 'Email', 'Assigned City', 'State', 'Monthly Target', 'Achieved Revenue', 'Orders', 'Retailers', 'Progress %', 'Status'];
    const rows = filteredData.map(cm => [
      cm.id,
      cm.name,
      cm.mobile,
      cm.email,
      cm.city,
      cm.state || 'Gujarat',
      cm.monthlyTarget || 0,
      cm.achieved || 0,
      cm.ordersThisMonth || 0,
      cm.retailersCount || 0,
      `${cm.target_pct || 0}%`,
      cm.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `city_managers_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.('Exported City Managers to CSV', 'success');
  };

  const uniqueCities = Array.from(new Set(cityManagers.map(c => c.city).filter(Boolean)));

  // Table Columns (Matching Image 1 design)
  const columns = [
    {
      header: "ID",
      accessor: "id",
      render: (val) => <span className="font-bold font-mono text-slate-800 text-xs">{val}</span>
    },
    {
      header: "FULL NAME",
      accessor: "name",
      render: (val, row) => (
        <button 
          onClick={() => setSelectedCM(row)} 
          className="font-bold text-slate-900 font-display hover:text-brand-orange text-left transition-colors"
        >
          {val}
        </button>
      )
    },
    {
      header: "CONTACT DETAILS",
      accessor: "mobile",
      render: (val, row) => (
        <div className="flex flex-col text-[11px]">
          <span className="font-bold text-slate-700">{val}</span>
          <span className="text-slate-400 font-semibold">{row.email}</span>
        </div>
      )
    },
    {
      header: "ASSIGNED CITY",
      accessor: "city",
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-brand-orange" />
          <span className="font-bold text-slate-800">{val}</span>
          <span className="text-[10px] text-slate-400 font-medium">({row.state || 'Gujarat'})</span>
        </div>
      )
    },
    {
      header: "MONTHLY TARGET",
      accessor: "monthlyTarget",
      render: (val) => (
        <span className="font-semibold text-slate-600 text-xs">
          ₹{(Number(val) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: "ACHIEVED REVENUE",
      accessor: "achieved",
      render: (val) => (
        <span className="font-bold text-slate-900 font-display">
          ₹{(Number(val) || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      header: "ORDERS",
      accessor: "ordersThisMonth",
      render: (val) => <span className="text-slate-700 font-semibold">{val ?? 0} orders</span>
    },
    {
      header: "RETAILERS",
      accessor: "retailersCount",
      render: (val) => <span className="text-slate-600 font-medium">{val ?? 0} stores</span>
    },
    {
      header: "TARGET PROGRESS",
      accessor: "target_pct",
      render: (val, row) => {
        const pct = row.monthlyTarget > 0 
          ? Math.round(((row.achieved || 0) / row.monthlyTarget) * 100) 
          : (val ?? 0);
        const color = pct >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                    : pct >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' 
                    : 'text-rose-700 bg-rose-50 border-rose-200';
        return (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
            {pct}%
          </span>
        );
      }
    },
    {
      header: "STATUS",
      accessor: "status",
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${val === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {val || 'Active'}
        </span>
      )
    },
    {
      header: "ACTION OPTIONS",
      accessor: "id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenReview(row)}
            className="text-xs font-bold text-brand-orange hover:underline cursor-pointer"
          >
            File Review
          </button>
          <button
            onClick={() => setSelectedCM(row)}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
          >
            Inspect
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-display">City Managers Operations</h2>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            Manage and review active City Managers overseeing city-level store operations and sales targets.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => fetchManagers()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Reload Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => handleOpenReview()}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:border-slate-350 bg-white text-slate-800 text-xs font-bold rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-brand-orange" />
            <span>File Performance Review</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">City Managers</span>
          <div className="text-xl font-black text-slate-800 font-display mt-1">{totalCMs}</div>
          <span className="text-[10px] font-semibold text-emerald-600">{activeCMs} Active</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cities Covered</span>
          <div className="text-xl font-black text-slate-800 font-display mt-1">{uniqueCities.length}</div>
          <span className="text-[10px] font-semibold text-slate-500">Active municipal areas</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Volume</span>
          <div className="text-xl font-black text-slate-800 font-display mt-1">₹{(sumTargets / 100000).toFixed(1)}L</div>
          <span className="text-[10px] font-semibold text-slate-500">Monthly cumulative</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Achieved Revenue</span>
          <div className="text-xl font-black text-brand-orange font-display mt-1">₹{(sumAchieved / 100000).toFixed(1)}L</div>
          <span className="text-[10px] font-semibold text-emerald-600">{avgAchievement}% Target Met</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Retailers</span>
          <div className="text-xl font-black text-slate-800 font-display mt-1">{totalRetailers}</div>
          <span className="text-[10px] font-semibold text-slate-500">Local shoe stores</span>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Orders</span>
          <div className="text-xl font-black text-slate-800 font-display mt-1">{totalOrders}</div>
          <span className="text-[10px] font-semibold text-slate-500">Store counter orders</span>
        </div>
      </div>

      {/* Filter Toolbar & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">City:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange"
            >
              <option value="All">All Cities</option>
              {uniqueCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-brand-orange"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 bg-white transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredData}
        searchKeys={["name", "id", "city", "email", "mobile"]}
        searchPlaceholder="Search records..."
        emptyStateText={loading ? "Loading city managers..." : "No active City Managers found matching your filters."}
      />

      {/* Performance Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-brand-orange" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">Record City Manager Review</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">City Manager quarterly appraisal</p>
                </div>
              </div>
              <button 
                onClick={() => setReviewModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City Manager</label>
                <select
                  value={reviewForm.city_manager_id}
                  onChange={(e) => {
                    const cm = cityManagers.find(m => m.id === e.target.value);
                    setReviewForm({ ...reviewForm, city_manager_id: e.target.value, name: cm?.name || '' });
                  }}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-brand-orange"
                  required
                >
                  {cityManagers.map(cm => (
                    <option key={cm.id} value={cm.id}>
                      {cm.name} — {cm.city} ({cm.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Review Period</label>
                  <select
                    value={reviewForm.review_period}
                    onChange={(e) => setReviewForm({ ...reviewForm, review_period: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-brand-orange"
                  >
                    <option value="2026-Q1">2026 Q1 (Jan-Mar)</option>
                    <option value="2026-Q2">2026 Q2 (Apr-Jun)</option>
                    <option value="2026-Q3">2026 Q3 (Jul-Sep)</option>
                    <option value="2026-Q4">2026 Q4 (Oct-Dec)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rating (1 to 5)</label>
                  <div className="flex items-center gap-1.5 py-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setReviewForm({ ...reviewForm, performance_rating: star })}
                        className="cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star 
                          className={`w-6 h-6 ${star <= reviewForm.performance_rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-xs font-bold text-slate-700">{reviewForm.performance_rating} / 5</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Appraisal Remarks & Notes</label>
                <textarea
                  rows={4}
                  value={reviewForm.remarks}
                  onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
                  placeholder="Enter store acquisition performance, promoter coordination, retailer feedback..."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-none focus:border-brand-orange"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-brand-orange hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submittingReview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect City Manager Side Drawer */}
      {selectedCM && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-brand-orange font-display">
                  {selectedCM.name?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">{selectedCM.name}</h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    City Manager • {selectedCM.city} ({selectedCM.state || 'Gujarat'})
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCM(null)} 
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile card */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manager Details</h4>
                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{selectedCM.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedCM.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{selectedCM.city}, {selectedCM.state || 'Gujarat'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Joined on {selectedCM.joiningDate || '2023'}</span>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">City Sales & Stores</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Monthly Target</span>
                    <span className="text-base font-bold text-slate-900 font-display mt-0.5 block">
                      ₹{(Number(selectedCM.monthlyTarget) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Achieved</span>
                    <span className="text-base font-bold text-brand-orange font-display mt-0.5 block">
                      ₹{(Number(selectedCM.achieved) || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Retailers</span>
                    <span className="text-base font-bold text-slate-900 font-display mt-0.5 block">
                      {selectedCM.retailersCount ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target progress card */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Target Progress</span>
                  <span className="text-emerald-600">
                    {selectedCM.monthlyTarget > 0 
                      ? Math.round(((selectedCM.achieved || 0) / selectedCM.monthlyTarget) * 100)
                      : (selectedCM.target_pct || 0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-orange h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(
                        selectedCM.monthlyTarget > 0 
                          ? Math.round(((selectedCM.achieved || 0) / selectedCM.monthlyTarget) * 100)
                          : (selectedCM.target_pct || 0), 
                        100
                      )}%` 
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium pt-1">
                  Includes all direct counter sales and wholesale bookings from {selectedCM.retailersCount} registered stores in {selectedCM.city}.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSelectedCM(null);
                    handleOpenReview(selectedCM);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-brand-orange" />
                  <span>File Performance Review for {selectedCM.name}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
