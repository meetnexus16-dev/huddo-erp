// CM-MODULE: Frontend component for Country Manager Detailed profile workspace
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit2, Globe, Shield, RefreshCw, Layers, CheckSquare, 
  Target, Percent, Users, BarChart3, Bell, MapPin, UserCheck, Plus, CheckCircle, XCircle
} from 'lucide-react';
import CountryManagerDashboard from './CountryManagerDashboard';
import AnalyticsDeepDive from './AnalyticsDeepDive';
import { DataTable, Modal, DefaultPasswordNotice } from '../../../components/Common';
import { getUserCreatedMessage } from '../../../constants/defaultCredentials';

export default function CountryManagerDetail({ cmId, onNavigate, showToast, userRole = 'Founder', initialTab }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab || 'Overview');

  // CM-MODULE: Sync tab selection when sidebar changes tabs
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Modal States
  const [assignStateModal, setAssignStateModal] = useState(false);
  const [newTargetModal, setNewTargetModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState(false);
  const [commissionCalcModal, setCommissionCalcModal] = useState(false);

  // Form selections
  const [selectedState, setSelectedState] = useState('');
  const [selectedStateManager, setSelectedStateManager] = useState('');
  const [reviewForm, setReviewForm] = useState({ state_manager_id: '', review_period: '2026-Q2', performance_rating: 5, remarks: '' });
  const [targetForm, setTargetForm] = useState({ target_type: 'Monthly', target_period: '2026-07', revenue_target: 10000000, order_count_target: 100, retailer_target: 10, new_cities_target: 5 });
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalAction, setApprovalAction] = useState('Approved');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [commissionForm, setCommissionForm] = useState({ period_type: 'Monthly', period_label: '2026-06', commission_percentage: 1.5 });

  // Tab Data States
  const [states, setStates] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [targets, setTargets] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [stateManagers, setStateManagers] = useState([]);
  const [stateManagerCandidates, setStateManagerCandidates] = useState([]);
  const [loadingStateManagerCandidates, setLoadingStateManagerCandidates] = useState(false);
  const [assignStateMode, setAssignStateMode] = useState('select');
  const [newStateManagerUser, setNewStateManagerUser] = useState({ name: '', email: '', mobile: '' });
  const [assignStateLoading, setAssignStateLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState({ type: 'sales', data: null, generating: false });

  // Fetch basic profile
  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/profile`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Country Manager profile not found", "error");
        setProfile(null);
      }
    } catch (err) {
      showToast("Failed to fetch profile info", "error");
      setProfile(null);
    }
  };

  const loadTabData = async () => {
    if (!profile) return;
    try {
      // Fetch States
      const resStates = await fetch(`/api/country-managers/${cmId}/states`);
      if (resStates.ok) {
        const data = await resStates.json();
        setStates(data.assigned_states || []);
      }

      // Fetch Approvals
      const resApps = await fetch(`/api/country-managers/${cmId}/approvals`);
      if (resApps.ok) {
        const data = await resApps.json();
        setApprovals(data || []);
      }

      // Fetch Targets
      const resTargets = await fetch(`/api/country-managers/${cmId}/targets`);
      if (resTargets.ok) {
        const data = await resTargets.json();
        setTargets(data.targets || []);
      }

      // Fetch Commissions
      const resComms = await fetch(`/api/country-managers/${cmId}/commissions`);
      if (resComms.ok) {
        const data = await resComms.json();
        setCommissions(data.commissions || []);
      }

      // Fetch State Managers
      const resSMs = await fetch(`/api/country-managers/${cmId}/state-managers`);
      if (resSMs.ok) {
        const data = await resSMs.json();
        setStateManagers(data.state_managers || []);
      }

      // Fetch Notifications
      const resNotifs = await fetch(`/api/country-managers/${cmId}/notifications`);
      if (resNotifs.ok) {
        const data = await resNotifs.json();
        setNotifications(data.notifications || []);
      }

    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, [cmId]);

  useEffect(() => {
    loadTabData();
  }, [profile, activeTab]);

  const fetchStateManagerCandidates = async (stateId) => {
    if (!stateId) {
      setStateManagerCandidates([]);
      return;
    }
    setLoadingStateManagerCandidates(true);
    try {
      const res = await fetch(`/api/country-managers/${cmId}/state-manager-candidates?state_id=${stateId}`);
      if (res.ok) {
        const data = await res.json();
        setStateManagerCandidates(data.candidates || []);
      } else {
        setStateManagerCandidates([]);
      }
    } catch (err) {
      setStateManagerCandidates([]);
    } finally {
      setLoadingStateManagerCandidates(false);
    }
  };

  useEffect(() => {
    if (assignStateModal && selectedState) {
      fetchStateManagerCandidates(selectedState);
    }
  }, [assignStateModal, selectedState, cmId]);

  const openAssignStateModal = (stateId) => {
    if (!states.length) {
      showToast('No states assigned to this country yet.', 'error');
      return;
    }
    const targetState = states.find((s) => s.state_id === stateId) || states[0];
    setSelectedState(targetState.state_id);
    setSelectedStateManager(targetState.state_manager?.id || '');
    setAssignStateMode('select');
    setNewStateManagerUser({ name: '', email: '', mobile: '' });
    setAssignStateModal(true);
  };

  const closeAssignStateModal = () => {
    setAssignStateModal(false);
    setAssignStateMode('select');
    setNewStateManagerUser({ name: '', email: '', mobile: '' });
  };

  // Actions
  const handleAssignManager = async () => {
    if (!selectedState) {
      showToast('Please select a state.', 'error');
      return;
    }

    setAssignStateLoading(true);
    try {
      let managerId = selectedStateManager;

      if (assignStateMode === 'create') {
        if (!newStateManagerUser.name?.trim() || !newStateManagerUser.email?.trim() || !newStateManagerUser.mobile?.trim()) {
          showToast('Please fill in name, email, and mobile to create a new state manager.', 'error');
          return;
        }

        const createRes = await fetch(`/api/country-managers/${cmId}/state-manager-users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStateManagerUser)
        });
        const createData = await createRes.json().catch(() => ({}));
        if (!createRes.ok || !createData.success) {
          showToast(createData.message || 'Failed to create state manager.', 'error');
          return;
        }
        managerId = createData.data._id;
      } else if (!selectedStateManager) {
        showToast('Please select a state manager or choose Unassign.', 'error');
        return;
      }

      const res = await fetch(`/api/country-managers/${cmId}/states/assign-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state_id: selectedState, state_manager_id: managerId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(data.message || getUserCreatedMessage('State manager assigned successfully'), 'success');
        closeAssignStateModal();
        loadTabData();
      } else {
        showToast(data.message || 'Assignment failed', 'error');
      }
    } catch (err) {
      showToast('Assignment failed', 'error');
    } finally {
      setAssignStateLoading(false);
    }
  };

  const handleSetTarget = async () => {
    // Basic client side validation
    if (!targetForm.target_period || targetForm.target_period.trim() === '') {
      showToast("Please enter a valid period label.", "error");
      return;
    }
    if (targetForm.revenue_target === undefined || isNaN(targetForm.revenue_target) || Number(targetForm.revenue_target) < 0) {
      showToast("Revenue target must be a non-negative number.", "error");
      return;
    }
    if (targetForm.order_count_target === undefined || isNaN(targetForm.order_count_target) || Number(targetForm.order_count_target) < 0) {
      showToast("Order count target must be a non-negative number.", "error");
      return;
    }
    if (targetForm.retailer_target === undefined || isNaN(targetForm.retailer_target) || Number(targetForm.retailer_target) < 0) {
      showToast("Retailer target must be a non-negative number.", "error");
      return;
    }
    if (targetForm.new_cities_target === undefined || isNaN(targetForm.new_cities_target) || Number(targetForm.new_cities_target) < 0) {
      showToast("New cities target must be a non-negative number.", "error");
      return;
    }

    try {
      const res = await fetch(`/api/country-managers/${cmId}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetForm)
      });
      if (res.ok) {
        showToast("Target configured successfully", "success");
        setNewTargetModal(false);
        loadTabData();
      } else {
        const errorData = await res.json().catch(() => ({}));
        showToast(errorData.message || "Target creation failed", "error");
      }
    } catch (err) {
      showToast("Target creation failed", "error");
    }
  };

  const handleCreateReview = async () => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/state-managers/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm)
      });
      if (res.ok) {
        showToast("Performance review filed successfully", "success");
        setReviewModal(false);
        loadTabData();
      }
    } catch (err) {
      showToast("Failed to file review", "error");
    }
  };

  const handleApprovalActionSubmit = async () => {
    if (!selectedApproval) return;
    try {
      const res = await fetch(`/api/country-managers/${cmId}/approvals/${selectedApproval.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: approvalAction, remarks: approvalRemarks })
      });
      if (res.ok) {
        showToast(`Approval request ${approvalAction.toLowerCase()} successfully`, "success");
        setApprovalModal(false);
        loadTabData();
        fetchProfile(); // refresh stats
      }
    } catch (err) {
      showToast("Approval action failed", "error");
    }
  };

  const handleCalculateCommission = async () => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/commissions/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commissionForm)
      });
      if (res.ok) {
        showToast("Commission incentive calculated successfully", "success");
        setCommissionCalcModal(false);
        loadTabData();
      }
    } catch (err) {
      showToast("Calculation failed", "error");
    }
  };

  const handleApproveCommission = async (commId) => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/commissions/${commId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Approved', remarks: "Audited and cleared by Admin" })
      });
      if (res.ok) {
        showToast("Commission slab approved", "success");
        loadTabData();
      }
    } catch (err) {
      showToast("Approval failed", "error");
    }
  };

  const handleMarkCommissionPaid = async (commId) => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/commissions/${commId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_reference: `TXN-CM-${Date.now()}` })
      });
      if (res.ok) {
        showToast("Commission marked as paid", "success");
        loadTabData();
      }
    } catch (err) {
      showToast("Operation failed", "error");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      const res = await fetch(`/api/country-managers/${cmId}/notifications/read-all`, {
        method: 'PATCH'
      });
      if (res.ok) {
        showToast("All notifications marked as read", "success");
        loadTabData();
      }
    } catch (err) {
      showToast("Failed to clear notifications", "error");
    }
  };

  const generateReport = async (type) => {
    setReports(prev => ({ ...prev, generating: true }));
    try {
      const res = await fetch(`/api/country-managers/${cmId}/reports/${type}`);
      if (res.ok) {
        const data = await res.json();
        setReports({ type, data, generating: false });
        showToast(`${type.toUpperCase()} report generated successfully.`, "success");
      }
    } catch (err) {
      showToast("Failed to compile report", "error");
      setReports(prev => ({ ...prev, generating: false }));
    }
  };

  const handleExportCMReport = (format) => {
    let filename = `country_manager_${reports.type}_report_${Date.now()}.${format.toLowerCase()}`;
    let csvContent = "Filter,Value\n" + 
      `"Country Scope","India (Country ID: 1)"\n` + 
      `"Timestamp Generated","${new Date().toLocaleString()}"\n` +
      `"Report Type","${reports.type.toUpperCase()}"\n`;
      
    if (reports.data && Array.isArray(reports.data)) {
      csvContent += "\nData Details:\n" + JSON.stringify(reports.data);
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported data as ${format.toUpperCase()}.`, "success");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
          <span>Retrieving detailed profile nodes...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8 bg-white border border-slate-200 rounded-xl">
        <p className="text-slate-500 font-bold">Country Manager Profile Not Found.</p>
      </div>
    );
  }

  // Quick stats computed
  const totalStates = states.length;
  const pendingApprovalsCount = approvals.filter(a => a.action === 'Pending').length;
  const activeRetailers = states.reduce((sum, state) => sum + (state.total_retailers || 0), 0);
  const monthRevenue = states.reduce((sum, state) => sum + (state.monthly_revenue || 0), 0);
  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

  const TABS_LIST = [
    { id: 'Overview', label: 'Overview', icon: Globe },
    { id: 'States', label: 'States Management', icon: Layers },
    { id: 'Approvals', label: 'Approvals Queue', icon: CheckSquare, badge: pendingApprovalsCount },
    { id: 'Targets', label: 'Targets & KPIs', icon: Target },
    { id: 'Commissions', label: 'Commissions', icon: Percent },
    { id: 'State Managers', label: 'State Managers', icon: Users },
    { id: 'Notifications', label: 'Notifications', icon: Bell, badge: notifications.filter(n => !n.is_read).length }
  ];

  const getProfileImage = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150";
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="space-y-6 cm-detail-page">
      {/* Header Back Button & Profile Info (Only on Overview) */}
      {activeTab === 'Overview' && (
        <div className="flex items-center gap-4">
          {userRole !== 'Country Manager' && (
            <button
              onClick={() => onNavigate("list")}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-3.5 flex-1">
            <img 
              src={getProfileImage(profile.profile_photo_url)} 
              alt="" 
              className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 shadow-xs shrink-0" 
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 font-display">{profile.full_name}</h1>
                <span className="px-2.5 py-0.5 bg-brand-orange/10 border border-brand-orange/20 rounded-full text-xs font-bold text-brand-orange">
                  {profile.employee_code}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  profile.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {profile.status}
                </span>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned Country: <b>{profile.assigned_country_name}</b></span>
              </p>
            </div>
          </div>

          {userRole !== 'Country Manager' && (
            <button
              onClick={() => onNavigate(`edit-${cmId}`)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-sm font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      )}

      {/* Minimal Header on other pages for Admin/Founder role */}
      {activeTab !== 'Overview' && userRole !== 'Country Manager' && (
        <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <button
            onClick={() => onNavigate("list")}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-display">
              {profile.full_name} <span className="text-slate-400 font-normal">| {TABS_LIST.find(t => t.id === activeTab)?.label || activeTab}</span>
            </h1>
          </div>
        </div>
      )}

      {/* Quick Summary Strip (Only on Overview) */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-center border-r border-slate-100 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">States Managed</span>
            <span className="text-lg font-bold text-slate-800 font-display mt-0.5 block">{totalStates} States</span>
          </div>
          <div className="text-center border-r border-slate-100 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Retailers</span>
            <span className="text-lg font-bold text-slate-800 font-display mt-0.5 block">{activeRetailers > 0 ? `${activeRetailers} Shopfronts` : '—'}</span>
          </div>
          <div className="text-center border-r border-slate-100 last:border-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Approvals</span>
            <span className="text-lg font-bold text-slate-800 font-display mt-0.5 block">{pendingApprovalsCount} Requests</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">This Month Revenue</span>
            <span className="text-lg font-bold text-slate-800 font-display mt-0.5 block">{monthRevenue > 0 ? formatCurrency(monthRevenue) : '—'}</span>
          </div>
        </div>
      )}

      {/* Tabs Menu (Only for Founder/Admin/etc role, not for the Country Manager themselves) */}
      {userRole !== 'Country Manager' && (
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {TABS_LIST.map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  isActive 
                    ? 'border-brand-orange text-brand-orange bg-orange-50/10' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.badge > 0 && (
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${
                    isActive ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Tab Contents */}
      <div className="cm-tab-content">
        
        {/* TAB 1: Overview */}
        {activeTab === 'Overview' && (
          <CountryManagerDashboard cmId={cmId} isTab={true} onNavigate={setActiveTab} showToast={showToast} />
        )}

        {/* TAB 2: States Management */}
        {activeTab === 'States' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">Assigned States Matrix</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Map showing state nodes and state managers allocated to this country.</p>
              </div>
              <button
                onClick={() => openAssignStateModal(states[0]?.state_id)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-brand-orange" />
                <span>Reassign State Manager</span>
              </button>
            </div>

            <DataTable
              columns={[
                { header: "State ID", accessor: "state_id", render: (val) => <span className="font-bold font-mono">{val}</span> },
                { header: "State Name", accessor: "state_name", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
                { header: "State Manager", accessor: "state_manager", render: (val) => (
                  <span className="font-semibold text-slate-700">{val.name || 'Unassigned'}</span>
                )},
                { header: "Contact", accessor: "state_manager", render: (val) => <span className="text-xs font-mono">{val.mobile || '-'}</span> },
                { header: "Covered Cities", accessor: "total_cities" },
                { header: "Retailers", accessor: "total_retailers" },
                { header: "Revenue", accessor: "monthly_revenue", render: (val) => <span className="font-bold">₹{val.toLocaleString('en-IN')}</span> },
                { header: "Target Achievement", accessor: "monthly_revenue", render: (val) => {
                  const pct = Math.round(val / 5000000 * 100);
                  const color = pct >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-250' : pct >= 50 ? 'text-amber-600 bg-amber-50 border-amber-250' : 'text-rose-600 bg-rose-50 border-rose-250';
                  return <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${color}`}>{pct}%</span>;
                }},
                { header: "Actions", accessor: "state_id", sortable: false, render: (val) => (
                  <button
                    onClick={() => openAssignStateModal(val)}
                    className="text-xs font-bold text-brand-orange hover:underline cursor-pointer"
                  >
                    Reassign
                  </button>
                )}
              ]}
              data={states}
              searchKeys={["state_name"]}
              emptyStateText="No states assigned to this country manager yet."
            />
          </div>
        )}

        {/* TAB 3: Approvals */}
        {activeTab === 'Approvals' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 font-display">Approval Queue</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">CM is Level 3 in the chain. Only items showing State Approved should be processed here.</p>
            </div>

            <DataTable
              columns={[
                { header: "ID", accessor: "id", render: (val) => <span className="font-bold font-mono">#{val}</span> },
                { header: "Type", accessor: "approval_type", render: (val) => (
                  <span className={`px-2 py-0.5 border rounded text-[9px] font-bold uppercase ${
                    val === 'Retailer_Registration' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    val === 'Large_Order' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    val === 'Discount' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    val === 'Commission' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    val === 'Team_Request' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>{val}</span>
                )},
                { header: "Description / Shop Name", accessor: "reference_label", render: (val) => <span className="font-bold text-slate-700">{val}</span> },
                { header: "Submitted By", accessor: "submitted_by_role", render: (val, row) => (
                  <div className="flex flex-col text-[10px]">
                    <span className="font-bold text-slate-800">ID: {row.submitted_by}</span>
                    <span className="text-slate-400 font-bold uppercase">{val}</span>
                  </div>
                )},
                { header: "Priority", accessor: "priority", render: (val) => (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    val === 'Urgent' || val === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>{val}</span>
                )},
                { header: "Date", accessor: "submitted_at", render: (val) => <span className="text-xs text-slate-400 font-semibold">{new Date(val).toLocaleDateString()}</span> },
                { header: "Action Result", accessor: "action", render: (val) => (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    val === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                    val === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>{val}</span>
                )},
                { header: "Validate & Approve", accessor: "id", sortable: false, render: (val, row) => (
                  row.action === 'Pending' && (
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => { setSelectedApproval(row); setApprovalAction('Approved'); setApprovalRemarks(''); setApprovalModal(true); }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button 
                        onClick={() => { setSelectedApproval(row); setApprovalAction('Rejected'); setApprovalRemarks(''); setApprovalModal(true); }}
                        className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )
                )}
              ]}
              data={approvals}
              searchKeys={["reference_label"]}
              emptyStateText="No pending approvals right now."
            />
          </div>
        )}

        {/* TAB 4: Targets */}
        {activeTab === 'Targets' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">Target Goals Configs</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Setup daily, weekly, monthly, quarterly or yearly KPI metrics.</p>
              </div>
              {userRole !== 'Country Manager' && (
                <button
                  onClick={() => setNewTargetModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure Target</span>
                </button>
              )}
            </div>

            <DataTable
              columns={[
                { header: "Period", accessor: "target_period", render: (val) => <span className="font-bold">{val}</span> },
                { header: "Type", accessor: "target_type" },
                { header: "Revenue Target", accessor: "revenue_target", render: (val) => <span className="font-bold">₹{val.toLocaleString('en-IN')}</span> },
                { header: "Revenue Achieved", accessor: "revenue_achieved", render: (val, row) => (
                  <span className="font-bold text-emerald-600">₹{val.toLocaleString('en-IN')} ({row.revenue_pct}%)</span>
                )},
                { header: "Orders Target", accessor: "order_count_target", render: (val, row) => <span>{row.order_count_achieved} of {val} orders</span> },
                { header: "Retailers Target", accessor: "retailer_target", render: (val, row) => <span>{row.retailer_achieved} of {val} shops</span> },
                { header: "New Cities Target", accessor: "new_cities_target", render: (val, row) => <span>{row.new_cities_achieved} of {val} cities</span> },
                { header: "Status", accessor: "status", render: (val) => (
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${
                    val === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>{val}</span>
                )}
              ]}
              data={targets}
              searchKeys={["target_period"]}
              emptyStateText="No targets configured for this country manager yet."
            />
          </div>
        )}

        {/* TAB 5: Commissions */}
        {activeTab === 'Commissions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">Incentives & Payouts</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Aggregated payouts calculated based on total country revenue.</p>
              </div>
              {userRole !== 'Country Manager' && (
                <button
                  onClick={() => setCommissionCalcModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Calculate Commission</span>
                </button>
              )}
            </div>

            <DataTable
              columns={[
                { header: "Period", accessor: "period_label", render: (val) => <span className="font-bold">{val}</span> },
                { header: "Base Revenue", accessor: "base_revenue", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> },
                { header: "Rate %", accessor: "commission_percentage", render: (val) => <span className="font-bold text-slate-800">{val}%</span> },
                { header: "Commission", accessor: "commission_amount", render: (val) => <span className="font-bold text-slate-800">₹{val.toLocaleString('en-IN')}</span> },
                { header: "Bonus Slab", accessor: "bonus_amount", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> },
                { header: "Total Payout", accessor: "total_payable", render: (val) => <span className="font-extrabold text-brand-orange">₹{val.toLocaleString('en-IN')}</span> },
                { header: "Status", accessor: "status", render: (val) => (
                  <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold ${
                    val === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    val === 'Approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                  }`}>{val}</span>
                )},
                { header: "Action Options", accessor: "id", sortable: false, render: (val, row) => (
                  userRole !== 'Country Manager' && (
                    <div className="flex gap-2 text-xs font-bold">
                      {row.status === 'Pending' && (
                        <button onClick={() => handleApproveCommission(val)} className="text-emerald-600 hover:underline cursor-pointer">Approve</button>
                      )}
                      {row.status === 'Approved' && (
                        <button onClick={() => handleMarkCommissionPaid(val)} className="text-blue-600 hover:underline cursor-pointer">Mark Paid</button>
                      )}
                    </div>
                  )
                )}
              ]}
              data={commissions}
              searchKeys={["period_label"]}
              emptyStateText="No commission records found."
            />
          </div>
        )}

        {/* TAB 6: State Managers */}
        {activeTab === 'State Managers' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">State Managers Operations</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage and review active State Managers supervising state logistics.</p>
              </div>
              <button
                onClick={() => {
                  setReviewForm({
                    state_manager_id: stateManagers[0]?.state_manager_id || '',
                    review_period: '2026-Q2',
                    performance_rating: 5,
                    remarks: ''
                  });
                  setReviewModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-brand-orange" />
                <span>File Performance Review</span>
              </button>
            </div>

            <DataTable
              columns={[
                { header: "ID", accessor: "state_manager_id", render: (val) => <span className="font-bold font-mono">{val}</span> },
                { header: "Full Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
                { header: "Contact Details", accessor: "mobile", render: (val, row) => (
                  <div className="flex flex-col text-[11px]">
                    <span className="font-bold text-slate-700">{val}</span>
                    <span className="text-slate-400 font-semibold">{row.email}</span>
                  </div>
                )},
                { header: "Assigned State", accessor: "assigned_state", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
                { header: "Monthly Revenue", accessor: "performance", render: (val) => <span className="font-bold">₹{val.revenue.toLocaleString('en-IN')}</span> },
                { header: "Orders", accessor: "performance", render: (val) => <span>{val.orders} orders</span> },
                { header: "Retailers", accessor: "performance", render: (val) => <span>{val.retailers} stores</span> },
                { header: "Target Progress", accessor: "performance", render: (val) => {
                  const color = val.target_pct >= 80 ? 'text-emerald-600 font-bold' : val.target_pct >= 50 ? 'text-amber-600 font-bold' : 'text-rose-600 font-bold';
                  return <span className={color}>{val.target_pct}%</span>;
                }},
                { header: "Action Options", accessor: "state_manager_id", sortable: false, render: (val) => (
                  <button
                    onClick={() => {
                      setReviewForm({ state_manager_id: val, review_period: '2026-Q2', performance_rating: 5, remarks: '' });
                      setReviewModal(true);
                    }}
                    className="text-xs font-bold text-brand-orange hover:underline cursor-pointer"
                  >
                    File Review
                  </button>
                )}
              ]}
              data={stateManagers}
              searchKeys={["name"]}
              emptyStateText="No state managers assigned under this country yet."
            />
          </div>
        )}


        {/* TAB 8: Notifications */}
        {activeTab === 'Notifications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-800 font-display">Country Notification Hub</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Audits logs for state targets alerts, pending approvals alerts, and incentives milestones.</p>
              </div>
              <button
                onClick={handleMarkAllNotificationsRead}
                className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Mark All Read
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden shadow-xs">
              {notifications.length > 0 ? (
                notifications.map(n => (
                  <div key={n.id} className={`p-4 flex justify-between items-start gap-4 hover:bg-slate-50/50 transition-colors ${!n.is_read ? 'bg-orange-50/5' : ''}`}>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-brand-orange' : 'bg-slate-300'}`}></span>
                        <span className="font-bold text-slate-800 text-xs">{n.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                          n.priority === 'High' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                        }`}>{n.priority} priority</span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium pl-4 leading-relaxed">{n.message}</p>
                      <span className="text-[9px] text-slate-400 font-bold block pl-4 mt-1">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={async () => {
                          await fetch(`/api/country-managers/${cmId}/notifications/${n.id}/read`, { method: 'PATCH' });
                          loadTabData();
                        }}
                        className="text-[10px] font-bold text-brand-orange hover:underline shrink-0 cursor-pointer"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                  No notifications found.
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* MODALS */}
      {/* ──────────────────────────────────────────────────────────────────────── */}

      {/* 1. Reassign State Manager Modal */}
      <Modal
        isOpen={assignStateModal}
        onClose={closeAssignStateModal}
        title="Reassign State Manager"
        onConfirm={handleAssignManager}
        confirmText={assignStateLoading ? 'Saving...' : 'Save'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">State Select</label>
            <select
              value={selectedState}
              onChange={(e) => {
                const nextStateId = e.target.value;
                setSelectedState(nextStateId);
                const nextState = states.find((s) => s.state_id === nextStateId);
                setSelectedStateManager(nextState?.state_manager?.id || '');
              }}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer font-semibold"
            >
              {states.map(s => (
                <option key={s.state_id} value={s.state_id}>{s.state_name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAssignStateMode('create')}
              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                assignStateMode === 'create'
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Create New State Manager
            </button>
            <button
              type="button"
              onClick={() => setAssignStateMode('select')}
              className={`flex-1 px-3 py-2 text-xs font-bold rounded-lg border transition-colors ${
                assignStateMode === 'select'
                  ? 'bg-brand-orange text-white border-brand-orange'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Select Existing
            </button>
          </div>

          {assignStateMode === 'create' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newStateManagerUser.name}
                  onChange={(e) => setNewStateManagerUser({ ...newStateManagerUser, name: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email *</label>
                <input
                  type="email"
                  value={newStateManagerUser.email}
                  onChange={(e) => setNewStateManagerUser({ ...newStateManagerUser, email: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile *</label>
                <input
                  type="text"
                  value={newStateManagerUser.mobile}
                  onChange={(e) => setNewStateManagerUser({ ...newStateManagerUser, mobile: e.target.value })}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </div>
              <DefaultPasswordNotice suffix="The new user will be assigned to the selected state when you save." />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Select State Manager</label>
              <select
                value={selectedStateManager}
                onChange={(e) => setSelectedStateManager(e.target.value)}
                disabled={loadingStateManagerCandidates}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer font-semibold disabled:opacity-60"
              >
                <option value="">— Select state manager —</option>
                <option value="unassign">Unassign current manager</option>
                {stateManagerCandidates.map((sm) => (
                  <option key={sm._id} value={sm._id}>
                    {sm.name}{sm.is_current ? ' (Current)' : ''}{sm.mobile ? ` · ${sm.mobile}` : ''}
                  </option>
                ))}
              </select>
              {!loadingStateManagerCandidates && stateManagerCandidates.length === 0 && (
                <p className="text-[11px] text-amber-700 font-medium mt-2">
                  No available state managers. Use &quot;Create New State Manager&quot; to add one.
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* 2. Configure Target Modal */}
      <Modal
        isOpen={newTargetModal}
        onClose={() => setNewTargetModal(false)}
        title="Configure Sales Target Goal"
        onConfirm={handleSetTarget}
      >
        <div className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Type</label>
              <select
                value={targetForm.target_type}
                onChange={(e) => setTargetForm({ ...targetForm, target_type: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Period Label</label>
              <input
                type="text"
                value={targetForm.target_period}
                onChange={(e) => setTargetForm({ ...targetForm, target_period: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none"
                placeholder="2026-07"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Revenue Target (₹)</label>
            <input
              type="number"
              value={targetForm.revenue_target}
              onChange={(e) => setTargetForm({ ...targetForm, revenue_target: Number(e.target.value) })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Order Count</label>
              <input
                type="number"
                value={targetForm.order_count_target}
                onChange={(e) => setTargetForm({ ...targetForm, order_count_target: Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Retailers</label>
              <input
                type="number"
                value={targetForm.retailer_target}
                onChange={(e) => setTargetForm({ ...targetForm, retailer_target: Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Cities</label>
              <input
                type="number"
                value={targetForm.new_cities_target}
                onChange={(e) => setTargetForm({ ...targetForm, new_cities_target: Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 3. Performance Review Modal */}
      <Modal
        isOpen={reviewModal}
        onClose={() => setReviewModal(false)}
        title="File State Manager Performance Review"
        onConfirm={handleCreateReview}
      >
        <div className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">State Manager</label>
            <select
              value={reviewForm.state_manager_id}
              onChange={(e) => setReviewForm({ ...reviewForm, state_manager_id: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 cursor-pointer"
            >
              {stateManagers.map(sm => (
                <option key={sm.state_manager_id} value={sm.state_manager_id}>{sm.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Review Period</label>
              <input
                type="text"
                value={reviewForm.review_period}
                onChange={(e) => setReviewForm({ ...reviewForm, review_period: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                placeholder="2026-Q2"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Rating (1-5)</label>
              <select
                value={reviewForm.performance_rating}
                onChange={(e) => setReviewForm({ ...reviewForm, performance_rating: Number(e.target.value) })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white cursor-pointer"
              >
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Evaluation Remarks</label>
            <textarea
              value={reviewForm.remarks}
              onChange={(e) => setReviewForm({ ...reviewForm, remarks: e.target.value })}
              rows="3"
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800"
              placeholder="Provide comments regarding target completion..."
            />
          </div>
        </div>
      </Modal>

      {/* 4. Action Approval Modal */}
      {selectedApproval && (
        <Modal
          isOpen={approvalModal}
          onClose={() => setApprovalModal(false)}
          title={`Authorization decision: ${selectedApproval.reference_label}`}
          onConfirm={handleApprovalActionSubmit}
          isDestructive={approvalAction === 'Rejected'}
          confirmText={`Confirm ${approvalAction}`}
        >
          <div className="space-y-4 text-xs font-semibold">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 leading-relaxed text-slate-500">
              <span className="font-bold text-slate-800 block mb-1">Queue Audit Info:</span>
              - Request Type: {selectedApproval.approval_type} <br />
              - Submitted By: {selectedApproval.submitted_by_role} (ID: {selectedApproval.submitted_by}) <br />
              - Timestamp: {new Date(selectedApproval.submitted_at).toLocaleString()}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Decision Action</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input type="radio" checked={approvalAction === 'Approved'} onChange={() => setApprovalAction('Approved')} />
                  <span className="text-emerald-600">Approve Request</span>
                </label>
                <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                  <input type="radio" checked={approvalAction === 'Rejected'} onChange={() => setApprovalAction('Rejected')} />
                  <span className="text-rose-600">Reject Request</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Audit Statement / Remarks</label>
              <textarea
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                rows="3"
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white"
                placeholder="Provide statement of clearance or rejection reasoning..."
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Calculate Commission Modal */}
      <Modal
        isOpen={commissionCalcModal}
        onClose={() => setCommissionCalcModal(false)}
        title="Compute Country Manager Commission"
        onConfirm={handleCalculateCommission}
      >
        <div className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Period Type</label>
              <select
                value={commissionForm.period_type}
                onChange={(e) => setCommissionForm({ ...commissionForm, period_type: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-white cursor-pointer"
              >
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Period Label</label>
              <input
                type="text"
                value={commissionForm.period_label}
                onChange={(e) => setCommissionForm({ ...commissionForm, period_label: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                placeholder="2026-06"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Commission Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={commissionForm.commission_percentage}
              onChange={(e) => setCommissionForm({ ...commissionForm, commission_percentage: Number(e.target.value) })}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Formula: Payout = Total Country Revenue for period × Rate % / 100.
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
