import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, Store, CheckSquare, RefreshCw } from 'lucide-react';
import {
  StatWidget,
  DashboardCard,
  DashboardLineChart,
  DashboardBarChart,
  DashboardTable
} from '../../components/DesignSystem';
import { authFetch, formatInr } from '../../utils/authFetch';

export default function Dashboard({ onNavigate, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    authFetch('/dashboard/me')
      .then((res) => {
        if (res.success) setData(res.data);
        else showToast?.(res.message || 'Failed to load dashboard.', 'error');
      })
      .catch(() => showToast?.('Failed to load dashboard.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <RefreshCw className="animate-spin" size={20} />
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
        <p className="text-slate-500 mb-4">Could not load city dashboard data.</p>
        <button type="button" onClick={load} className="text-orange-600 font-bold text-sm">Retry</button>
      </div>
    );
  }

  const retailerChartData = (data.topRetailers || []).map((r) => ({
    name: r.name?.length > 18 ? `${r.name.slice(0, 18)}…` : r.name,
    revenue: r.revenue
  }));

  const pendingColumns = [
    { header: 'Order', accessor: 'order_number', render: (v) => <span className="font-mono font-bold text-slate-800">{v || '—'}</span> },
    { header: 'Retailer', accessor: 'retailer' },
    { header: 'Amount', accessor: 'amount', render: (v) => formatInr(v) },
    { header: 'Status', accessor: 'status' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">City Dashboard</h1>
        <p className="text-sm text-slate-500">{data.territoryLabel} — live metrics from your retailer network.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          title="Revenue (This Month)"
          value={formatInr(data.monthRevenue)}
          delta={`${data.monthOrders || 0} orders`}
          icon={TrendingUp}
          colorClass="text-emerald-600 bg-emerald-50"
          onClick={() => onNavigate?.('Orders')}
        />
        <StatWidget
          title="Total Orders"
          value={String(data.totalOrders || 0)}
          icon={ShoppingCart}
          colorClass="text-blue-600 bg-blue-50"
          onClick={() => onNavigate?.('Orders')}
        />
        <StatWidget
          title="My Retailers"
          value={String(data.retailerCount || 0)}
          delta={`${data.activeRetailers || 0} active`}
          icon={Store}
          colorClass="text-purple-600 bg-purple-50"
          onClick={() => onNavigate?.('My Retailers')}
        />
        <StatWidget
          title="Pending Approvals"
          value={String(data.pendingApprovals || 0)}
          delta={data.pendingApprovals ? 'Action required' : 'All clear'}
          icon={CheckSquare}
          colorClass="text-rose-600 bg-rose-50"
          onClick={() => onNavigate?.('Approvals')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DashboardCard title="Monthly Revenue" subtitle="Last 6 months" className="lg:col-span-7">
          <DashboardLineChart
            data={data.monthlyTrends || []}
            xKey="month"
            lineKey="revenue"
            tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
            formatter={(value) => [formatInr(value), 'Revenue']}
          />
        </DashboardCard>
        <DashboardCard title="Top Retailers" subtitle="Revenue this month" className="lg:col-span-5">
          {retailerChartData.length > 0 ? (
            <DashboardBarChart
              data={retailerChartData}
              layout="vertical"
              yKey="name"
              barKey="revenue"
              tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
              formatter={(value) => formatInr(value)}
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No retailer sales this month yet.</p>
          )}
        </DashboardCard>
      </div>

      <DashboardCard
        title="Orders Pending Approval"
        subtitle="Submitted orders awaiting your approval"
        headerActions={
          data.pendingApprovals > 0 ? (
            <button type="button" onClick={() => onNavigate?.('Approvals')} className="text-xs font-bold text-orange-600">
              Open queue
            </button>
          ) : null
        }
      >
        <DashboardTable
          columns={pendingColumns}
          data={data.pendingOrders || []}
          emptyStateText="No orders pending approval."
        />
      </DashboardCard>
    </div>
  );
}
