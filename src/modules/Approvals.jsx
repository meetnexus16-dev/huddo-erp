import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';
import OnboardingApplicationDetailModal from '../components/OnboardingApplicationDetailModal';
import { useConfirm } from '../context/ConfirmContext';
import { confirmGeoCreation, fetchGeoCreationPreview, formatGeoPreviewMessage } from '../utils/geoPreview';

function findApprovalRow(approvals, application) {
  if (!application?._id) return null;
  return approvals.find((row) => row.id === application._id) || null;
}

export default function Approvals({ showToast }) {
  const { confirm } = useConfirm();
  const [approvals, setApprovals] = useState([]);
  const [pendingFilter, setPendingFilter] = useState('All');
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqAction, setReqAction] = useState('approve');
  const [commentVal, setCommentVal] = useState('');
  const [geoPreview, setGeoPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewApplication, setViewApplication] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadApprovals = () => {
    Promise.all([
      fetch('/api/orders').then((res) => res.json()),
      fetch('/api/onboarding/pending').then((res) => res.json())
    ]).then(([ordersData, onboardingData]) => {
      const mappedOrders = (ordersData.success && Array.isArray(ordersData.data) ? ordersData.data : [])
        .filter((o) => o.status === 'Submitted' || o.status === 'Draft')
        .map((o) => ({
          id: o._id,
          requester: o.retailer?.business_name || 'Unknown Retailer',
          type: 'Order Approval',
          status: 'Pending',
          details: `Order ${o.order_number || o._id} — ₹${o.subtotal || o.grand_total || 0} awaiting approval.`,
          date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '—',
          rawType: 'order'
        }));

      const mappedOnboarding = (onboardingData.success && Array.isArray(onboardingData.data) ? onboardingData.data : [])
        .map((u) => {
          const meta = u.onboarding_meta || {};
          const territory = [
            meta.requested_country?.name || meta.requested_country_name,
            meta.requested_state?.name || meta.requested_state_name,
            meta.requested_city?.name || meta.requested_city_name
          ].filter(Boolean).join(' → ');

          const sourceLabel = u.onboarding_source === 'referral'
            ? 'referral'
            : u.onboarding_source === 'self'
              ? 'self-registration'
              : 'admin submission';
          const referrerText = u.promoted_by?.name || u.promoter_code_used;
          const referrerPart = referrerText ? ` referred by ${referrerText}` : ` (${sourceLabel})`;

          return {
            id: u._id,
            requester: u.name,
            type: 'User Onboarding',
            status: 'Pending',
            details: `${u.roleName || u.role?.name}${referrerPart}${territory ? `. Territory: ${territory}` : ''}.`,
            date: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '—',
            rawType: 'onboarding',
            roleName: u.roleName || u.role?.name,
            onboardingMeta: meta,
            applicationData: u
          };
        });

      setApprovals([...mappedOrders, ...mappedOnboarding]);
    }).catch((err) => console.error('Error loading approvals:', err));
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    if (!selectedReq || selectedReq.rawType !== 'onboarding' || reqAction !== 'approve') {
      setGeoPreview(null);
      return;
    }

    const meta = selectedReq.onboardingMeta || {};
    setPreviewLoading(true);
    fetchGeoCreationPreview(selectedReq.roleName, {
      country_name: meta.requested_country?.name || meta.requested_country_name,
      state_name: meta.requested_state?.name || meta.requested_state_name,
      city_name: meta.requested_city?.name || meta.requested_city_name
    })
      .then((preview) => setGeoPreview(preview))
      .catch(() => setGeoPreview(null))
      .finally(() => setPreviewLoading(false));
  }, [selectedReq, reqAction]);

  const submitAction = useCallback(async (row, action, remarks = '') => {
    const isApprove = action === 'approve';
    let endpoint = '';
    let payload = {};

    if (row.rawType === 'order') {
      endpoint = `/api/orders/${row.id}/${isApprove ? 'approve' : 'reject'}`;
      payload = { remarks: remarks || (isApprove ? 'Approved by admin' : 'Rejected by admin') };
    } else {
      endpoint = `/api/onboarding/${row.id}/approve`;
      payload = { action: isApprove ? 'approve' : 'reject', rejection_reason: remarks };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resData = await res.json();

    if (resData.success) {
      showToast(
        resData.message || `Request has been ${isApprove ? 'approved' : 'rejected'} successfully.`,
        isApprove ? 'success' : 'error'
      );
      loadApprovals();
      return true;
    }

    showToast(resData.message || 'Operation failed.', 'error');
    return false;
  }, [showToast]);

  const runOnboardingApprove = useCallback(async (row) => {
    const meta = row.onboardingMeta || {};
    let preview = null;
    try {
      preview = await fetchGeoCreationPreview(row.roleName, {
        country_name: meta.requested_country?.name || meta.requested_country_name,
        state_name: meta.requested_state?.name || meta.requested_state_name,
        city_name: meta.requested_city?.name || meta.requested_city_name
      });
    } catch {
      preview = null;
    }

    const geoOk = await confirmGeoCreation(preview, confirm);
    if (!geoOk) return false;

    setActionLoading(true);
    try {
      return await submitAction(row, 'approve', '');
    } finally {
      setActionLoading(false);
    }
  }, [confirm, submitAction]);

  const handleActionClick = async (req, action) => {
    const isApprove = action === 'approve';
    const name = req.requester || 'this request';

    const confirmed = await confirm({
      title: isApprove ? 'Approve request?' : 'Reject request?',
      message: isApprove
        ? `Are you sure you want to approve ${name}?`
        : `Are you sure you want to reject ${name}?`,
      confirmText: isApprove ? 'Approve' : 'Reject',
      isDestructive: !isApprove
    });

    if (!confirmed) return;

    if (isApprove && req.rawType === 'onboarding') {
      const ok = await runOnboardingApprove(req);
      if (ok) setViewApplication(null);
      return;
    }

    if (isApprove && req.rawType === 'order') {
      setActionLoading(true);
      try {
        const ok = await submitAction(req, 'approve', '');
        if (ok) setViewApplication(null);
      } finally {
        setActionLoading(false);
      }
      return;
    }

    setSelectedReq(req);
    setReqAction(action);
    setCommentVal('');
    setGeoPreview(null);
  };

  const handleDetailApprove = async () => {
    const row = findApprovalRow(approvals, viewApplication);
    if (!row) return;

    const confirmed = await confirm({
      title: 'Approve application?',
      message: `Are you sure you want to approve ${viewApplication.name}?`,
      confirmText: 'Approve'
    });
    if (!confirmed) return;

    const ok = await runOnboardingApprove(row);
    if (ok) setViewApplication(null);
  };

  const handleDetailReject = async () => {
    const row = findApprovalRow(approvals, viewApplication);
    if (!row) return;

    const confirmed = await confirm({
      title: 'Reject application?',
      message: `Are you sure you want to reject ${viewApplication.name}? You can add a reason in the next step.`,
      confirmText: 'Continue',
      isDestructive: true
    });
    if (!confirmed) return;

    setSelectedReq(row);
    setReqAction('reject');
    setCommentVal('');
    setViewApplication(null);
  };

  const handleConfirmActionSubmit = async () => {
    const isApprove = reqAction === 'approve';

    if (isApprove && selectedReq?.rawType === 'onboarding') {
      const ok = await runOnboardingApprove(selectedReq);
      if (ok) {
        setSelectedReq(null);
        setGeoPreview(null);
      }
      return;
    }

    setActionLoading(true);
    try {
      const ok = await submitAction(selectedReq, reqAction, commentVal);
      if (ok) {
        setSelectedReq(null);
        setGeoPreview(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = approvals.filter((req) => {
    const isPending = req.status === 'Pending';
    const matchesFilter = pendingFilter === 'All' || req.type === pendingFilter;
    return isPending && matchesFilter;
  });

  const pendingColumns = [
    { header: 'Request ID', accessor: 'id', render: (val) => <span className="font-bold text-slate-800 font-mono text-[13px]">{val}</span> },
    { header: 'Requester', accessor: 'requester', render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: 'Type', accessor: 'type', render: (val) => <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase">{val}</span> },
    { header: 'Details', accessor: 'details', render: (val) => <span className="text-xs text-slate-500">{val}</span> },
    { header: 'Submitted', accessor: 'date' },
    {
      header: 'Actions',
      accessor: 'id',
      sortable: false,
      render: (val, row) => (
        <div className="flex gap-2 items-center">
          {row.rawType === 'onboarding' && (
            <button
              type="button"
              onClick={() => setViewApplication(row.applicationData)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors"
              title="View application details"
              aria-label={`View details for ${row.requester}`}
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleActionClick(row, 'approve')}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-60"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            onClick={() => handleActionClick(row, 'reject')}
            disabled={actionLoading}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold flex items-center gap-0.5 disabled:opacity-60"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-500">Single-step admin approval for user onboarding and submitted orders. No multi-level approval chain.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Pending Queue ({pendingRequests.length})</h3>
            <p className="text-xs text-slate-400">User onboarding and order approvals awaiting admin action.</p>
          </div>
          <select
            value={pendingFilter}
            onChange={(e) => setPendingFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none"
          >
            <option value="All">All Types</option>
            <option value="User Onboarding">User Onboarding</option>
            <option value="Order Approval">Orders</option>
          </select>
        </div>

        <DataTable
          columns={pendingColumns}
          data={pendingRequests}
          searchKeys={['id', 'requester', 'details']}
          searchPlaceholder="Search pending approvals..."
        />
      </div>

      <OnboardingApplicationDetailModal
        isOpen={!!viewApplication}
        onClose={() => setViewApplication(null)}
        application={viewApplication}
        title="Onboarding Application Details"
        showAdminActions
        onApprove={handleDetailApprove}
        onReject={handleDetailReject}
        actionLoading={actionLoading}
      />

      <Modal
        isOpen={selectedReq !== null}
        onClose={() => setSelectedReq(null)}
        title={`${reqAction === 'approve' ? 'Approve' : 'Reject'} Request`}
        onConfirm={handleConfirmActionSubmit}
        confirmText={reqAction === 'approve' ? 'Approve' : 'Reject'}
        isDestructive={reqAction === 'reject'}
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-slate-600">
            {selectedReq?.type}: <strong>{selectedReq?.requester}</strong>
          </p>

          {reqAction === 'approve' && selectedReq?.rawType === 'onboarding' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {previewLoading && <p>Checking territory...</p>}
              {!previewLoading && geoPreview?.requires_confirmation && (
                <pre className="whitespace-pre-wrap font-sans">{formatGeoPreviewMessage(geoPreview)}</pre>
              )}
              {!previewLoading && geoPreview && !geoPreview.requires_confirmation && (
                <p>All selected locations already exist in the system. Territory: {geoPreview.territory_label}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {reqAction === 'reject' ? 'Rejection reason' : 'Remarks (optional)'}
            </label>
            <textarea
              rows="3"
              placeholder={reqAction === 'reject' ? 'Provide a reason for rejection...' : 'Add notes for the audit log...'}
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
