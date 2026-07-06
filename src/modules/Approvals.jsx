import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { DataTable, Modal } from '../components/Common';

export default function Approvals({ showToast }) {
  const [approvals, setApprovals] = useState([]);
  const [pendingFilter, setPendingFilter] = useState('All');
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqAction, setReqAction] = useState('approve');
  const [commentVal, setCommentVal] = useState('');

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
        .map((u) => ({
          id: u._id,
          requester: u.name,
          type: 'User Onboarding',
          status: 'Pending',
          details: `${u.roleName || u.role?.name} referred by ${u.promoted_by?.name || u.promoter_code_used || 'Unknown'}.`,
          date: u.createdAt ? new Date(u.createdAt).toISOString().split('T')[0] : '—',
          rawType: 'onboarding'
        }));

      setApprovals([...mappedOrders, ...mappedOnboarding]);
    }).catch((err) => console.error('Error loading approvals:', err));
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
    let payload = {};

    if (selectedReq.rawType === 'order') {
      endpoint = `/api/orders/${selectedReq.id}/${isApprove ? 'approve' : 'reject'}`;
      payload = { remarks: commentVal || (isApprove ? 'Approved by admin' : 'Rejected by admin') };
    } else {
      endpoint = `/api/onboarding/${selectedReq.id}/approve`;
      payload = { action: isApprove ? 'approve' : 'reject', rejection_reason: commentVal };
    }

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          showToast(
            `Request has been ${isApprove ? 'approved' : 'rejected'} successfully.`,
            isApprove ? 'success' : 'error'
          );
          loadApprovals();
        } else {
          showToast(resData.message || 'Operation failed.', 'error');
        }
      })
      .catch((err) => {
        console.error(err);
        showToast('Error connecting to database.', 'error');
      })
      .finally(() => {
        setSelectedReq(null);
      });
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

      <Modal
        isOpen={selectedReq !== null}
        onClose={() => setSelectedReq(null)}
        title={`${reqAction === 'approve' ? 'Approve' : 'Reject'} Request`}
        onConfirm={handleConfirmActionSubmit}
      >
        <div className="space-y-3 text-left">
          <p className="text-xs text-slate-600">
            {selectedReq?.type}: <strong>{selectedReq?.requester}</strong>
          </p>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Remarks (optional for approve)</label>
            <textarea
              rows="3"
              placeholder="Add notes for the audit log..."
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
