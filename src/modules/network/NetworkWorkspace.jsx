import React, { useEffect, useState } from 'react';
import { Users, UserCheck, ShoppingCart, Percent, CreditCard, Link2, Plus, Filter, RotateCcw, ChevronDown, Eye } from 'lucide-react';
import { DataTable, Modal } from '../../components/Common';
import OnboardSharePanel from './OnboardSharePanel';
import OnboardingApplicationDetailModal from '../../components/OnboardingApplicationDetailModal';

const DEFAULT_COMMISSION_FILTERS = {
  month: '',
  year: '',
  from_date: '',
  to_date: '',
  country_id: '',
  state_id: '',
  city_id: '',
  category_id: '',
  commission_type: '',
  status: ''
};

const TABS = [
  { id: 'referral', label: 'My Referral Code', icon: Link2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'referrals', label: 'Referrals', icon: UserCheck },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'commissions', label: 'Commissions', icon: Percent },
  { id: 'payments', label: 'Payment History', icon: CreditCard }
];

function authFetch(path, options = {}) {
  const token = localStorage.getItem('huddo_token');
  return fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  }).then((res) => res.json());
}

export default function NetworkWorkspace({ showToast, initialTab = 'referral', hideTabBar = false }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [users, setUsers] = useState([]);
  const [userCounts, setUserCounts] = useState({ total: 0, pending: 0, approved: 0 });
  const [referrals, setReferrals] = useState([]);
  const [referralCounts, setReferralCounts] = useState({ total: 0, pending: 0, approved: 0 });
  const [orders, setOrders] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [commissionSummary, setCommissionSummary] = useState({ total: 0, count: 0 });
  const [payments, setPayments] = useState([]);
  const [userTab, setUserTab] = useState('all');
  const [referralTab, setReferralTab] = useState('all');
  const [commissionFilters, setCommissionFilters] = useState({ ...DEFAULT_COMMISSION_FILTERS });
  const [commissionFilterOptions, setCommissionFilterOptions] = useState({
    categories: [],
    countries: [],
    states: [],
    cities: [],
    commission_types: [],
    statuses: []
  });
  const [showAdvancedCommissionFilters, setShowAdvancedCommissionFilters] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ user_id: '', amount: '', payment_date: '', reference: '', notes: '' });
  const [unpaidCommissions, setUnpaidCommissions] = useState([]);
  const [selectedCommissionIds, setSelectedCommissionIds] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedReferral, setSelectedReferral] = useState(null);

  const loadUsers = () => {
    authFetch(`/network/users?tab=${userTab}`).then((res) => {
      if (res.success) {
        setUsers(res.data || []);
        setUserCounts(res.counts || { total: 0, pending: 0, approved: 0 });
      }
    });
  };

  const loadReferrals = () => {
    authFetch(`/network/referrals?tab=${referralTab}`).then((res) => {
      if (res.success) {
        setReferrals(res.data || []);
        setReferralCounts(res.counts || { total: 0, pending: 0, approved: 0 });
      }
    });
  };

  const loadOrders = () => {
    authFetch('/network/orders').then((res) => {
      if (res.success) setOrders(res.data || []);
    });
  };

  const loadCommissionFilterOptions = () => {
    authFetch('/network/commissions/filter-options').then((res) => {
      if (res.success) {
        setCommissionFilterOptions(res.data || {
          categories: [],
          countries: [],
          states: [],
          cities: [],
          commission_types: [],
          statuses: []
        });
      }
    });
  };

  const loadCommissions = () => {
    const q = new URLSearchParams();
    Object.entries(commissionFilters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        q.set(key, value);
      }
    });
    authFetch(`/network/commissions?${q.toString()}`).then((res) => {
      if (res.success) {
        setCommissions(res.data || []);
        setCommissionSummary(res.summary || { total: 0, count: 0 });
      }
    });
  };

  const resetCommissionFilters = () => {
    const cleared = { ...DEFAULT_COMMISSION_FILTERS };
    setCommissionFilters(cleared);
    setShowAdvancedCommissionFilters(false);
    const q = new URLSearchParams();
    Object.entries(cleared).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) q.set(key, value);
    });
    authFetch(`/network/commissions?${q.toString()}`).then((res) => {
      if (res.success) {
        setCommissions(res.data || []);
        setCommissionSummary(res.summary || { total: 0, count: 0 });
      }
    });
  };

  const filteredStates = commissionFilterOptions.states.filter((state) => {
    if (!commissionFilters.country_id) return true;
    const countryId = state.country?._id || state.country;
    return countryId?.toString() === commissionFilters.country_id;
  });

  const filteredCities = commissionFilterOptions.cities.filter((city) => {
    if (commissionFilters.city_id && city._id?.toString() === commissionFilters.city_id) return true;
    if (commissionFilters.state_id) {
      const stateId = city.state?._id || city.state;
      return stateId?.toString() === commissionFilters.state_id;
    }
    if (commissionFilters.country_id) {
      return filteredStates.some((state) => {
        const stateId = state._id?.toString();
        const cityStateId = city.state?._id?.toString() || city.state?.toString();
        return stateId === cityStateId;
      });
    }
    return true;
  });

  const advancedCommissionFilterCount = [
    commissionFilters.from_date,
    commissionFilters.to_date,
    commissionFilters.country_id,
    commissionFilters.state_id,
    commissionFilters.city_id,
    commissionFilters.category_id,
    commissionFilters.commission_type
  ].filter(Boolean).length;

  const commissionFilterFieldClass = 'w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-shadow';
  const commissionFilterLabelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-wide';

  const loadPayments = () => {
    authFetch('/manager-payments').then((res) => {
      if (res.success) setPayments(res.data || []);
    });
  };

  useEffect(() => {
    const cached = localStorage.getItem('huddo_user');
    try {
      if (cached) {
        const u = JSON.parse(cached);
        const role = u.role?.name || u.roleName || u.role;
        setIsAdmin(['Founder', 'Admin', 'CEO', 'FinanceManager'].includes(role));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [activeTab, userTab]);
  useEffect(() => { if (activeTab === 'referrals') loadReferrals(); }, [activeTab, referralTab]);
  useEffect(() => { if (activeTab === 'orders') loadOrders(); }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'commissions') {
      loadCommissionFilterOptions();
      loadCommissions();
    }
  }, [activeTab]);
  useEffect(() => { if (activeTab === 'payments') loadPayments(); }, [activeTab]);
  useEffect(() => {
    if (isAdmin && payoutModal) {
      fetch('/api/users').then((r) => r.json()).then((res) => {
        if (res.success) setAllUsers(res.data || []);
      });
    }
  }, [isAdmin, payoutModal]);

  useEffect(() => {
    if (!payoutForm.user_id) {
      setUnpaidCommissions([]);
      setSelectedCommissionIds([]);
      return;
    }
    const token = localStorage.getItem('huddo_token');
    fetch(`/api/commission-records?user=${payoutForm.user_id}&status=Approved&limit=500`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then((r) => r.json())
      .then((res) => {
        const rows = res.success && Array.isArray(res.data) ? res.data : [];
        setUnpaidCommissions(rows);
        setSelectedCommissionIds(rows.map((row) => row._id));
        const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
        setPayoutForm((prev) => ({
          ...prev,
          amount: total > 0 ? String(Math.round(total * 100) / 100) : prev.amount
        }));
      })
      .catch(() => {
        setUnpaidCommissions([]);
        setSelectedCommissionIds([]);
      });
  }, [payoutForm.user_id]);

  const toggleCommissionSelection = (id) => {
    setSelectedCommissionIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const total = unpaidCommissions
        .filter((row) => next.includes(row._id))
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);
      setPayoutForm((form) => ({ ...form, amount: total > 0 ? String(Math.round(total * 100) / 100) : '' }));
      return next;
    });
  };

  const openPayoutModal = () => {
    setPayoutForm({ user_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], reference: '', notes: '' });
    setUnpaidCommissions([]);
    setSelectedCommissionIds([]);
    setPayoutModal(true);
  };

  const submitPayout = async () => {
    if (!payoutForm.user_id || !payoutForm.amount || !payoutForm.payment_date) {
      showToast?.('User, amount, and payment date are required.', 'error');
      return;
    }
    const res = await authFetch('/manager-payments', {
      method: 'POST',
      body: JSON.stringify({
        ...payoutForm,
        payment_type: 'CommissionSettlement',
        commission_record_ids: selectedCommissionIds
      })
    });
    if (res.success) {
      showToast?.('Commission payment recorded and linked records marked as paid.', 'success');
      setPayoutModal(false);
      loadPayments();
      if (activeTab === 'commissions') loadCommissions();
    } else {
      showToast?.(res.message || 'Failed to record payment.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {!hideTabBar && (
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border ${
                  activeTab === tab.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {activeTab === 'referral' && (
        <div className="space-y-6">
          <OnboardSharePanel showToast={showToast} />
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Quick Reference</h2>
            <p className="text-sm text-slate-500">Share your code or link above when onboarding managers or retailers on their behalf.</p>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'pending', 'approved'].map((tab) => (
              <button key={tab} onClick={() => setUserTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${userTab === tab ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {tab === 'all' ? `All (${userCounts.total})` : tab === 'pending' ? `Pending (${userCounts.pending})` : `Approved (${userCounts.approved})`}
              </button>
            ))}
          </div>
          <DataTable
            data={users}
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Role', accessor: (r) => r.roleName || r.role?.name },
              { header: 'Territory', accessor: (r) => r.city?.name || r.state?.name || r.country?.name || '—' },
              { header: 'Email', accessor: 'email' },
              { header: 'Status', accessor: 'approval_status', render: (v) => <span className={`px-2 py-0.5 rounded text-xs font-bold ${v === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{v}</span> },
              { header: 'Referred By', accessor: (r) => r.promoted_by?.name || '—' }
            ]}
          />
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'pending', 'approved'].map((tab) => (
              <button key={tab} onClick={() => setReferralTab(tab)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${referralTab === tab ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                {tab === 'all' ? `All (${referralCounts.total})` : tab === 'pending' ? `Pending (${referralCounts.pending})` : `Approved (${referralCounts.approved})`}
              </button>
            ))}
          </div>
          <DataTable
            data={referrals}
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Role', accessor: (r) => r.roleName || r.role?.name },
              { header: 'Email', accessor: 'email' },
              { header: 'Mobile', accessor: 'mobile' },
              {
                header: 'Submitted',
                accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—')
              },
              {
                header: 'Status',
                accessor: 'approval_status',
                render: (v) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    v === 'Approved' ? 'bg-emerald-100 text-emerald-700'
                      : v === 'Rejected' ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {v}
                  </span>
                )
              },
              {
                header: 'View',
                accessor: '_id',
                render: (_, row) => (
                  <button
                    type="button"
                    onClick={() => setSelectedReferral(row)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
                    title="View application details"
                    aria-label={`View details for ${row.name}`}
                  >
                    <Eye size={16} />
                  </button>
                )
              }
            ]}
          />
        </div>
      )}

      {activeTab === 'orders' && (
        <DataTable
          data={orders}
          columns={[
            { header: 'Order', accessor: (r) => r.order_number || r._id },
            { header: 'Retailer', accessor: (r) => r.retailer?.business_name || '—' },
            { header: 'Status', accessor: 'status' },
            { header: 'Total', accessor: (r) => `₹${r.grand_total || r.subtotal || 0}` },
            {
              header: 'My Commission',
              accessor: 'my_commission',
              render: (val, row) => (
                <button className="text-indigo-600 font-bold hover:underline" onClick={() => setSelectedCommission({ order: row, rows: row.commission_details || [] })}>
                  ₹{Number(val || 0).toFixed(2)}
                </button>
              )
            }
          ]}
        />
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Commission Ledger</h2>
                  <p className="text-xs text-slate-500 mt-1">Use quick filters for everyday review, or open more filters for geography and category.</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total Earned</p>
                    <p className="text-xl font-bold text-emerald-600">₹{Number(commissionSummary.total || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Records</p>
                    <p className="text-xl font-bold text-slate-800">{commissionSummary.count || 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[140px] flex-1">
                  <label className={commissionFilterLabelClass}>Month</label>
                  <select
                    value={commissionFilters.month}
                    onChange={(e) => setCommissionFilters({ ...commissionFilters, month: e.target.value, from_date: '', to_date: '' })}
                    className={commissionFilterFieldClass}
                  >
                    <option value="">All months</option>
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28">
                  <label className={commissionFilterLabelClass}>Year</label>
                  <input
                    type="number"
                    value={commissionFilters.year}
                    onChange={(e) => setCommissionFilters({ ...commissionFilters, year: e.target.value })}
                    placeholder="All"
                    className={commissionFilterFieldClass}
                  />
                </div>
                <div className="min-w-[140px] flex-1">
                  <label className={commissionFilterLabelClass}>Status</label>
                  <select
                    value={commissionFilters.status}
                    onChange={(e) => setCommissionFilters({ ...commissionFilters, status: e.target.value })}
                    className={commissionFilterFieldClass}
                  >
                    <option value="">All statuses</option>
                    {(commissionFilterOptions.statuses || []).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCommissionFilters((open) => !open)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-bold transition-all duration-200 ${
                      showAdvancedCommissionFilters
                        ? 'border-orange-300 bg-orange-50 text-orange-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Filter size={14} />
                    More Filters
                    {advancedCommissionFilterCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] leading-none">
                        {advancedCommissionFilterCount}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-300 ${showAdvancedCommissionFilters ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={resetCommissionFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={loadCommissions}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`grid transition-all duration-300 ease-in-out ${
                showAdvancedCommissionFilters ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/80">
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    <div>
                      <label className={commissionFilterLabelClass}>From Date</label>
                      <input
                        type="date"
                        value={commissionFilters.from_date}
                        onChange={(e) => setCommissionFilters({ ...commissionFilters, from_date: e.target.value, month: '' })}
                        className={commissionFilterFieldClass}
                      />
                    </div>
                    <div>
                      <label className={commissionFilterLabelClass}>To Date</label>
                      <input
                        type="date"
                        value={commissionFilters.to_date}
                        onChange={(e) => setCommissionFilters({ ...commissionFilters, to_date: e.target.value, month: '' })}
                        className={commissionFilterFieldClass}
                      />
                    </div>
                    <div>
                      <label className={commissionFilterLabelClass}>Product Category</label>
                      <select
                        value={commissionFilters.category_id}
                        onChange={(e) => setCommissionFilters({ ...commissionFilters, category_id: e.target.value })}
                        className={commissionFilterFieldClass}
                      >
                        <option value="">All categories</option>
                        {commissionFilterOptions.categories.map((c) => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={commissionFilterLabelClass}>Commission Type</label>
                      <select
                        value={commissionFilters.commission_type}
                        onChange={(e) => setCommissionFilters({ ...commissionFilters, commission_type: e.target.value })}
                        className={commissionFilterFieldClass}
                      >
                        <option value="">All types</option>
                        {(commissionFilterOptions.commission_types || []).map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {commissionFilterOptions.countries.length > 0 && (
                      <div>
                        <label className={commissionFilterLabelClass}>Country</label>
                        <select
                          value={commissionFilters.country_id}
                          onChange={(e) => setCommissionFilters({
                            ...commissionFilters,
                            country_id: e.target.value,
                            state_id: '',
                            city_id: ''
                          })}
                          className={commissionFilterFieldClass}
                        >
                          <option value="">All countries</option>
                          {commissionFilterOptions.countries.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {filteredStates.length > 0 && (
                      <div>
                        <label className={commissionFilterLabelClass}>State</label>
                        <select
                          value={commissionFilters.state_id}
                          onChange={(e) => setCommissionFilters({
                            ...commissionFilters,
                            state_id: e.target.value,
                            city_id: ''
                          })}
                          className={commissionFilterFieldClass}
                        >
                          <option value="">All states</option>
                          {filteredStates.map((s) => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {filteredCities.length > 0 && (
                      <div>
                        <label className={commissionFilterLabelClass}>City</label>
                        <select
                          value={commissionFilters.city_id}
                          onChange={(e) => setCommissionFilters({ ...commissionFilters, city_id: e.target.value })}
                          className={commissionFilterFieldClass}
                        >
                          <option value="">All cities</option>
                          {filteredCities.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}{c.state?.name ? ` (${c.state.name})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DataTable
            data={commissions}
            searchKeys={['description', 'commission_type', 'status']}
            searchPlaceholder="Search commission records..."
            columns={[
              { header: 'Date', accessor: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—' },
              { header: 'Order', accessor: (r) => r.order?.order_number || '—' },
              { header: 'Retailer', accessor: (r) => r.retailer?.business_name || '—' },
              { header: 'City', accessor: (r) => r.retailer?.city?.name || '—' },
              { header: 'Type', accessor: 'commission_type' },
              { header: 'Category', accessor: (r) => r.product_category?.name || '—' },
              { header: 'Rate', accessor: (r) => `${Number(r.percentage || 0).toFixed(2)}%` },
              { header: 'Amount', accessor: (r) => `₹${Number(r.amount || 0).toFixed(2)}` },
              {
                header: 'Status',
                accessor: 'status',
                render: (val) => (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    val === 'Paid' ? 'bg-emerald-100 text-emerald-700'
                      : val === 'Approved' ? 'bg-blue-100 text-blue-700'
                        : val === 'Pending' ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                  }`}>
                    {val}
                  </span>
                )
              },
              { header: 'Description', accessor: 'description', render: (v) => <span className="text-xs text-slate-600">{v}</span> }
            ]}
            emptyStateText="No commission records match your filters."
          />
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <button onClick={openPayoutModal} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold">
                <Plus size={16} /> Record Commission Payment
              </button>
            </div>
          )}
          <DataTable
          data={payments}
          columns={[
            { header: 'Date', accessor: (r) => r.payment_date ? new Date(r.payment_date).toLocaleDateString() : '—' },
            { header: 'Amount', accessor: (r) => `₹${Number(r.amount || 0).toFixed(2)}` },
            { header: 'Type', accessor: 'payment_type' },
            { header: 'Reference', accessor: 'reference' },
            { header: 'Notes', accessor: 'notes' }
          ]}
        />
        </div>
      )}

      <Modal isOpen={payoutModal} onClose={() => setPayoutModal(false)} title="Record Commission Payment">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-700">User</label>
            <select value={payoutForm.user_id} onChange={(e) => setPayoutForm({ ...payoutForm, user_id: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Select user</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.user_code || u.roleName})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
            <input type="number" value={payoutForm.amount} onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Payment Date</label>
            <input type="date" value={payoutForm.payment_date} onChange={(e) => setPayoutForm({ ...payoutForm, payment_date: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Reference</label>
            <input value={payoutForm.reference} onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700">Notes</label>
            <textarea value={payoutForm.notes} onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} />
          </div>
          {payoutForm.user_id && (
            <div>
              <label className="text-sm font-semibold text-slate-700">Unpaid Commission Records</label>
              <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {unpaidCommissions.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400">No approved (unpaid) commission records for this user.</p>
                ) : (
                  unpaidCommissions.map((row) => (
                    <label key={row._id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCommissionIds.includes(row._id)}
                        onChange={() => toggleCommissionSelection(row._id)}
                        className="rounded border-slate-300 text-orange-500 focus:ring-orange-200"
                      />
                      <span className="flex-1 text-slate-700 truncate">{row.description || row.commission_type}</span>
                      <span className="font-bold text-slate-900 shrink-0">₹{Number(row.amount || 0).toFixed(2)}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedCommissionIds.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{selectedCommissionIds.length} record(s) will be marked Paid.</p>
              )}
            </div>
          )}
          <button onClick={submitPayout} className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-lg">Save Payment</button>
        </div>
      </Modal>

      <OnboardingApplicationDetailModal
        isOpen={!!selectedReferral}
        onClose={() => setSelectedReferral(null)}
        application={selectedReferral}
        title="Referral Application Details"
      />

      <Modal isOpen={!!selectedCommission} onClose={() => setSelectedCommission(null)} title="Commission Breakdown">
        {selectedCommission && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Order: <strong>{selectedCommission.order?.order_number}</strong></p>
            {(selectedCommission.rows || []).map((row, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="font-semibold text-slate-800">{row.commission_type} — ₹{Number(row.amount || 0).toFixed(2)}</p>
                <p className="text-slate-600 mt-1">{row.description}</p>
                <p className="text-xs text-slate-400 mt-1">{row.percentage}% on franchise points base</p>
              </div>
            ))}
            {(!selectedCommission.rows || selectedCommission.rows.length === 0) && (
              <p className="text-sm text-slate-500">No commission records for this order yet.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
