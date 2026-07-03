// CM-MODULE: Frontend component for Country Manager Dashboard overview
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, ShoppingCart, Store, Award, CheckSquare, Bell, ArrowUpRight, 
  MapPin, CheckCircle, XCircle, RefreshCw, ChevronRight, Layers
} from 'lucide-react';
import { 
  StatWidget, 
  DashboardCard, 
  DashboardTable, 
  DashboardLineChart, 
  DashboardBarChart, 
  DashboardModal,
  TextInput
} from '../../../components/DesignSystem';

export default function CountryManagerDashboard({ cmId, isTab = false, onNavigate, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Approval action modal states
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [approvalAction, setApprovalAction] = useState('Approved');
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [actioning, setActioning] = useState(false);

  // Fallback cmId if not supplied (e.g. read from localStorage for logged-in CM)
  const resolvedCmId = cmId || 1;

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/country-managers/${resolvedCmId}/dashboard`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to compile dashboard metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [resolvedCmId]);

  const handleApprovalSubmit = async () => {
    if (!selectedApproval) return;
    setActioning(true);
    try {
      const res = await fetch(`/api/country-managers/${resolvedCmId}/approvals/${selectedApproval.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: approvalAction, remarks: approvalRemarks })
      });
      if (res.ok) {
        if (showToast) showToast(`Request ${approvalAction.toLowerCase()} successfully`, "success");
        setSelectedApproval(null);
        fetchDashboardData();
      }
    } catch (err) {
      if (showToast) showToast("Approval action failed", "error");
    } finally {
      setActioning(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-bold animate-pulse">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
          <span>Synchronizing regional metrics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 bg-white border border-slate-200 rounded-xl">
        <p className="text-slate-500 font-bold">Failed to load dashboard metrics.</p>
      </div>
    );
  }

  const { profile_snapshot, kpi_cards, current_period_targets, state_performance, city_performance_top10, retailer_performance, revenue_analysis, sales_trends, recent_approvals } = data;
  const hasTargets = current_period_targets?.revenue?.target > 0
    || current_period_targets?.orders?.target > 0
    || current_period_targets?.retailer_acquisition?.target > 0;
  const targetPeriodLabel = new Date().toISOString().slice(0, 7);

  const kpis = [
    { title: "States Managed", value: kpi_cards.total_states, delta: "Active coverage", icon: Layers, colorClass: "text-blue-600 bg-blue-50" },
    { title: "Cities Covered", value: kpi_cards.total_cities, delta: "Retail nodes", icon: MapPin, colorClass: "text-emerald-600 bg-emerald-50" },
    { title: "Total Retailers", value: kpi_cards.total_retailers, delta: `${kpi_cards.active_retailers} Active`, icon: Store, colorClass: "text-orange-600 bg-orange-50" },
    { title: "Total Promoters", value: kpi_cards.total_promoters, delta: "Active fields", icon: Award, colorClass: "text-purple-600 bg-purple-50" },
    { title: "Pending Approvals", value: kpi_cards.pending_approvals, delta: "Action required", icon: CheckSquare, colorClass: "text-rose-600 bg-rose-50" },
    { title: "Unread Alerts", value: kpi_cards.unread_notifications, delta: "System notifications", icon: Bell, colorClass: "text-slate-605 bg-slate-100" }
  ];

  const cityColumns = [
    { header: "City", accessor: "city_name", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: "State", accessor: "state_name", render: (val) => <span className="text-slate-550 font-semibold">{val}</span> },
    { header: "Orders", accessor: "orders", cellClassName: "text-right font-bold text-slate-600" },
    { header: "Revenue", accessor: "revenue", cellClassName: "text-right font-extrabold text-slate-900", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> }
  ];

  const approvalColumns = [
    { header: "Type", accessor: "approval_type", render: (val) => (
      <span className={`px-2 py-0.5 border rounded text-[9px] font-bold ${
        val === 'Large_Order' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-blue-50 text-blue-700 border-blue-200'
      }`}>{val.replace(/_/g, ' ')}</span>
    )},
    { header: "Reference", accessor: "reference_id", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: "Submitted By", accessor: "submitted_by_role", render: (val) => <span className="text-slate-500 font-semibold">{val}</span> },
    { header: "Action", accessor: "id", cellClassName: "text-right", render: (val, row) => (
      <button
        onClick={() => { setSelectedApproval(row); setApprovalAction('Approved'); setApprovalRemarks(''); }}
        className="px-2 py-1 bg-brand-orange hover:bg-brand-orange-hover text-white text-[10px] font-bold rounded cursor-pointer"
      >
        Review
      </button>
    )}
  ];

  const productColumns = [
    { header: "Product", accessor: "name", render: (val) => <span className="font-bold text-slate-800">{val}</span> },
    { header: "Qty", accessor: "quantity", cellClassName: "text-right font-bold text-slate-600" },
    { header: "Revenue", accessor: "revenue", cellClassName: "text-right font-extrabold text-slate-950", render: (val) => <span>₹{val.toLocaleString('en-IN')}</span> }
  ];

  return (
    <div className="space-y-6 cm-dashboard-view">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((stat, i) => {
          let target = null;
          if (stat.title === "States Managed") target = "States";
          else if (stat.title === "Cities Covered") target = "States";
          else if (stat.title === "Total Retailers") target = "Reports";
          else if (stat.title === "Total Promoters") target = "State Managers";
          else if (stat.title === "Pending Approvals") target = "Approvals";
          else if (stat.title === "Unread Alerts") target = "Notifications";

          return (
            <StatWidget
              key={i}
              title={stat.title}
              value={stat.value}
              delta={stat.delta}
              icon={stat.icon}
              colorClass={stat.colorClass}
              onClick={target && onNavigate ? () => onNavigate(target) : undefined}
            />
          );
        })}
      </div>

      {/* Target Progress Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Current Target Cycle ({targetPeriodLabel})</h3>
        {!hasTargets ? (
          <p className="text-sm text-slate-500 font-medium">No targets configured for this period yet.</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Target */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Revenue Target Progress</span>
              <span className="text-slate-800 font-bold">₹{current_period_targets.revenue.achieved.toLocaleString('en-IN')} / ₹{current_period_targets.revenue.target.toLocaleString('en-IN')} ({current_period_targets.revenue.pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${Math.min(current_period_targets.revenue.pct, 100)}%` }}></div>
            </div>
          </div>

          {/* Order Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Wholesale Orders Count</span>
              <span className="text-slate-800 font-bold">{current_period_targets.orders.achieved} / {current_period_targets.orders.target} orders ({current_period_targets.orders.pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(current_period_targets.orders.pct, 100)}%` }}></div>
            </div>
          </div>

          {/* Retailer Acquisition */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="text-slate-500">Retailer Acquisition</span>
              <span className="text-slate-800 font-bold">{current_period_targets.retailer_acquisition.achieved} / {current_period_targets.retailer_acquisition.target} stores ({current_period_targets.retailer_acquisition.pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min(current_period_targets.retailer_acquisition.pct, 100)}%` }}></div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Analytics Charts (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard 
          title="Monthly Revenue Trend" 
          subtitle="Plots total revenue generated under this country scope."
        >
          {revenue_analysis.monthly_trend?.length > 0 ? (
          <DashboardLineChart
            data={revenue_analysis.monthly_trend}
            xKey="month"
            lineKey="revenue"
            tickFormatter={(val) => `₹${val / 100000}L`}
            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
          />
          ) : (
            <p className="text-sm text-slate-500 font-medium py-16 text-center">No revenue data available yet.</p>
          )}
        </DashboardCard>

        <DashboardCard 
          title="State Performance Ranking" 
          subtitle="Ranks state zones based on monthly sales."
        >
          {state_performance?.length > 0 ? (
          <DashboardBarChart
            data={state_performance}
            layout="vertical"
            yKey="state_name"
            barKey="revenue"
            tickFormatter={(val) => `₹${val / 100000}L`}
            formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
          />
          ) : (
            <p className="text-sm text-slate-500 font-medium py-16 text-center">No state performance data available yet.</p>
          )}
        </DashboardCard>
      </div>

      {/* Tables Row (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Cities by Revenue */}
        <DashboardCard
          title="Top Cities in Country"
          subtitle="Supervises top city areas by billing volume."
          headerActions={
            onNavigate && (
              <button 
                onClick={() => onNavigate("Reports")} 
                className="text-[10px] font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>View Report</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )
          }
        >
          <DashboardTable
            columns={cityColumns}
            data={city_performance_top10.slice(0, 5)}
            emptyText="No city performance data available yet."
          />
        </DashboardCard>

        {/* Recent Approvals Queue */}
        <DashboardCard
          title="Pending Approvals"
          subtitle="Verifications waiting for Country Manager clearance."
          headerActions={
            onNavigate && (
              <button 
                onClick={() => onNavigate("Approvals")} 
                className="text-[10px] font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-0.5 transition-colors cursor-pointer"
              >
                <span>Go to Inbox</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )
          }
        >
          <DashboardTable
            columns={approvalColumns}
            data={recent_approvals.slice(0, 5)}
            emptyText="No pending approvals in queue."
          />
        </DashboardCard>
      </div>

      {/* Sales Trends Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Sales Trend Last 7 Days */}
        <DashboardCard
          title="Daily Sales Trend"
          subtitle="Tracks revenue performance over the last 7 operating days."
          className="lg:col-span-2"
        >
          {sales_trends.daily_this_week?.length > 0 ? (
          <DashboardLineChart
            data={sales_trends.daily_this_week}
            xKey="day"
            lineKey="revenue"
            stroke="#3b82f6"
            tickFormatter={(val) => `₹${val / 100000}L`}
            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Sales']}
          />
          ) : (
            <p className="text-sm text-slate-500 font-medium py-16 text-center">No daily sales data available yet.</p>
          )}
        </DashboardCard>

        {/* Top 5 Products Table */}
        <DashboardCard
          title="Top Products by Qty"
          subtitle="Most sold shoe products by volume."
        >
          <DashboardTable
            columns={productColumns}
            data={sales_trends.top_products}
            emptyText="No product sales data available yet."
          />
        </DashboardCard>
      </div>

      {/* Review overlay modal */}
      <DashboardModal
        isOpen={selectedApproval !== null}
        onClose={() => setSelectedApproval(null)}
        title={selectedApproval ? `Action Approval: ${selectedApproval.reference_id}` : ""}
        onConfirm={handleApprovalSubmit}
        isDestructive={approvalAction === 'Rejected'}
      >
        <div className="space-y-4 text-xs font-semibold">
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Comments / Remarks</label>
            <textarea 
              rows="3" 
              placeholder="Enter audit remarks..." 
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange transition-all"
            />
          </div>
        </div>
      </DashboardModal>
    </div>
  );
}
