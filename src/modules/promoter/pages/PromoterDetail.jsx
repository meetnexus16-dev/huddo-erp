// PROMO-MODULE: Promoter Detail page containing the 8-tab dashboard.
// Displays "Earned Royalty (5%)" label, and manages settlements.

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Edit, CheckCircle, ShieldAlert, Award, Store, DollarSign, Percent, 
  TrendingUp, FileText, Bell, Plus, Download, UserCheck, AlertCircle, RefreshCw, Send, Check
} from 'lucide-react';

import { 
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import { DataTable, Modal } from '../../../components/Common';
import { useConfirm } from '../../../context/ConfirmContext';

export default function PromoterDetail({ promoterId, onNavigate, showToast, userRole = 'Founder', initialTab = 'Overview' }) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState(initialTab);

  // PROMO-MODULE: Sync activeTab state when initialTab changes in the parent dashboard sidebar
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [loading, setLoading] = useState(true);
  const [promoter, setPromoter] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);


  // Modals state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isGenSettlementOpen, setIsGenSettlementOpen] = useState(false);
  const [isAddConfigOpen, setIsAddConfigOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);
  const [isNotifSendOpen, setIsNotifSendOpen] = useState(false);

  // Dropdown options
  const [availableRetailers, setAvailableRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [verificationAction, setVerificationAction] = useState('Verified');
  const [verificationRemarks, setVerificationRemarks] = useState('');

  // Settlement payout form
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutMode, setPayoutMode] = useState('NEFT');
  const [payoutReference, setPayoutReference] = useState('');
  const [payoutRemarks, setPayoutRemarks] = useState('');

  // Generate settlement form
  const [genMonth, setGenMonth] = useState('6');
  const [genYear, setGenYear] = useState('2026');

  // Custom royalty config form
  const [configType, setConfigType] = useState('Global');
  const [configProductId, setConfigProductId] = useState('');
  const [configRetailerId, setConfigRetailerId] = useState('');
  const [configRate, setConfigRate] = useState('5.00');

  // Upload document form
  const [docType, setDocType] = useState('Aadhaar');
  const [docFileUrl, setDocFileUrl] = useState('');

  // Send notification form
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [notifPriority, setNotifPriority] = useState('Normal');

  // Tab Data States
  const [mappedRetailers, setMappedRetailers] = useState([]);
  const [revenueData, setRevenueData] = useState({ revenue_list: [], summary: {} });
  const [royaltyConfigs, setRoyaltyConfigs] = useState({ product_configs: [], retailer_configs: [], global_config: {} });
  const [royaltyEarnings, setRoyaltyEarnings] = useState({ earnings: [], summary: {} });
  const [royaltySettlements, setRoyaltySettlements] = useState({ settlements: [], summary: {} });
  const [performanceData, setPerformanceData] = useState(null);
  const [reportType, setReportType] = useState('revenue');
  const [reportOutput, setReportOutput] = useState(null);
  const [documentsList, setDocumentsList] = useState([]);
  const [notificationsList, setNotificationsList] = useState([]);

  // Fetch Core Profile and Dashboard data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/promoters/${promoterId}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setPromoter(data.profile_snapshot);
        setDashboardData(data);
      }
    } catch (err) {
      showToast("Failed to load promoter details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [promoterId]);

  // Tab 2: Retailers Fetch
  const fetchRetailers = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/retailers`);
      if (res.ok) {
        const data = await res.json();
        setMappedRetailers(data.mapped_retailers || []);
      }
      
      // Load unmapped retailers for map modal
      const retRes = await fetch('/api/retailers');
      if (retRes.ok) {
        const rets = await retRes.json();
        // filter out retailers that already have a promoter mapped (assigned_promoter_id !== null or promoter !== None)
        const unmapped = rets.filter(r => !r.assigned_promoter_id && (!r.promoter || r.promoter === 'None' || r.promoter === ''));
        setAvailableRetailers(unmapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 3: Revenue Fetch
  const fetchRevenue = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/revenue`);
      if (res.ok) {
        const data = await res.json();
        setRevenueData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 4: Royalty Configs, Earnings, Settlements Fetch
  const fetchRoyalty = async () => {
    try {
      const cRes = await fetch(`/api/promoters/${promoterId}/royalty/config`);
      if (cRes.ok) {
        const cData = await cRes.json();
        setRoyaltyConfigs(cData);
      }

      const eRes = await fetch(`/api/promoters/${promoterId}/royalty/earnings`);
      if (eRes.ok) {
        const eData = await eRes.json();
        setRoyaltyEarnings(eData);
      }

      const sRes = await fetch(`/api/promoters/${promoterId}/royalty/settlements`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setRoyaltySettlements(sData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 5: Performance Fetch
  const fetchPerformance = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/performance`);
      if (res.ok) {
        const data = await res.json();
        setPerformanceData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 6: Reports Fetch
  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/reports/${reportType}`);
      if (res.ok) {
        const data = await res.json();
        setReportOutput(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 7: Documents Fetch
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/documents`);
      if (res.ok) {
        const data = await res.json();
        setDocumentsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tab 8: Notifications Fetch
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotificationsList(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger tab loads
  useEffect(() => {
    if (activeTab === 'Retailers') fetchRetailers();
    else if (activeTab === 'Revenue') fetchRevenue();
    else if (activeTab === 'Royalty') fetchRoyalty();
    else if (activeTab === 'Performance') fetchPerformance();
    else if (activeTab === 'Reports') fetchReports();
    else if (activeTab === 'Documents') fetchDocuments();
    else if (activeTab === 'Notifications') fetchNotifications();
  }, [activeTab, reportType]);

  // Operations handlers
  const handleMapRetailer = async () => {
    if (!selectedRetailerId) return;
    try {
      const res = await fetch(`/api/promoters/${promoterId}/retailers/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retailer_id: selectedRetailerId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Retailer ${data.retailer_name} mapped successfully.`, "success");
        setIsMapOpen(false);
        fetchRetailers();
        fetchData();
      } else {
        showToast(data.error || "Failed to map retailer.", "error");
      }
    } catch (err) {
      showToast("Error mapping retailer.", "error");
    }
  };

  const handleUnmapRetailer = async (retId) => {
    const confirmed = await confirm({
      title: 'Unmap retailer?',
      message: 'Are you sure you want to unmap this retailer?',
      confirmText: 'Unmap',
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/promoters/${promoterId}/retailers/${retId}/unmap`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: "Unmapped manually by manager" })
      });
      if (res.ok) {
        showToast("Retailer unmapped successfully.", "success");
        fetchRetailers();
        fetchData();
      }
    } catch (err) {
      showToast("Unmap operation failed.", "error");
    }
  };

  const handleVerifyPromoter = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: verificationAction, remarks: verificationRemarks })
      });
      if (res.ok) {
        showToast(`Promoter has been ${verificationAction.toLowerCase()}.`, "success");
        setIsVerifyOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast("Verification failed.", "error");
    }
  };

  const handlePaySettlement = async () => {
    if (!payoutAmount || isNaN(payoutAmount)) return;
    try {
      const res = await fetch(`/api/promoters/${promoterId}/royalty/settlements/${selectedSettlement.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount_paid: Number(payoutAmount),
          payment_mode: payoutMode,
          payment_reference: payoutReference,
          payment_date: new Date().toISOString(),
          remarks: payoutRemarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Payout processed successfully.", "success");
        setIsPayOpen(false);
        fetchRoyalty();
        fetchData();
      } else {
        showToast(data.error || "Payment processing failed.", "error");
      }
    } catch (err) {
      showToast("Error processing payout.", "error");
    }
  };

  const handleGenerateSettlement = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/royalty/settlements/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_month: genMonth, period_year: genYear })
      });
      if (res.ok) {
        showToast("Settlement statement generated successfully.", "success");
        setIsGenSettlementOpen(false);
        fetchRoyalty();
      }
    } catch (err) {
      showToast("Error generating settlement.", "error");
    }
  };

  const handleAddRoyaltyConfig = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/royalty/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_type: configType,
          product_id: configProductId || null,
          retailer_id: configRetailerId || null,
          royalty_percentage: Number(configRate)
        })
      });
      if (res.ok) {
        showToast("Royalty rate override successfully added.", "success");
        setIsAddConfigOpen(false);
        fetchRoyalty();
      }
    } catch (err) {
      showToast("Error saving config override.", "error");
    }
  };

  const handleDeleteRoyaltyConfig = async (confId) => {
    const confirmed = await confirm({
      title: 'Delete override?',
      message: 'Are you sure you want to delete this commission override?',
      confirmText: 'Delete',
      isDestructive: true
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/promoters/${promoterId}/royalty/config/${confId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast("Override deactivated successfully.", "success");
        fetchRoyalty();
      }
    } catch (err) {
      showToast("Deactivation failed.", "error");
    }
  };

  const handleUploadDoc = async () => {
    if (!docFileUrl) return;
    try {
      const res = await fetch(`/api/promoters/${promoterId}/upload-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_type: docType, document_url: docFileUrl })
      });
      if (res.ok) {
        showToast("KYC document saved successfully.", "success");
        setIsUploadDocOpen(false);
        fetchDocuments();
      }
    } catch (err) {
      showToast("Upload failed.", "error");
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle || !notifMsg) return;
    try {
      const res = await fetch(`/api/promoters/${promoterId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'System',
          title: notifTitle,
          message: notifMsg,
          priority: notifPriority
        })
      });
      if (res.ok) {
        showToast("Notification successfully dispatched.", "success");
        setIsNotifSendOpen(false);
        setNotifTitle('');
        setNotifMsg('');
      }
    } catch (err) {
      showToast("Error sending notification.", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`/api/promoters/${promoterId}/notifications/read-all`, {
        method: 'PATCH'
      });
      if (res.ok) {
        showToast("All notifications marked as read.", "success");
        fetchNotifications();
      }
    } catch (err) {
      showToast("Failed to mark read.", "error");
    }
  };

  if (loading || !promoter) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-sm font-semibold text-slate-500">Loading details dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel (Only on Overview) */}
      {activeTab === 'Overview' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            {userRole !== 'Promoter' && (
              <button 
                onClick={() => onNavigate('list')}
                className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 font-display">{promoter.full_name}</h1>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                  {promoter.promoter_code}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  promoter.verification_status === 'Verified' ? 'bg-emerald-100 text-emerald-800' : promoter.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {promoter.verification_status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  promoter.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : promoter.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  Payment: {promoter.payment_status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  promoter.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {promoter.status}
                </span>
              </div>
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex flex-wrap gap-2">
            {userRole !== 'Promoter' && (
              <>
                <button 
                  onClick={() => onNavigate(`edit-${promoterId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                {promoter.verification_status === 'Pending' && (
                  <button 
                    onClick={() => setIsVerifyOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Verify Promoter</span>
                  </button>
                )}
                <button 
                  onClick={() => setIsMapOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Map Retailer</span>
                </button>
                <button 
                  onClick={() => setIsNotifSendOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Notification</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Minimal Header on other pages for Admin/Founder role */}
      {activeTab !== 'Overview' && userRole !== 'Promoter' && (
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('list')}
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900 font-display">
                {promoter.full_name} <span className="text-slate-400 font-normal">| {activeTab}</span>
              </h1>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setIsMapOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Map Retailer</span>
            </button>
            <button 
              onClick={() => setIsNotifSendOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Notification</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs list (Only for Founder/Admin/etc role, not for the Promoter themselves) */}
      {userRole !== 'Promoter' && (
        <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
          {['Overview', 'Retailers', 'Revenue', 'Royalty', 'Performance', 'Reports', 'Documents', 'Notifications'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === t ? 'border-brand-orange text-brand-orange font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'Overview' && dashboardData && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Retailers Added</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">{dashboardData.summary_cards.retailers_added || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Active Retailers</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-2 font-display">{dashboardData.summary_cards.active_retailers || 0}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Revenue Generated</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{(dashboardData.summary_cards.revenue_generated || 0).toLocaleString('en-IN')}</span>
            </div>
            {/* PROMO-MODULE: Earned Royalty label strictly updated to show 5% */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Earned Royalty (5%)</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-2 font-display">₹{(dashboardData.summary_cards.royalty_earned || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Royalty</span>
              <span className="text-xl font-extrabold text-rose-600 mt-2 font-display">₹{(dashboardData.summary_cards.pending_royalty || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Royalty</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{(dashboardData.summary_cards.paid_royalty || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Status section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-900 font-display">Royalty Disbursal Progress</h3>
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold mb-1">
              <span>Paid: ₹{(dashboardData.summary_cards.paid_royalty || 0).toLocaleString('en-IN')}</span>
              <span>Pending: ₹{(dashboardData.summary_cards.pending_royalty || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div 
                className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${dashboardData.payment_status_breakdown.paid_pct || 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center text-xs mt-2 font-semibold text-slate-500">
              <span>Progress: {dashboardData.payment_status_breakdown.paid_pct || 0}% Cleared</span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                promoter.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : promoter.payment_status === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
              }`}>
                Status: {promoter.payment_status}
              </span>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Monthly Revenue */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 font-display mb-4">Monthly Revenue Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={dashboardData.monthly_trend} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#ff6b00" strokeWidth={2} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Royalty Earned vs Paid */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 font-display mb-4">Monthly Royalty Earned vs Paid</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={dashboardData.monthly_trend} margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="royalty_earned" name="Earned" fill="#10b981" />
                    <Bar dataKey="royalty_paid" name="Paid" fill="#0f172a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Retailers */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 font-display">Top Mapped Retailers by Revenue</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="py-2">Retailer</th>
                      <th className="py-2">City</th>
                      <th className="py-2 text-right">Revenue</th>
                      <th className="py-2 text-right">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.top_retailers.map((r, idx) => (
                      <tr key={idx} className="border-b border-slate-50 font-semibold text-slate-700 hover:bg-slate-50/50">
                        <td className="py-2.5 font-bold text-slate-800">{r.retailer_name}</td>
                        <td className="py-2.5">{r.city}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">₹{r.revenue.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 text-right font-bold text-slate-600">{r.orders}</td>
                      </tr>
                    ))}
                    {dashboardData.top_retailers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 font-semibold">No mapped retailers with billing records.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Royalty Earnings */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
              {/* PROMO-MODULE: Earned Royalty label strictly updated to show 5% */}
              <h3 className="text-xs font-bold text-slate-800 font-display">Recent Earned Royalty (5%)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                      <th className="py-2">Period</th>
                      <th className="py-2 text-right">Billing (₹)</th>
                      <th className="py-2 text-right">Rate</th>
                      <th className="py-2 text-right">Royalty (₹)</th>
                      <th className="py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.recent_royalty_earnings.map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-50 font-semibold text-slate-700 hover:bg-slate-50/50">
                        <td className="py-2.5 font-bold">{e.period_year}-{String(e.period_month).padStart(2, '0')}</td>
                        <td className="py-2.5 text-right font-bold text-slate-800">₹{e.billing_amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 text-right">{e.royalty_percentage}%</td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">₹{e.royalty_amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            e.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>{e.status}</span>
                        </td>
                      </tr>
                    ))}
                    {dashboardData.recent_royalty_earnings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">No recent royalty accrued.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RETAILERS */}
      {activeTab === 'Retailers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Retailer-to-Promoter Mappings</h3>
            {userRole !== 'Promoter' && (
              <button
                onClick={() => setIsMapOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Map New Retailer</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <DataTable
              columns={[
                { header: "Retailer Name", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
                { header: "Owner", accessor: "owner_name" },
                { header: "Mobile", accessor: "mobile" },
                { header: "Category", accessor: "category" },
                { header: "City", accessor: "city" },
                { header: "State", accessor: "state" },
                { header: "Mapped Date", accessor: "mapped_at", render: (val) => new Date(val).toLocaleDateString('en-IN') },
                { header: "Orders Count", accessor: "total_orders", render: (val) => <span className="font-bold">{val}</span> },
                { header: "Revenue (₹)", accessor: "monthly_revenue", render: (val) => <span className="font-bold text-slate-900">₹{(val || 0).toLocaleString('en-IN')}</span> },
                { header: "Last Order Date", accessor: "last_order_date" },
                {
                  header: "Status",
                  accessor: "is_active",
                  render: (val) => (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      val === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>{val === 1 ? 'Active' : 'Unmapped'}</span>
                  )
                },
                ...(userRole !== 'Promoter' ? [{
                  header: "Actions",
                  accessor: "retailer_id",
                  render: (val, row) => (
                    row.is_active === 1 && (
                      <button
                        onClick={() => handleUnmapRetailer(val)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Unmap
                      </button>
                    )
                  )
                }] : [])
              ]}
              data={mappedRetailers}
              searchKeys={["retailer_name", "owner_name", "city"]}
              searchPlaceholder="Filter mapped shops..."
            />
          </div>
        </div>
      )}

      {/* TAB 3: REVENUE */}
      {activeTab === 'Revenue' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{(revenueData.summary.total_invoiced || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-2 font-display">₹{(revenueData.summary.total_paid || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Outstanding</span>
              <span className="text-xl font-extrabold text-rose-600 mt-2 font-display">₹{(revenueData.summary.total_outstanding || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total GST Collected</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{(revenueData.summary.total_gst || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Company-to-Retailer Billings Roster</h3>
            {userRole !== 'Promoter' && (
              <button 
                onClick={() => {
                  fetch(`/api/promoters/${promoterId}/revenue/sync`, { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                      showToast(data.message, "success");
                      fetchRevenue();
                      fetchData();
                    });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Invoices</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <DataTable
              columns={[
                { header: "Date", accessor: "invoice_date" },
                { header: "Invoice Number", accessor: "invoice_number", render: (val) => <span className="font-mono font-bold">{val}</span> },
                { header: "Retailer Shop", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
                { header: "City", accessor: "retailer_city" },
                { header: "Invoice Amt (₹)", accessor: "invoice_amount", render: (val) => <span className="font-bold">₹{val.toLocaleString('en-IN')}</span> },
                { header: "GST Amt (₹)", accessor: "gst_amount", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> },
                { header: "Total Payout (₹)", accessor: "total_amount", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> },
                { header: "Payment Status", accessor: "payment_status", render: (val) => (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>{val}</span>
                )}
              ]}
              data={revenueData.revenue_list}
              searchKeys={["retailer_name", "invoice_number", "retailer_city"]}
              searchPlaceholder="Search revenue chain records..."
            />
          </div>
        </div>
      )}

      {/* TAB 4: ROYALTY */}
      {activeTab === 'Royalty' && (
        <div className="space-y-6">
          {/* Sub-tabs config */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-6">
            {/* Sub-tab C: Royalty Config */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase">Royalty configuration ledger</h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Customize global rates and establish product-specific overrides.</p>
                </div>
                {userRole !== 'Promoter' && (
                  <button
                    onClick={() => setIsAddConfigOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Config Override</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Global rate card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Global Base Rate</span>
                    <h4 className="text-2xl font-extrabold text-slate-800 mt-2 font-display">{royaltyConfigs.global_config.royalty_percentage || 5.00}%</h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-3">Default base rate applied globally to retailer purchases</span>
                </div>

                {/* Overrides Table */}
                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Override Rules</span>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                          <th className="p-2">Type</th>
                          <th className="p-2">Entity ID/Name</th>
                          <th className="p-2 text-right">Override Rate</th>
                          {userRole !== 'Promoter' && <th className="p-2 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {royaltyConfigs.retailer_configs.map(c => (
                          <tr key={c.id} className="border-b border-slate-50 font-semibold">
                            <td className="p-2 text-slate-500">Retailer</td>
                            <td className="p-2 font-bold text-slate-800">{c.retailer_name || `Retailer ID: ${c.retailer_id}`}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{c.royalty_percentage}%</td>
                            {userRole !== 'Promoter' && (
                              <td className="p-2 text-center">
                                <button onClick={() => handleDeleteRoyaltyConfig(c.id)} className="text-rose-600 hover:underline">Remove</button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {royaltyConfigs.product_configs.map(c => (
                          <tr key={c.id} className="border-b border-slate-50 font-semibold">
                            <td className="p-2 text-slate-500">Product</td>
                            <td className="p-2 font-bold text-slate-800">{c.product_name || `Product ID: ${c.product_id}`}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{c.royalty_percentage}%</td>
                            {userRole !== 'Promoter' && (
                              <td className="p-2 text-center">
                                <button onClick={() => handleDeleteRoyaltyConfig(c.id)} className="text-rose-600 hover:underline">Remove</button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {royaltyConfigs.retailer_configs.length === 0 && royaltyConfigs.product_configs.length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-400 font-semibold bg-white">No active override configs established.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tab A: Earnings */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-50 pb-2">Royalty accrual logs (Accrued Payouts)</h4>
              <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-500 bg-slate-50/50 border border-slate-100 rounded-xl p-3 mb-2">
                <div>Total Accrued: <span className="font-bold text-slate-800">₹{royaltyEarnings.summary.total_earned?.toLocaleString('en-IN') || 0}</span></div>
                <div>Total Disbursed: <span className="font-bold text-emerald-600">₹{royaltyEarnings.summary.total_paid?.toLocaleString('en-IN') || 0}</span></div>
                <div>Total Pending: <span className="font-bold text-rose-600">₹{royaltyEarnings.summary.total_pending?.toLocaleString('en-IN') || 0}</span></div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <DataTable
                  columns={[
                    { header: "Period", accessor: "period_month", render: (val, row) => <span>{row.period_year}-{String(val).padStart(2, '0')}</span> },
                    { header: "Retailer Shop", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-700">{val}</span> },
                    { header: "Invoice ID", accessor: "invoice_number", render: (val) => <span className="font-mono">{val}</span> },
                    { header: "Billing Amount", accessor: "billing_amount", render: (val) => <span className="font-bold">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Commission Rate", accessor: "royalty_percentage", render: (val) => <span>{val}%</span> },
                    { header: "Accrued Royalty", accessor: "royalty_amount", render: (val) => <span className="font-bold text-emerald-600">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Status", accessor: "status", render: (val) => (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>{val}</span>
                    )},
                    { header: "Payment Ref", accessor: "payment_reference", render: (val) => val ? <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[10px]">{val}</code> : <span className="text-slate-400 font-semibold">N/A</span> }
                  ]}
                  data={royaltyEarnings.earnings}
                  searchKeys={["retailer_name", "invoice_number"]}
                  searchPlaceholder="Filter royalty items..."
                />
              </div>
            </div>

            {/* Sub-tab B: Settlements */}
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase">Settlement Batches</h4>
                {userRole !== 'Promoter' && (
                  <button
                    onClick={() => setIsGenSettlementOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-dark hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Run Settlement Batch</span>
                  </button>
                )}
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <DataTable
                  columns={[
                    { header: "Settlement Period", accessor: "settlement_period", render: (val) => <span className="font-bold">{val}</span> },
                    { header: "Accrued Billings", accessor: "total_billings", render: (val) => <span className="font-bold">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Royalty Earned", accessor: "total_royalty_earned", render: (val) => <span className="font-bold text-emerald-600">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Royalty Paid", accessor: "total_royalty_paid", render: (val) => <span className="font-bold text-slate-700">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Outstanding Royalty", accessor: "outstanding_royalty", render: (val) => <span className="font-bold text-rose-600">₹{val.toLocaleString('en-IN')}</span> },
                    { header: "Settlement Status", accessor: "settlement_status", render: (val) => {
                      const color = val === 'Settled' ? 'bg-emerald-100 text-emerald-800' : val === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800';
                      return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${color}`}>{val}</span>;
                    }},
                    {
                      header: "Actions",
                      accessor: "id",
                      render: (val, row) => (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedSettlement(row);
                              setPayoutAmount(row.outstanding_royalty);
                              setPayoutReference('');
                              setPayoutRemarks('');
                              setIsPayOpen(true);
                            }}
                            disabled={row.outstanding_royalty <= 0 || userRole === 'Promoter'}
                            className="text-xs font-semibold text-brand-orange hover:underline disabled:text-slate-300 disabled:no-underline"
                          >
                            Disburse
                          </button>
                          <a 
                            href={`https://mock-storage.huddoerp.in/reports/settlement-${row.settlement_period}.pdf`} 
                            target="_blank" 
                            className="text-xs font-semibold text-slate-500 hover:underline"
                          >
                            Statement
                          </a>
                        </div>
                      )
                    }
                  ]}
                  data={royaltySettlements.settlements}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PERFORMANCE */}
      {activeTab === 'Performance' && performanceData && (
        <div className="space-y-6">
          {/* Performance cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Mapped Retailers</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">{performanceData.overall.total_retailers_added}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue Generated</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{performanceData.overall.total_revenue_generated.toLocaleString('en-IN')}</span>
            </div>
            {/* PROMO-MODULE: Earned Royalty label strictly updated to show 5% */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total Royalty Earned (5%)</span>
              <span className="text-xl font-extrabold text-emerald-600 mt-2 font-display">₹{performanceData.overall.total_royalty_earned.toLocaleString('en-IN')}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Net Disbursed Payout</span>
              <span className="text-xl font-extrabold text-slate-800 mt-2 font-display">₹{performanceData.overall.total_royalty_paid.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Performance charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 font-display mb-4">Revenue & Royalty Accrual Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={performanceData.monthly_trend} margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#ff6b00" name="Revenue Generated" />
                    <Line type="monotone" dataKey="royalty" stroke="#10b981" name="Royalty Earned" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 font-display mb-4">Quarterly Volume Statistics</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={performanceData.quarterly_trend} margin={{ top: 5, right: 10, left: 25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Revenue Generated" fill="#0f172a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REPORTS */}
      {activeTab === 'Reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Report Scope</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-700 font-bold"
                >
                  <option value="revenue">Retailer Revenue Tracking</option>
                  <option value="royalty">Royalty Ledger Summaries</option>
                  <option value="retailers">Mapped Retailers Statistics</option>
                </select>
              </div>
            </div>

            {reportOutput && (
              <div className="flex gap-2">
                <a 
                  href={reportOutput.download_url} 
                  target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (CSV)</span>
                </a>
              </div>
            )}
          </div>

          {reportOutput && reportType === 'revenue' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-50 pb-2">Revenue summary</h4>
              <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 rounded-xl p-3">
                <div>Total Sales: <span className="font-bold text-slate-900">₹{reportOutput.summary.total_revenue.toLocaleString('en-IN')}</span></div>
                <div>Invoice Count: <span className="font-bold text-slate-800">{reportOutput.summary.total_invoices}</span></div>
                <div>Avg Invoice Value: <span className="font-bold text-slate-800">₹{reportOutput.summary.avg_invoice.toLocaleString('en-IN')}</span></div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <DataTable
                  columns={[
                    { header: "Retailer Shop", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-700">{val}</span> },
                    { header: "Revenue Contribution", accessor: "revenue", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> }
                  ]}
                  data={reportOutput.by_retailer}
                />
              </div>
            </div>
          )}

          {reportOutput && reportType === 'royalty' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-50 pb-2">Royalty payout summary</h4>
              <div className="grid grid-cols-4 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 rounded-xl p-3">
                {/* PROMO-MODULE: Earned Royalty label strictly updated to show 5% */}
                <div>Earned Royalty (5%): <span className="font-bold text-slate-900">₹{reportOutput.annual_summary.total_earned.toLocaleString('en-IN')}</span></div>
                <div>Disbursed Payout: <span className="font-bold text-emerald-600">₹{reportOutput.annual_summary.total_paid.toLocaleString('en-IN')}</span></div>
                <div>Outstanding Balance: <span className="font-bold text-rose-600">₹{reportOutput.annual_summary.pending.toLocaleString('en-IN')}</span></div>
                <div>Configured Rate: <span className="font-bold text-slate-800">{reportOutput.annual_summary.royalty_pct}%</span></div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <DataTable
                  columns={[
                    { header: "Retailer Shop", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-700">{val}</span> },
                    { header: "Royalty Earned", accessor: "earned", render: (val) => <span className="font-bold text-emerald-600">₹{val.toLocaleString('en-IN')}</span> }
                  ]}
                  data={reportOutput.by_retailer}
                />
              </div>
            </div>
          )}

          {reportOutput && reportType === 'retailers' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-50 pb-2">Onboarded retailer demographics</h4>
              <div className="grid grid-cols-3 gap-4 text-xs font-semibold text-slate-600 bg-slate-50 rounded-xl p-3">
                <div>Total Onboarded: <span className="font-bold text-slate-900">{reportOutput.total_mapped}</span></div>
                <div>Active Stores: <span className="font-bold text-emerald-600">{reportOutput.active}</span></div>
                <div>New (This Period): <span className="font-bold text-slate-800">{reportOutput.new_this_period}</span></div>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <DataTable
                  columns={[
                    { header: "Retailer Name", accessor: "retailer_name", render: (val) => <span className="font-bold text-slate-700">{val}</span> },
                    { header: "City", accessor: "city" },
                    { header: "Mapped On", accessor: "mapped_at", render: (val) => new Date(val).toLocaleDateString('en-IN') },
                    { header: "Status", accessor: "status" }
                  ]}
                  data={reportOutput.retailer_list}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DOCUMENTS */}
      {activeTab === 'Documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">KYC Documents Storage</h3>
            {userRole !== 'Promoter' && (
              <button
                onClick={() => setIsUploadDocOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload KYC Document</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {documentsList.map(doc => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 items-start shadow-xs">
                <FileText className="w-8 h-8 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-bold text-slate-800 truncate">{doc.document_type}</h5>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</span>
                  <a 
                    href={doc.document_url} 
                    target="_blank"
                    className="text-[10px] font-bold text-brand-orange hover:underline block mt-2"
                  >
                    Download Attachment
                  </a>
                </div>
              </div>
            ))}
            {documentsList.length === 0 && (
              <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-semibold">
                No KYC file attachments uploaded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: NOTIFICATIONS */}
      {activeTab === 'Notifications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Notification Dispatch Log</h3>
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-semibold text-brand-orange hover:underline"
            >
              Mark all read
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 shadow-xs text-xs font-semibold">
            {notificationsList.map(n => (
              <div key={n.id} className={`p-4 flex gap-3 items-start hover:bg-slate-50/50 ${n.is_read === 0 ? 'bg-slate-50/30' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.is_read === 0 ? 'bg-brand-orange' : 'bg-slate-300'}`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{n.title}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{new Date(n.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-1">{n.message}</p>
                </div>
              </div>
            ))}
            {notificationsList.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50/50">
                No notifications logged.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Verify Modal */}
      <Modal isOpen={isVerifyOpen} onClose={() => setIsVerifyOpen(false)} title="Verify Promoter profile" onConfirm={handleVerifyPromoter} confirmText="Submit Action">
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status Action</label>
            <select
              value={verificationAction}
              onChange={(e) => setVerificationAction(e.target.value)}
              className="border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="Verified">Verified (Approve Profile)</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Remarks/Auditor Note</label>
            <textarea
              value={verificationRemarks}
              onChange={(e) => setVerificationRemarks(e.target.value)}
              rows={3}
              placeholder="Provide validation comments..."
              className="border border-slate-200 rounded p-2 text-xs font-medium text-slate-700 bg-white"
            />
          </div>
        </div>
      </Modal>

      {/* Map Retailer Modal */}
      <Modal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} title="Map Retailer" onConfirm={handleMapRetailer} confirmText="Confirm Assignment">
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Select Retailer Shop</label>
            <select
              value={selectedRetailerId}
              onChange={(e) => setSelectedRetailerId(e.target.value)}
              className="border border-slate-200 rounded p-2 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Choose Retailer...</option>
              {availableRetailers.map(r => (
                <option key={r.id} value={r.id}>{r.shopName} ({r.city})</option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1">Only displaying unmapped active retailers in geography.</span>
          </div>
        </div>
      </Modal>

      {/* Pay Settlement Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="Disburse Royalty Settlement Payout" onConfirm={handlePaySettlement} confirmText="Record Payment">
        <div className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-2">
            <div>Outstanding: <span className="font-bold text-rose-600">₹{selectedSettlement?.outstanding_royalty?.toLocaleString('en-IN')}</span></div>
            <div>Period: <span className="font-bold text-slate-700">{selectedSettlement?.settlement_period}</span></div>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payout Amount (₹)*</label>
            <input
              type="number"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Mode</label>
            <select
              value={payoutMode}
              onChange={(e) => setPayoutMode(e.target.value)}
              className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700 bg-white"
            >
              <option value="NEFT">NEFT Transfer</option>
              <option value="RTGS">RTGS Transfer</option>
              <option value="UPI">UPI Direct Payout</option>
              <option value="Cheque">Corporate Cheque</option>
              <option value="Cash">Cash Ledger</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Transaction Reference / UTR Number*</label>
            <input
              type="text"
              value={payoutReference}
              onChange={(e) => setPayoutReference(e.target.value)}
              placeholder="e.g. TXN99281223"
              className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Internal Notes</label>
            <textarea
              value={payoutRemarks}
              onChange={(e) => setPayoutRemarks(e.target.value)}
              rows={2}
              className="border border-slate-200 rounded p-2 text-xs font-medium text-slate-700"
            />
          </div>
        </div>
      </Modal>

      {/* Generate Settlement Modal */}
      <Modal isOpen={isGenSettlementOpen} onClose={() => setIsGenSettlementOpen(false)} title="Generate settlement statement batch" onConfirm={handleGenerateSettlement} confirmText="Execute Statement">
        <div className="space-y-4 text-xs font-semibold">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Billing Month</label>
              <select value={genMonth} onChange={(e) => setGenMonth(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Billing Year</label>
              <select value={genYear} onChange={(e) => setGenYear(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Config Override Modal */}
      <Modal isOpen={isAddConfigOpen} onClose={() => setIsAddConfigOpen(false)} title="Establish royalty config override" onConfirm={handleAddRoyaltyConfig} confirmText="Save Rule">
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Override Level Scope</label>
            <select value={configType} onChange={(e) => setConfigType(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
              <option value="Retailer">Retailer Scope Override</option>
              <option value="Global">Global Base Override</option>
            </select>
          </div>
          {configType === 'Retailer' && (
            <div className="flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Select Retailer Shop</label>
              <select value={configRetailerId} onChange={(e) => setConfigRetailerId(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
                <option value="">Select retailer...</option>
                {mappedRetailers.map(r => (
                  <option key={r.retailer_id} value={r.retailer_id}>{r.retailer_name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Royalty Rate Override (%)</label>
            <input type="number" step={0.01} value={configRate} onChange={(e) => setConfigRate(e.target.value)} className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700" />
          </div>
        </div>
      </Modal>

      {/* Upload KYC Modal */}
      <Modal isOpen={isUploadDocOpen} onClose={() => setIsUploadDocOpen(false)} title="Upload KYC Document" onConfirm={handleUploadDoc} confirmText="Attach Document">
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">KYC Type</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
              <option value="Aadhaar">Aadhaar Card (UIDAI)</option>
              <option value="PAN">PAN Card Details</option>
              <option value="GST_Certificate">GSTIN Certificate</option>
              <option value="Bank_Passbook">Passbook Statement</option>
              <option value="Profile_Photo">Profile Picture</option>
              <option value="Other">Miscellaneous Attachments</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Document Attachment URL*</label>
            <input type="text" value={docFileUrl} onChange={(e) => setDocFileUrl(e.target.value)} placeholder="https://example.com/file.pdf" className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700" />
          </div>
        </div>
      </Modal>

      {/* Send Notification Modal */}
      <Modal isOpen={isNotifSendOpen} onClose={() => setIsNotifSendOpen(false)} title="Dispatch Promoter Notification" onConfirm={handleSendNotification} confirmText="Dispatch Alert">
        <div className="space-y-4 text-xs font-semibold">
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Notification Title*</label>
            <input type="text" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} placeholder="Enter alert title" className="border border-slate-200 rounded p-2 text-xs font-bold text-slate-700" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Notification Message*</label>
            <textarea value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} rows={3} placeholder="Write alert message details..." className="border border-slate-200 rounded p-2 text-xs font-medium text-slate-700" />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] uppercase font-bold text-slate-400 mb-1">Priority</label>
            <select value={notifPriority} onChange={(e) => setNotifPriority(e.target.value)} className="border border-slate-200 rounded p-2 bg-white text-xs font-bold">
              <option value="Normal">Normal Priority</option>
              <option value="Low">Low Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
