import React, { useEffect, useState } from 'react';
import { CheckSquare, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { Modal } from '../../components/Common';

function authFetch(path, options = {}) {
  const token = localStorage.getItem('huddo_token');
  return fetch(`/api${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  }).then((r) => r.json());
}

const PENDING_STATUSES = ['Submitted', 'Draft'];

export default function ManagerApprovalsLive({ showToast, title = 'Approvals Queue', onPendingCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const loadPending = () => {
    setLoading(true);
    authFetch('/network/orders')
      .then((res) => {
        if (res.success) {
          const pending = (res.data || []).filter((o) => PENDING_STATUSES.includes(o.status));
          setOrders(
            pending.map((o) => ({
              ...o,
              retailerName: o.retailer?.business_name || 'Retailer',
              orderRef: o.order_number || o._id
            }))
          );
          onPendingCountChange?.(pending.length);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (order) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/orders/${order._id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remarks: 'Approved from approvals queue' })
      });
      if (res.success) {
        showToast?.(`Order ${order.orderRef} approved.`, 'success');
        setHistory((prev) => [{
          id: order._id,
          label: order.orderRef,
          decision: 'Approved',
          date: new Date().toLocaleDateString()
        }, ...prev]);
        setSelected(null);
        loadPending();
      } else {
        showToast?.(res.message || 'Approval failed.', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (order) => {
    if (!rejectReason.trim()) {
      showToast?.('Rejection reason is required.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await authFetch(`/orders/${order._id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ remarks: rejectReason })
      });
      if (res.success) {
        showToast?.(`Order ${order.orderRef} rejected.`, 'error');
        setHistory((prev) => [{
          id: order._id,
          label: order.orderRef,
          decision: 'Rejected',
          date: new Date().toLocaleDateString(),
          reason: rejectReason
        }, ...prev]);
        setSelected(null);
        setRejectReason('');
        loadPending();
      } else {
        showToast?.(res.message || 'Rejection failed.', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> Loading approval queue...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">Review and action submitted orders from retailers in your network.</p>
      </div>

      {orders.length > 0 ? (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-sm text-amber-800">
          <AlertCircle size={18} />
          <span><strong>{orders.length}</strong> order(s) awaiting your approval.</span>
        </div>
      ) : (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle size={18} />
          <span>No pending order approvals. Queue is clear.</span>
        </div>
      )}

      <div className="grid gap-4">
        {orders.map((order) => (
          <div key={order._id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono font-bold text-slate-900">{order.orderRef}</p>
              <p className="text-sm text-slate-600 mt-1">{order.retailerName}</p>
              <p className="text-sm font-semibold text-orange-600 mt-1">
                ₹{Number(order.grand_total || order.subtotal || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(order)}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600"
            >
              Review
            </button>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <CheckSquare size={16} /> Recent Actions (this session)
          </h3>
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={`${h.id}-${h.decision}`} className="flex justify-between border-b border-slate-50 pb-2">
                <span>{h.label} — <span className={h.decision === 'Approved' ? 'text-emerald-600' : 'text-rose-600'}>{h.decision}</span></span>
                <span className="text-slate-400">{h.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Review ${selected?.orderRef || ''}`}>
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600"><strong>Retailer:</strong> {selected.retailerName}</p>
            <p className="text-sm text-slate-600"><strong>Amount:</strong> ₹{Number(selected.grand_total || selected.subtotal || 0).toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-500">Country Manager approval marks the order as fully approved and calculates commissions.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Rejection reason (required to reject)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApprove(selected)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleReject(selected)}
                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 bg-rose-600 text-white rounded-lg font-bold text-sm"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
