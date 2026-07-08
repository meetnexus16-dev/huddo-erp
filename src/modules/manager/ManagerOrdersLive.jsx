import React, { useEffect, useState } from 'react';
import { Search, Loader2, Percent, Eye, Award, Info } from 'lucide-react';
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

// Statuses that mean the order is confirmed (approved) and commissions are earned.
const CONFIRMED_STATUSES = ['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'];

const STATUS_STYLES = {
  'Pending Approval': 'bg-amber-100 text-amber-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-blue-100 text-blue-700',
  Packed: 'bg-indigo-100 text-indigo-700',
  Shipped: 'bg-violet-100 text-violet-700',
  Delivered: 'bg-green-100 text-green-700',
  Cancelled: 'bg-rose-100 text-rose-700',
  Returned: 'bg-slate-200 text-slate-700'
};

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

export default function ManagerOrdersLive({ showToast, title = 'Orders', onPendingCountChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const loadOrders = () => {
    setLoading(true);
    authFetch('/network/orders')
      .then((res) => {
        if (res.success) {
          const mapped = (res.data || []).map((o) => {
            const confirmed = CONFIRMED_STATUSES.includes(o.status);
            return {
              ...o,
              displayStatus: STATUS_MAP[o.status] || o.status,
              confirmed,
              retailerName: o.retailer?.business_name || 'Retailer',
              id: o._id,
              orderRef: o.order_number || o._id
            };
          });
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
        <p className="text-sm text-slate-500">
          Live orders from your network. Order approval is handled by the Admin — this is a read-only view of your commissions.
        </p>
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

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Retailer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Total Points</th>
              <th className="px-4 py-3 text-right">Comm. %</th>
              <th className="px-4 py-3 text-right">Projected Commission</th>
              <th className="px-4 py-3 text-right">My Commission</th>
              <th className="px-4 py-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">No orders found.</td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order._id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{order.orderRef}</td>
                  <td className="px-4 py-3">{order.retailerName}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[order.displayStatus] || 'bg-slate-100 text-slate-700'}`}>
                      {order.displayStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{inr(order.grand_total || order.subtotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-slate-700 font-semibold">
                      <Award size={13} className="text-amber-500" />
                      {Number(order.projected_points || 0).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">
                    {Number(order.projected_percentage || 0)}%
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-indigo-600">
                    {inr(order.projected_commission)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.confirmed ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                        <Percent size={13} />
                        {inr(order.my_commission)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-slate-400" title="Credited once the order is confirmed by Admin">
                        {inr(0)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      className="inline-flex items-center gap-1 text-orange-600 font-bold text-xs hover:underline"
                    >
                      <Eye size={14} /> View
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
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Retailer</p>
                <p className="font-semibold text-slate-800">{selected.retailerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Status</p>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[selected.displayStatus] || 'bg-slate-100 text-slate-700'}`}>
                  {selected.displayStatus}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400">Placed On</p>
                <p className="font-semibold text-slate-800">{formatDate(selected.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Order Total</p>
                <p className="font-semibold text-slate-800">{inr(selected.grand_total || selected.subtotal)}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Items</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Product</th>
                      <th className="px-3 py-2">Variant</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Points</th>
                      <th className="px-3 py-2 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selected.items || []).map((item, idx) => {
                      const variant = item.product_variant || {};
                      const product = variant.product || {};
                      const pts = Number(product.franchise_points || 0) * Number(item.quantity || 0);
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-medium text-slate-700">{product.name || variant.sku_variant || '—'}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {variant.size || '—'}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">{pts.toLocaleString('en-IN')}</td>
                          <td className="px-3 py-2 text-right">{inr(item.total_price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-indigo-600 flex items-center gap-1">
                <Percent size={13} /> My Commission
              </h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-500">Total Points</p>
                  <p className="text-lg font-bold text-slate-800">{Number(selected.projected_points || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Commission %</p>
                  <p className="text-lg font-bold text-slate-800">{Number(selected.projected_percentage || 0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{selected.confirmed ? 'Earned' : 'Projected'}</p>
                  <p className={`text-lg font-bold ${selected.confirmed ? 'text-emerald-600' : 'text-indigo-600'}`}>
                    {inr(selected.confirmed ? selected.my_commission : selected.projected_commission)}
                  </p>
                </div>
              </div>

              {(selected.projected_commission_lines || []).length > 0 && (
                <div className="space-y-1 pt-2 border-t border-indigo-100">
                  {selected.projected_commission_lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-slate-600">
                      <span className="pr-2">{line.description}</span>
                      <span className="font-semibold whitespace-nowrap">{inr(line.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {!selected.confirmed && (
                <p className="text-xs text-slate-500 flex items-start gap-1 pt-1">
                  <Info size={13} className="mt-0.5 shrink-0" />
                  This commission is projected. It will be credited to you only after the Admin confirms (approves) this order.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
