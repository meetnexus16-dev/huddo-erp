import React, { useState } from 'react';
import { ShoppingCart, FileText, CheckCircle2, AlertTriangle, Eye, HelpCircle, X, Settings, RefreshCw } from 'lucide-react';
import { initialOrders, initialWorkflowConfig } from '../mockData';
import { DataTable, Modal } from '../components/Common';

// Format a date value as e.g. "08 Jul 2026, 3:14 PM"
const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  });
};

export default function Orders({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [workflowConfig, setWorkflowConfig] = useState(initialWorkflowConfig);

  React.useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(resData => {
        if (resData.success && Array.isArray(resData.data)) {
          const mapped = resData.data.map(o => {
            const cityName = o.retailer?.city?.name || '';
            const stateName = o.retailer?.state?.name || o.retailer?.city?.state?.name || '';
            const countryName = o.retailer?.state?.country?.name
              || o.retailer?.city?.state?.country?.name || '';
            const locationParts = [cityName, stateName, countryName].filter(Boolean);
            return {
            id: o.order_number || o._id,
            mongoId: o._id,
            retailerName: o.retailer?.business_name || 'Walk Easy Footwear',
            city: cityName || '—',
            state: stateName || '—',
            country: countryName || '—',
            location: locationParts.length ? locationParts.join(', ') : '—',
            retailerInfo: {
              businessName: o.retailer?.business_name || '—',
              ownerName: o.retailer?.owner_name || '—',
              mobile: o.retailer?.mobile || '—',
              email: o.retailer?.email || '—',
              address: o.retailer?.shop_address || '—',
              gst: o.retailer?.gst_number || '—',
              pan: o.retailer?.pan_number || '—',
              category: o.retailer?.category || '—',
              creditAmount: o.retailer?.credit_limit?.amount || 0,
              creditEnabled: o.retailer?.credit_limit?.is_enabled || false,
              verified: o.retailer?.is_verified || false,
              city: cityName || '—',
              state: stateName || '—',
              country: countryName || '—'
            },
            productsCount: o.items?.length || 0,
            amount: o.subtotal,
            paymentStatus: o.payment_status || 'Pending',
            utrNo: o.utr_number || '',
            date: o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '2026-06-08',
            createdAt: o.createdAt,
            status: o.status || 'Submitted',
            history: Array.isArray(o.status_history) && o.status_history.length > 0
              ? o.status_history.map(h => ({
                  status: h.status,
                  at: h.changed_at,
                  note: h.note || '',
                  by: h.changed_by?.name || ''
                }))
              : [{ status: o.status || 'Submitted', at: o.createdAt, note: 'Order created', by: '' }],
            items: o.items?.map(item => ({
              name: item.product_variant?.product?.name || 'Huddo Air Classic',
              size: item.product_variant?.size || '9',
              color: item.product_variant?.color || 'Red',
              qty: item.quantity,
              price: item.unit_price
            })) || [],
            workflow: {
              cityApproved: o.status === 'Approved' || o.status === 'Processing' || o.status === 'Delivered',
              stateApproved: o.status === 'Approved' || o.status === 'Processing' || o.status === 'Delivered',
              countryApproved: o.status === 'Approved' || o.status === 'Delivered',
              adminApproved: o.status === 'Approved' || o.status === 'Delivered'
            },
            proofImage: o.payment_screenshot || ''
          };
          });
          setOrders(mapped);
        } else {
          setOrders(initialOrders);
        }
      })
      .catch(err => {
        console.error("Error loading orders:", err);
        setOrders(initialOrders);
      });
  }, []);
  const [activeTab, setActiveTab] = useState('All'); // Status tab filtering
  const [activeSubView, setActiveSubView] = useState('orders'); // orders | config

  // Modals / Details view
  const [viewingOrder, setViewingOrder] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details'); // details | history
  const [showRetailerInfo, setShowRetailerInfo] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [verifyUtrVal, setVerifyUtrVal] = useState('');

  // Save workflow toggles
  const handleToggleWorkflow = (key) => {
    const updated = {
      ...workflowConfig,
      orders: {
        ...workflowConfig.orders,
        [key]: !workflowConfig.orders[key]
      }
    };
    setWorkflowConfig(updated);
    showToast(`Workflow level "${key.toUpperCase()} Manager Approval" toggled.`, "success");
  };

  const handleApproveOrder = async () => {
    if (!viewingOrder) return;
    const orderMongoId = viewingOrder.mongoId;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderMongoId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || "Failed to approve order.", "error");
        return;
      }
      setOrders(orders.map(o => (
        o.mongoId === orderMongoId
          ? { ...o, status: "Approved", paymentStatus: "Verified" }
          : o
      )));
      showToast(`Order ${viewingOrder.id} approved.`, "success");
      setIsApproveOpen(false);
      setViewingOrder(null);
    } catch (err) {
      console.error("Failed to approve order:", err);
      showToast("Error approving order.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      showToast("Please specify rejection reason.", "error");
      return;
    }
    const orderMongoId = viewingOrder.mongoId;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderMongoId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remarks: rejectReason })
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || "Failed to reject order.", "error");
        return;
      }
      setOrders(orders.map(o => (
        o.mongoId === orderMongoId
          ? { ...o, status: "Cancelled", paymentStatus: "Failed" }
          : o
      )));
      showToast(`Order ${viewingOrder.id} rejected.`, "success");
      setIsRejectOpen(false);
      setViewingOrder(null);
      setRejectReason('');
    } catch (err) {
      console.error("Failed to reject order:", err);
      showToast("Error rejecting order.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const mapHistory = (o) => (
    Array.isArray(o.status_history) && o.status_history.length > 0
      ? o.status_history.map(h => ({ status: h.status, at: h.changed_at, note: h.note || '', by: h.changed_by?.name || '' }))
      : []
  );

  const handleUpdateStatus = async (order, newStatus) => {
    const orderMongoId = order.mongoId;
    try {
      const res = await fetch(`/api/orders/${orderMongoId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.message || "Failed to update status.", "error");
        return;
      }
      const newHistory = mapHistory(data.data);
      setOrders(orders.map(o => (
        o.mongoId === orderMongoId
          ? { ...o, status: newStatus, history: newHistory.length ? newHistory : o.history }
          : o
      )));
      setViewingOrder(prev => (
        prev && prev.mongoId === orderMongoId
          ? { ...prev, status: newStatus, history: newHistory.length ? newHistory : prev.history }
          : prev
      ));
      showToast(`Order ${order.id} status updated to ${newStatus}.`, "success");
    } catch (err) {
      console.error("Failed to update status:", err);
      showToast("Error updating status.", "error");
    }
  };
  // Filter orders
  const filteredOrders = orders.filter(ord => {
    if (activeTab === 'All') return true;
    return ord.status === activeTab;
  });

  const columns = [
    { header: "Order ID", accessor: "id", render: (val) => <span className="font-bold text-slate-800 font-mono text-[13px]">{val}</span> },
    { header: "Retailer Name", accessor: "retailerName", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "City", accessor: "city" },
    { header: "Products", accessor: "productsCount", render: (val) => <span>{val} items</span> },
    { header: "Amount (₹)", accessor: "amount", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> },
    { header: "UTR Number", accessor: "utrNo", render: (val) => val ? <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-bold text-slate-600">{val}</code> : <span className="text-slate-400 font-medium italic">N/A</span> },
    { header: "Order Date", accessor: "date" },
    { header: "Payment Status", accessor: "paymentStatus", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
        val === 'Verified' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
        val === 'Pending Verification' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
        'bg-rose-100 text-rose-800 border border-rose-200'
      }`}>
        {val}
      </span>
    )},
    { header: "Current Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
        val === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
        val === 'Shipped' ? 'bg-blue-100 text-blue-800' :
        val === 'Approved' ? 'bg-orange-100 text-orange-800' :
        val === 'Submitted' ? 'bg-amber-100 text-amber-800' :
        'bg-slate-100 text-slate-700'
      }`}>
        {val}
      </span>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button 
        onClick={() => { setViewingOrder(row); setVerifyUtrVal(row.utrNo); setShowRetailerInfo(false); setDrawerTab('details'); }}
        className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded hover:bg-slate-200 transition-colors flex items-center gap-1"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Inspect</span>
      </button>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Order Operations</h1>
          <p className="text-sm text-slate-500">Approve distributor orders, match UTR transaction proof screenshots, and modify verification workflows.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSubView(activeSubView === 'orders' ? 'config' : 'orders')}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-semibold text-slate-700 bg-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{activeSubView === 'orders' ? 'Workflow Config' : 'View Orders Queue'}</span>
          </button>
        </div>
      </div>

      {activeSubView === 'orders' ? (
        <>
          {/* Status Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
            {['All', 'Submitted', 'Approved', 'Processing', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Table */}
          <DataTable 
            columns={columns} 
            data={filteredOrders}
            searchKeys={["id", "retailerName", "city", "utrNo"]}
            searchPlaceholder="Search order logs by ID, shop or UTR code..."
          />
        </>
      ) : (
        /* Workflow Config module */
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">Multi-level Workflow Approvals Grid</h3>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Toggle checking gates ON/OFF. Disabling levels allows orders to bypass those manager queues automatically.</p>
          </div>

          <div className="divide-y divide-slate-100">
            {/* City Level */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Level 1: City Manager Routing Check</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Requires immediate city manager authorization before routing details reach state levels.</p>
              </div>
              <button 
                onClick={() => handleToggleWorkflow('city')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${workflowConfig.orders.city ? 'bg-brand-orange' : 'bg-slate-300'}`}
              >
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${workflowConfig.orders.city ? 'translate-x-6' : ''}`}></span>
              </button>
            </div>

            {/* State Level */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Level 2: State Manager Routing Check</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Requires state manager review for credit limits matching and stock verification.</p>
              </div>
              <button 
                onClick={() => handleToggleWorkflow('state')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${workflowConfig.orders.state ? 'bg-brand-orange' : 'bg-slate-300'}`}
              >
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${workflowConfig.orders.state ? 'translate-x-6' : ''}`}></span>
              </button>
            </div>

            {/* Country Level */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Level 3: Country Manager Routing Check</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Applies globally across regional boundaries. Typically targets orders over ₹1L.</p>
              </div>
              <button 
                onClick={() => handleToggleWorkflow('country')}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${workflowConfig.orders.country ? 'bg-brand-orange' : 'bg-slate-300'}`}
              >
                <span className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${workflowConfig.orders.country ? 'translate-x-6' : ''}`}></span>
              </button>
            </div>

            {/* Admin Level */}
            <div className="py-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 font-display">Level 4: Founder / Corporate Admin Audit</h4>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Final gateway. Standard verification node override is permanently enabled.</p>
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 px-2.5 py-1 rounded">Always Enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Order detailed modal sheet */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Order Inspection: {viewingOrder.id}</h3>
                <p className="text-xs text-slate-500">Submitted on: {viewingOrder.date} • Current Status: <strong>{viewingOrder.status}</strong></p>
              </div>
              <button onClick={() => { setViewingOrder(null); setShowRetailerInfo(false); }} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer tabs */}
            <div className="flex border-b border-slate-100 px-6 bg-white">
              {[
                { key: 'details', label: 'Details' },
                { key: 'history', label: 'History Log' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setDrawerTab(tab.key)}
                  className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                    drawerTab === tab.key
                      ? 'border-brand-orange text-brand-orange'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
             {drawerTab === 'details' && (
              <>
              {/* Order lifecycle timeline: from placed to delivered */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Order Timeline</h4>
                {viewingOrder.status === 'Cancelled' ? (
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center">✕</span>
                    <span>This order was cancelled.</span>
                  </div>
                ) : (() => {
                  const stages = [
                    { key: 'Submitted', label: 'Placed' },
                    { key: 'Approved', label: 'Approved' },
                    { key: 'Processing', label: 'Processing' },
                    { key: 'Packed', label: 'Packed' },
                    { key: 'Shipped', label: 'Shipped' },
                    { key: 'Delivered', label: 'Delivered' }
                  ];
                  const currentIdx = stages.findIndex(s => s.key === viewingOrder.status);
                  return (
                    <div className="flex items-center justify-between">
                      {stages.map((stage, idx) => {
                        const done = currentIdx >= idx && currentIdx !== -1;
                        return (
                          <React.Fragment key={stage.key}>
                            <div className="flex flex-col items-center">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {done ? '✓' : idx + 1}
                              </span>
                              <span className={`text-[9px] font-bold mt-1 ${done ? 'text-slate-700' : 'text-slate-400'}`}>{stage.label}</span>
                            </div>
                            {idx < stages.length - 1 && (
                              <div className={`h-0.5 flex-1 -mt-4 ${currentIdx > idx ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Retailer Card & Bank info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs relative">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Retailer Outlet</h4>
                  <button
                    type="button"
                    onClick={() => setShowRetailerInfo(v => !v)}
                    className="font-bold text-slate-800 text-sm font-display text-left hover:text-brand-orange transition-colors underline decoration-dotted underline-offset-2 cursor-pointer"
                    title="Click to view full retailer details"
                  >
                    {viewingOrder.retailerName}
                  </button>
                  <p className="text-slate-500 mt-1">Location: {viewingOrder.location}</p>
                  <div className="mt-1 space-y-0.5 text-slate-500">
                    <p>City: <span className="font-semibold text-slate-700">{viewingOrder.city}</span></p>
                    <p>State: <span className="font-semibold text-slate-700">{viewingOrder.state}</span></p>
                    <p>Country: <span className="font-semibold text-slate-700">{viewingOrder.country}</span></p>
                  </div>

                  {/* Retailer full-details popover */}
                  {showRetailerInfo && viewingOrder.retailerInfo && (
                    <div className="absolute z-20 top-10 left-4 right-4 sm:left-4 sm:right-auto sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 text-xs animate-fade-in">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-slate-900 text-sm font-display">{viewingOrder.retailerInfo.businessName}</p>
                          <p className="text-slate-500">{viewingOrder.retailerInfo.ownerName}</p>
                        </div>
                        <button onClick={() => setShowRetailerInfo(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{viewingOrder.retailerInfo.category}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${viewingOrder.retailerInfo.verified ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                          {viewingOrder.retailerInfo.verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">Mobile</span><span className="font-semibold text-slate-800 text-right">{viewingOrder.retailerInfo.mobile}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">Email</span><span className="font-semibold text-slate-800 text-right break-all">{viewingOrder.retailerInfo.email}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">GST</span><span className="font-semibold text-slate-800 text-right">{viewingOrder.retailerInfo.gst}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">PAN</span><span className="font-semibold text-slate-800 text-right">{viewingOrder.retailerInfo.pan}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">Location</span><span className="font-semibold text-slate-800 text-right">{[viewingOrder.retailerInfo.city, viewingOrder.retailerInfo.state, viewingOrder.retailerInfo.country].filter(x => x && x !== '—').join(', ') || '—'}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">Address</span><span className="font-semibold text-slate-800 text-right">{viewingOrder.retailerInfo.address}</span></div>
                        <div className="flex justify-between gap-3"><span className="text-slate-400 font-semibold">Credit Limit</span><span className="font-semibold text-slate-800 text-right">{viewingOrder.retailerInfo.creditEnabled ? `₹${Number(viewingOrder.retailerInfo.creditAmount).toLocaleString('en-IN')}` : 'Disabled'}</span></div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Bank Ledger Match</h4>
                  <p className="font-semibold text-slate-700">UTR: {viewingOrder.utrNo || "Pending Cheque"}</p>
                  <p className="text-slate-500 mt-1">Verified status: <strong>{viewingOrder.paymentStatus}</strong></p>
                </div>
              </div>

              {/* Order items table list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Ordered Items Matrix</h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5">Product Model</th>
                        <th className="px-4 py-2.5">Size/Color</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5 text-right">Unit MRP</th>
                        <th className="px-4 py-2.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingOrder.items ? viewingOrder.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 text-slate-900 font-bold">{item.name}</td>
                          <td className="px-4 py-2.5 text-slate-400">UK {item.size} / {item.color}</td>
                          <td className="px-4 py-2.5 text-slate-700 font-bold">{item.qty} pairs</td>
                          <td className="px-4 py-2.5 text-right">₹{item.price.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{(item.qty * item.price).toLocaleString('en-IN')}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="5" className="px-4 py-6 text-center text-slate-400">Loading item breakdown...</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50 font-bold text-slate-900 text-sm">
                        <td colSpan="4" className="px-4 py-3 text-right">Total Net Amount:</td>
                        <td className="px-4 py-3 text-right text-brand-orange">₹{viewingOrder.amount.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment screenshot preview */}
              {viewingOrder.proofImage ? (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Transaction Proof Screenshot</h4>
                  <img src={viewingOrder.proofImage} alt="Payment Receipt Screenshot" className="w-full h-44 object-cover border border-slate-200 rounded-lg" />
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center py-6">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xs text-slate-500">No deposit/payment proof screenshot uploaded yet. Waiting for retailer submission.</p>
                </div>
              )}

              {/* Pipeline transitions controller: only after order is approved AND payment verified */}
              {viewingOrder.paymentStatus === 'Verified'
                && ['Approved', 'Processing', 'Packed', 'Shipped'].includes(viewingOrder.status) && (
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Transition Order Status Pipeline</h4>
                  <div className="flex gap-2 flex-wrap">
                    {['Processing', 'Packed', 'Shipped', 'Delivered'].map(st => (
                      <button 
                        key={st}
                        onClick={() => handleUpdateStatus(viewingOrder, st)}
                        className={`px-3 py-1.5 text-xs font-bold border rounded transition-colors ${
                          viewingOrder.status === st 
                            ? 'bg-brand-orange text-white border-brand-orange' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Set: {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              </>
             )}

             {drawerTab === 'history' && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase">Order History Log</h4>
                {Array.isArray(viewingOrder.history) && viewingOrder.history.length > 0 ? (
                  <ol className="relative border-l border-slate-200 ml-1.5 space-y-4">
                    {[...viewingOrder.history]
                      .sort((a, b) => new Date(a.at) - new Date(b.at))
                      .map((h, idx) => (
                      <li key={idx} className="ml-4">
                        <span className={`absolute -left-[5px] w-2.5 h-2.5 rounded-full ${h.status === 'Cancelled' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-800 font-display">{h.status}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{formatDateTime(h.at)}</span>
                        </div>
                        {h.note && <p className="text-[11px] text-slate-500 mt-0.5">{h.note}</p>}
                        {h.by && <p className="text-[10px] text-slate-400 mt-0.5">by {h.by}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-xs text-slate-400 font-semibold py-4 text-center">No history recorded for this order yet.</p>
                )}
              </div>
             )}
            </div>

            {/* Footer Buttons */}
            {viewingOrder.status === 'Submitted' && (
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsRejectOpen(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Reject Order
                </button>
                <button 
                  onClick={() => setIsApproveOpen(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Approve Order & Verify Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Approve Order Confirmation Modal */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Approve Order & Verify Payment"
        onConfirm={handleApproveOrder}
        confirmText={actionLoading ? "Approving..." : "Yes, Approve Order"}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            Are you sure you want to approve order <strong className="text-slate-900">{viewingOrder?.id}</strong> for
            <strong className="text-slate-900"> {viewingOrder?.retailerName}</strong>?
          </p>
          <p className="text-xs text-slate-500">
            This will verify the payment, deduct stock, and make the order eligible for dispatch. This action cannot be undone.
          </p>
        </div>
      </Modal>

      {/* Reject Order Modal */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Retailer Order Request"
        onConfirm={handleRejectOrder}
        isDestructive={true}
      >
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-500 uppercase">Reason for Rejection *</label>
          <textarea 
            rows="3" 
            placeholder="e.g., UTR validation failed. Out of credit line balance limits."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none"
          />
        </div>
      </Modal>

    </div>
  );
}
