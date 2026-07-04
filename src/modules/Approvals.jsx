import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Settings, FileText } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';

export default function Approvals({ showToast }) {
  const [activeTab, setActiveTab] = useState('pending'); // pending | config | history
  const [approvals, setApprovals] = useState([]);
  const [workflowConfig, setWorkflowConfig] = useState({
    orders: { city: true, state: false, country: true, admin: true },
    retailers: { city: false, state: true, country: false, admin: true },
    commissions: { city: false, state: false, country: true, admin: true }
  });
  const [pendingFilter, setPendingFilter] = useState('All'); // request type filter

  // Comment Modal state
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqAction, setReqAction] = useState('approve'); // approve | reject
  const [commentVal, setCommentVal] = useState('');

  const loadApprovals = () => {
    Promise.all([
      fetch('/api/orders').then(res => res.json()),
      fetch('/api/retailers').then(res => res.json()),
      fetch('/api/onboarding/pending').then(res => res.json())
    ]).then(([ordersData, retailersData, onboardingData]) => {
      const mappedOrders = (ordersData.success && Array.isArray(ordersData.data) ? ordersData.data : [])
        .filter(o => o.status === 'Submitted' || o.status === 'Pending')
        .map(o => ({
          id: o._id,
          requester: o.retailer?.business_name || 'Unknown Retailer',
          type: "Large Orders",
          status: "Pending",
          details: `Order ref ${o.order_number || o._id} of value ₹${o.subtotal || o.amount} requires approval.`,
          date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '2026-06-11',
          rawType: 'order'
        }));

      const mappedRetailers = (retailersData.success && Array.isArray(retailersData.data) ? retailersData.data : [])
        .filter(r => !r.is_verified)
        .map(r => ({
          id: r._id,
          requester: r.business_name || r.owner_name || 'New Retailer',
          type: "Retailer Registration",
          status: "Pending",
          details: `Retailer ${r.business_name || r.owner_name} requested shop category verification.`,
          date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : '2026-06-11',
          rawType: 'retailer'
        }));

      const mappedOnboarding = (onboardingData.success && Array.isArray(onboardingData.data) ? onboardingData.data : [])
        .map(u => ({
          id: u._id,
          requester: u.name,
          type: "User Onboarding",
          status: "Pending",
          details: `${u.roleName || u.role?.name} onboarding referred by ${u.promoted_by?.name || u.promoter_code_used || 'Unknown'}.`,
          date: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '2026-06-11',
          rawType: 'onboarding'
        }));

      setApprovals([...mappedOrders, ...mappedRetailers, ...mappedOnboarding]);
    }).catch(err => console.error("Error loading approvals:", err));
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  const handleActionClick = (req, action) => {
    setSelectedReq(req);
    setReqAction(action);
    setCommentVal('');
  };

  const handleConfirmActionSubmit = () => {
    const isApprove = reqAction === 'approve';
    let endpoint = '';
    let fetchMethod = 'POST';
    let payload = {};

    if (selectedReq.rawType === 'order') {
      endpoint = `/api/orders/${selectedReq.id}/${isApprove ? 'approve' : 'reject'}`;
      fetchMethod = 'POST';
      payload = { comment: commentVal };
    } else if (selectedReq.rawType === 'onboarding') {
      endpoint = `/api/onboarding/${selectedReq.id}/approve`;
      fetchMethod = 'POST';
      payload = { action: isApprove ? 'approve' : 'reject', rejection_reason: commentVal };
    } else {
      endpoint = `/api/retailers/${selectedReq.id}`;
      fetchMethod = 'PUT';
      payload = { is_verified: isApprove };
    }

    fetch(endpoint, {
      method: fetchMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(
            `Request has been ${isApprove ? 'Approved' : 'Rejected'} successfully.`,
            isApprove ? "success" : "error"
          );
          loadApprovals();
        } else {
          showToast(resData.message || "Operation failed.", "error");
        }
      })
      .catch(err => {
        console.error(err);
        showToast("Error connecting to database.", "error");
      })
      .finally(() => {
        setSelectedReq(null);
      });
  };

  const handleToggleWorkflowLevel = (moduleKey, levelKey) => {
    setWorkflowConfig({
      ...workflowConfig,
      [moduleKey]: {
        ...workflowConfig[moduleKey],
        [levelKey]: !workflowConfig[moduleKey][levelKey]
      }
    });
    showToast(`Toggled ${levelKey.toUpperCase()} Manager approval step in ${moduleKey} routing rules.`, "success");
  };

  // Filter queues
  const pendingRequests = approvals.filter(req => {
    const isPending = req.status === 'Pending';
    const matchesFilter = pendingFilter === 'All' || req.type === pendingFilter;
    return isPending && matchesFilter;
  });

  const historyRequests = approvals.filter(req => req.status !== 'Pending');

  const pendingColumns = [
    { header: "Request ID", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono text-[13px]">{val}</span> },
    { header: "Requester / Outlet", accessor: "requester", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Type Category", accessor: "type", render: (val) => <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase">{val}</span> },
    { header: "Details Summary", accessor: "details", render: (val) => <span className="text-xs text-slate-500 font-semibold">{val}</span> },
    { header: "Submitted Date", accessor: "date" },
    { header: "Action Options", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button 
          onClick={() => handleActionClick(row, 'approve')} 
          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5"
        >
          <CheckCircle className="w-3.5 h-3.5" /> Approve
        </button>
        <button 
          onClick={() => handleActionClick(row, 'reject')} 
          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
      </div>
    )}
  ];

  const historyColumns = [
    { header: "Request ID", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono text-[13px]">{val}</span> },
    { header: "Requester", accessor: "requester", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Type Category", accessor: "type" },
    { header: "Details Summary", accessor: "details" },
    { header: "Action Timestamp", accessor: "date" },
    { header: "Status Output", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
        {val}
      </span>
    )},
    { header: "Admin Remarks / Comments", accessor: "comment" }
  ];

  return (
    <div className="space-y-6">
      {/* Header and filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Approval Workflows</h1>
          <p className="text-sm text-slate-500">Inspect pending administrative authorizations, audit past overrides, and manage hierarchy routing protocols.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pending Inbox ({pendingRequests.length})
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'config' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Approval Flow Configs
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          History Ledger Logs ({historyRequests.length})
        </button>
      </div>

      {/* Pending inbox tab */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap gap-4 items-center justify-between text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-display">Authorizations Queue</h3>
              <p className="text-xs text-slate-400 font-semibold">Inspect credentials validation and payment margin approvals waiting for superadmin resolution.</p>
            </div>
            
            <div>
              <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Filter Request Type</label>
              <select 
                value={pendingFilter}
                onChange={(e) => setPendingFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
              >
                <option value="All">All Types</option>
                <option value="Retailer Registration">Retailer Registrations</option>
                <option value="Large Orders">Large Orders</option>
              </select>
            </div>
          </div>

          <DataTable 
            columns={pendingColumns} 
            data={pendingRequests} 
            searchKeys={["id", "requester", "details"]}
            searchPlaceholder="Search pending authorizations inbox..."
          />
        </div>
      )}

      {/* History inbox tab */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Authorizations Audit trail logs</h3>
            <p className="text-xs text-slate-400 font-semibold font-sans">Inspect historic actions taken across system overrides, pricing slabs, or retailer verifications.</p>
          </div>

          <DataTable 
            columns={historyColumns} 
            data={historyRequests} 
            searchKeys={["id", "requester", "comment"]}
            searchPlaceholder="Search history override logs..."
          />
        </div>
      )}

      {/* Workflow configs tab */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">Geographic Approval Routing Rules</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle hierarchy level checkpoints required for system actions.</p>
            </div>

            <div className="space-y-6">
              {/* Retailer Registrations */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-orange" /> Retailer Category Registrations</span>
                <div className="grid grid-cols-4 gap-3">
                  {['city', 'state', 'country', 'admin'].map(level => {
                    const isEnabled = workflowConfig.retailers[level];
                    return (
                      <button 
                        key={level}
                        onClick={() => handleToggleWorkflowLevel('retailers', level)}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${isEnabled ? 'bg-orange-50/50 border-brand-orange text-brand-orange font-bold' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        <span className="text-[10px] uppercase">{level}</span>
                        <span className="text-[8px] font-semibold">{isEnabled ? 'Enforced' : 'Skipped'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Large Orders */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-brand-orange" /> Large Wholesale Order Approvals (&gt; ₹50K)</span>
                <div className="grid grid-cols-4 gap-3">
                  {['city', 'state', 'country', 'admin'].map(level => {
                    const isEnabled = workflowConfig.orders[level];
                    return (
                      <button 
                        key={level}
                        onClick={() => handleToggleWorkflowLevel('orders', level)}
                        className={`p-3 border rounded-xl flex flex-col items-center gap-1 cursor-pointer transition-all ${isEnabled ? 'bg-orange-50/50 border-brand-orange text-brand-orange font-bold' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                      >
                        <span className="text-[10px] uppercase">{level}</span>
                        <span className="text-[8px] font-semibold">{isEnabled ? 'Enforced' : 'Skipped'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines info side panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2"><FileText className="w-4 h-4 text-brand-orange" /> Governance Routing Guidelines</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">In huddo-ERP, workflow layers are fully integrated with organizational hierarchies. If a layer is "Enforced", requests submitted within a jurisdiction must receive digital signature authorization from the corresponding manager level before escalating to next tier.</p>
              
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2 text-[11px] text-slate-600">
                <span className="font-bold text-slate-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-brand-orange" /> Admin Overwrite Rights</span>
                <p>Founder and Super Administrator profiles bypass regional flow restrictions and can approve or discard entries at any step.</p>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex gap-2 text-[10px] text-slate-500 font-semibold mt-4">
              <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p>Routing configurations are global parameters. Changes take effect on newly compiled validation structures immediately.</p>
            </div>
          </div>
        </div>
      )}

      {/* Approve/Reject comment dialog */}
      <Modal
        isOpen={selectedReq !== null}
        onClose={() => setSelectedReq(null)}
        title={`${reqAction === 'approve' ? 'Approve' : 'Reject'} Authorization Request`}
        onConfirm={handleConfirmActionSubmit}
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-slate-600 font-semibold">Please enter any override comments, remarks, or notes below to document in system log.</p>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Remarks / Remarks</label>
            <textarea 
              rows="3" 
              placeholder={`e.g., Checked details. Request ${reqAction === 'approve' ? 'approved' : 'rejected'} under verification checks...`}
              value={commentVal}
              onChange={(e) => setCommentVal(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none"
            />
          </div>
        </div>
      </Modal>

    </div>
  );
}
