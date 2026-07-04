import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, CreditCard, Tag, Landmark, Phone, Star, 
  ArrowRight, CheckCircle2, AlertTriangle, Truck, FileText, RefreshCw
} from 'lucide-react';
import { 
  StatWidget, 
  DashboardCard, 
  DashboardTable, 
  DashboardAreaChart 
} from '../../../components/DesignSystem';

import { useRetailerAuth } from '../context/RetailerAuthContext';
import { mockSchemes } from '../mockData/mockSchemes';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard({ onNavigate }) {
  const { user, retailer } = useRetailerAuth();
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/orders?retailer=${user.id}`).then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch(`/api/invoices?retailer=${user.id}`).then(res => res.json()).catch(() => ({ success: false, data: [] })),
      fetch(`/api/commission-records?user=${user.rawUser?._id || user.id}`).then(res => res.json()).catch(() => ({ success: false, data: [] }))
    ])
    .then(([ordersRes, invoicesRes, commsRes]) => {
      setOrders(ordersRes.success && Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setInvoices(invoicesRes.success && Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setCommissions(commsRes.success && Array.isArray(commsRes.data) ? commsRes.data : []);
    })
    .catch(err => console.error("Error fetching dashboard data:", err))
    .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4 min-h-[400px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold font-display">
          <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
          <span>Fetching retailer dashboard statistics...</span>
        </div>
      </div>
    );
  }

  // Calculations based on real fetched data
  const totalOrdersCount = orders.length;
  
  const orderBreakdown = orders.reduce((acc, curr) => {
    if (['Draft', 'Submitted'].includes(curr.status)) {
      acc.pending += 1;
    } else if (['Approved', 'Processing', 'Packed', 'Shipped'].includes(curr.status)) {
      acc.approved += 1;
    } else if (curr.status === 'Delivered') {
      acc.delivered += 1;
    }
    return acc;
  }, { pending: 0, approved: 0, delivered: 0 });

  // Total Outstanding Payments
  const outstandingAmount = invoices
    .filter(inv => !inv.is_paid)
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Count active schemes applicable to retailer's category
  const rCategory = retailer?.category || user?.category || 'Standard';
  const activeSchemesCount = mockSchemes.filter(s => 
    s.isActive && s.applicableTiers.includes(rCategory)
  ).length;

  // Recent 5 orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  // Dynamic chart data based on order history
  const purchaseChartData = (() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySum = {};
    orders.forEach(order => {
      if (['Approved', 'Processing', 'Packed', 'Shipped', 'Delivered'].includes(order.status)) {
        const date = new Date(order.createdAt);
        const mName = monthNames[date.getMonth()];
        monthlySum[mName] = (monthlySum[mName] || 0) + (order.grand_total || 0);
      }
    });

    const chartData = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mName = monthNames[d.getMonth()];
      chartData.push({
        month: mName,
        amount: monthlySum[mName] || 0
      });
    }
    return chartData;
  })();

  const thisMonthEarned = commissions
    .filter(c => {
      const date = new Date(c.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  
  const loyaltyPoints = commissions.reduce((sum, c) => sum + Math.floor(c.amount || 0) * 10, 0);

  const tableColumns = [
    { header: "Order ID", accessor: "order_number", render: (val, row) => <span className="font-bold text-slate-900">{val || `ORD-${row._id.substring(18)}`}</span> },
    { header: "Order Date", accessor: "createdAt", render: (val) => <span className="text-slate-400 font-semibold">{new Date(val).toLocaleDateString()}</span> },
    { header: "Items Purchased", accessor: "items", render: (val, row) => {
      const totalItemsQty = row.items?.reduce((sum, it) => sum + it.quantity, 0) || 0;
      return <span>{totalItemsQty} pairs</span>;
    }},
    { header: "Amount Total", accessor: "grand_total", render: (val) => <span className="font-bold text-slate-800">₹{(val || 0).toLocaleString('en-IN')}</span> },
    { header: "Payment Status", accessor: "payment_status", render: (val) => (
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${
          val === 'Paid' || val === 'Verified' ? 'bg-emerald-500' : 'bg-amber-400'
        }`}></span>
        <span>{val || 'Pending'}</span>
      </span>
    )},
    { header: "Tracking Status", accessor: "status", render: (val) => <StatusBadge status={val} /> }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Section */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Background decorative gradient */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-brand-orange/15 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white flex items-center gap-1 shadow-sm">
              <Star className="w-3 h-3 fill-white" />
              {rCategory} Member
            </span>
            <span className="text-xs text-slate-400 font-bold">Code: {retailer?.gst_number || "RTL-GOLD-001"}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight font-display">Welcome back, {retailer?.business_name || user?.name}!</h1>
          <p className="text-xs text-slate-400 font-medium">Manage your shoe inventory orders, check pending invoices, and review loyalty commissions.</p>
        </div>

        <div className="flex gap-2.5 shrink-0 z-10">
          <button 
            onClick={() => onNavigate('Place Order')}
            className="px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Place New Order</span>
          </button>
          <button 
            onClick={() => onNavigate('Billing & Invoices')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-705 text-slate-200 text-xs font-bold rounded-xl shadow-sm border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>View Invoices</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget 
          title="Total Orders" 
          value={totalOrdersCount}
          delta={
            <div className="flex gap-2.5 text-[10px] font-bold text-slate-500 mt-1">
              <span className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{orderBreakdown.pending} Pend</span>
              <span className="flex items-center gap-0.5 text-amber-600 bg-amber-50 px-1 py-0.5 rounded">{orderBreakdown.approved} Appr</span>
              <span className="flex items-center gap-0.5 text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">{orderBreakdown.delivered} Delv</span>
            </div>
          }
          icon={ShoppingBag}
          onClick={() => onNavigate('My Orders')}
        />
        <StatWidget 
          title="Payments Due" 
          value={`₹${outstandingAmount.toLocaleString('en-IN')}`}
          delta={<span className="text-rose-600 font-bold">Requires Settlement</span>}
          icon={CreditCard}
          colorClass="text-rose-500 bg-rose-50"
          onClick={() => onNavigate('Billing & Invoices')}
        />
        <StatWidget 
          title="Active Schemes" 
          value={activeSchemesCount}
          delta={
            <div className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-1.5 inline-flex items-center gap-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); onNavigate('Schemes & Discounts'); }}>
              <span>Available for {rCategory}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          }
          icon={Tag}
          colorClass="text-amber-500 bg-amber-50"
          onClick={() => onNavigate('Schemes & Discounts')}
        />
        <StatWidget 
          title="Monthly Rewards" 
          value={`₹${thisMonthEarned.toLocaleString('en-IN')}`}
          delta={
            <div className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1.5 inline-block">
              Points: {loyaltyPoints} PTS
            </div>
          }
          icon={Landmark}
          colorClass="text-emerald-500 bg-emerald-50"
          onClick={() => onNavigate('Commission & Rewards')}
        />
      </div>

      {/* Main Grid: Recharts Performance + Managers info & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Monthly Purchase Performance */}
        <DashboardCard 
          title="Purchase Trend (Lifetime Analytics)" 
          subtitle="Plots the total value of products purchased by your retail shop monthly."
          className="lg:col-span-2"
        >
          <DashboardAreaChart 
            data={purchaseChartData} 
            xKey="month" 
            areaKey="amount" 
            formatter={(value) => [`₹${value.toLocaleString()}`, 'Purchases']}
          />
        </DashboardCard>

        {/* Right Col: Local Personnel Details & Quick Actions */}
        <div className="space-y-6">
          {/* City Manager Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 font-display">Assigned Managers</h3>
            
            {/* City Manager */}
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-brand-orange flex items-center justify-center font-bold text-sm shrink-0">
                CM
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">City Manager</span>
                <h4 className="font-extrabold text-slate-850 font-display">{retailer?.assigned_city_manager?.name || "Not Assigned"}</h4>
                <div className="flex items-center gap-3 text-slate-500 font-medium mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-450" /> {retailer?.assigned_city_manager?.mobile || "Not Provided"}</span>
                </div>
              </div>
            </div>

            {/* Field Promoter */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                FP
              </div>
              <div className="text-xs">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Field Promoter</span>
                <h4 className="font-extrabold text-slate-850 font-display">{retailer?.assigned_promoter?.name || "Not Assigned"}</h4>
                <div className="flex items-center gap-3 text-slate-500 font-medium mt-1">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-455" /> {retailer?.assigned_promoter?.mobile || "Not Provided"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 font-display">Quick Action Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-700">
              <button 
                onClick={() => onNavigate('Place Order')}
                className="p-3 border border-slate-100 hover:border-brand-orange/40 hover:bg-orange-50/20 rounded-xl transition-all flex flex-col items-center gap-2 bg-slate-50/50 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-brand-orange" />
                <span>Place Order</span>
              </button>
              <button 
                onClick={() => onNavigate('Schemes & Discounts')}
                className="p-3 border border-slate-100 hover:border-brand-orange/40 hover:bg-orange-50/20 rounded-xl transition-all flex flex-col items-center gap-2 bg-slate-50/50 cursor-pointer"
              >
                <Tag className="w-5 h-5 text-amber-500" />
                <span>View Schemes</span>
              </button>
              <button 
                onClick={() => onNavigate('Billing & Invoices')}
                className="p-3 border border-slate-100 hover:border-brand-orange/40 hover:bg-orange-50/20 rounded-xl transition-all flex flex-col items-center gap-2 bg-slate-50/50 col-span-2 cursor-pointer"
              >
                <Landmark className="w-5 h-5 text-emerald-500" />
                <span>Verify Invoices & Pay History</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Orders Listing */}
      <DashboardCard 
        title="Recent Order Activity" 
        subtitle="Tracks status progression for your last 5 footwear orders."
        headerActions={
          <button 
            onClick={() => onNavigate('My Orders')}
            className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      >
        <DashboardTable 
          columns={tableColumns} 
          data={recentOrders} 
          emptyText="No orders placed yet."
        />
      </DashboardCard>
    </div>
  );
}
