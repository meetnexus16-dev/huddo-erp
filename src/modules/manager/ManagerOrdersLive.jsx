import React, { useEffect, useState } from 'react';
import { ShoppingCart, Search, CheckCircle, XCircle, Loader2, Percent } from 'lucide-react';
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

const STATUS_MAP = {
  Submitted: 'Pending Approval',
  Draft: 'Pending Approval',
  Approved: 'Approved',
  Processing: 'Processing',
  Packed: 'Packed',
  Shipped: 'Shipped',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
  Returned: 'Returned'
};

export default function ManagerOrdersLive({ showToast, title = 'Orders', onPendingCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [commissionModal, setCommissionModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrders = () => {
    setLoading(true);
    authFetch('/network/orders')
      .then((res) => {
        if (res.success) {
          const mapped = (res.data || []).map((o) => ({
            ...o,
            displayStatus: STATUS_MAP[o.status] || o.status,
            retailerName: o.retailer?.business_name || 'Retailer',
            id: o._id,
            orderRef: o.order_number || o._id
          }));
          setOrders(mapped);
          onPendingCountChange?.(
            mapped.filter((o) => o.status === 'Submitted' || o.status === 'Draft').length
          );
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filtered = orders.filter((o) => {
    const matchStatus =
      statusFilter === 'All' ||
      o.displayStatus === statusFilter ||
      (statusFilter === 'Pending Approval' && (o.status === 'Submitted' || o.status === 'Draft'));
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      o.orderRef?.toLowerCase().includes(q) ||
      o.retailerName?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleApprove = async (order) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/orders/${order._id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remarks: 'Approved from manager panel' })
      });
      if (res.success) {
        showToast?.('Order approved.', 'success');
        loadOrders();
        setSelected(null);
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
        showToast?.('Order rejected.', 'success');
        loadOrders();
        setSelected(null);
        setRejectReason('');
      } else {
        showToast?.(res.message || 'Rejection failed.', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const statuses = ['All', 'Pending Approval', 'Approved', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <Loader2 className="animate-spin" size={20} /> Loading orders...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500">Live orders from your network with commission earned per order.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order or retailer..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Retailer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">My Commission</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">No orders found.</td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{order.orderRef}</td>
                  <td className="px-4 py-3">{order.retailerName}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                      {order.displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">₹{Number(order.grand_total || order.subtotal || 0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setCommissionModal(order)}
                      className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Percent size={14} />
                      ₹{Number(order.my_commission || 0).toFixed(2)}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setSelected(order)} className="text-orange-600 font-bold text-xs hover:underline">
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.orderRef || ''}`}>
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <strong>Retailer:</strong> {selected.retailerName} · <strong>Status:</strong> {selected.displayStatus}
            </p>
            <p className="text-sm text-slate-600">
              <strong>Total:</strong> ₹{Number(selected.grand_total || selected.subtotal || 0).toLocaleString('en-IN')}
            </p>
            {(selected.status === 'Submitted' || selected.status === 'Draft' || selected.displayStatus === 'Pending Approval') && (
              <div className="space-y-3 border-t pt-4">
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
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm"
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReject(selected)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-rose-600 text-white rounded-lg font-bold text-sm"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={!!commissionModal} onClose={() => setCommissionModal(null)} title="Commission Breakdown">
        {commissionModal && (
          <div className="space-y-2">
            {(commissionModal.commission_details || []).length === 0 ? (
              <p className="text-sm text-slate-500">No commission records yet. Commissions are created when the order is approved.</p>
            ) : (
              commissionModal.commission_details.map((row, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg text-sm">
                  <p className="font-bold">{row.commission_type} — ₹{Number(row.amount || 0).toFixed(2)}</p>
                  <p className="text-slate-600 mt-1">{row.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
