import React, { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, Store, Users, CheckSquare, RefreshCw
} from 'lucide-react';
import {
  StatWidget,
  DashboardCard,
  DashboardTable,
  DashboardLineChart,
  DashboardBarChart
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
        <p className="text-slate-500 mb-4">Could not load state dashboard data.</p>
        <button type="button" onClick={load} className="text-orange-600 font-bold text-sm">Retry</button>
      </div>
    );
  }

  const cityManagerColumns = [
    { header: 'City', accessor: 'city', render: (v) => <span className="font-bold text-slate-800">{v}</span> },
    { header: 'Manager', accessor: 'name' },
    { header: 'Retailers', accessor: 'retailersCount' },
    { header: 'Orders (Month)', accessor: 'ordersThisMonth' },
    { header: 'Revenue', accessor: 'achieved', render: (v) => formatInr(v) },
    {
      header: 'Status',
      accessor: 'status',
      render: (v) => (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700">{v}</span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{data.territoryLabel} Overview</h1>
        <p className="text-sm text-slate-500">Live state metrics from retailers and orders in your territory.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatWidget
          title="Revenue (Month)"
          value={formatInr(data.monthRevenue)}
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
          title="Retailers"
          value={String(data.retailerCount || 0)}
          delta={`${data.activeRetailers || 0} active`}
          icon={Store}
          colorClass="text-purple-600 bg-purple-50"
          onClick={() => onNavigate?.('Retailers')}
        />
        <StatWidget
          title="City Managers"
          value={String((data.cityManagers || []).length)}
          icon={Users}
          colorClass="text-teal-600 bg-teal-50"
          onClick={() => onNavigate?.('City Managers')}
        />
        <StatWidget
          title="Pending Approvals"
          value={String(data.pendingApprovals || 0)}
          icon={CheckSquare}
          colorClass="text-orange-600 bg-orange-50"
          onClick={() => onNavigate?.('Approvals')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DashboardCard title="Monthly Revenue" subtitle="Last 6 months" className="lg:col-span-7">
          <DashboardLineChart
            data={data.monthlyTrends || []}
            xKey="month"
            lineKey="revenue"
            tickFormatter={(v) => `₹${Math.round(v / 100000)}L`}
            formatter={(value) => [formatInr(value), 'Revenue']}
          />
        </DashboardCard>
        <DashboardCard title="City Performance" subtitle="Revenue this month" className="lg:col-span-5">
          {(data.cityPerformance || []).length > 0 ? (
            <DashboardBarChart
              data={data.cityPerformance}
              layout="vertical"
              yKey="city"
              barKey="revenue"
              tickFormatter={(v) => `₹${Math.round(v / 100000)}L`}
              formatter={(value) => formatInr(value)}
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No city sales data yet.</p>
          )}
        </DashboardCard>
      </div>

      <DashboardCard title="City Manager Performance" subtitle="Managers assigned to cities in your state">
        <DashboardTable
          columns={cityManagerColumns}
          data={data.cityManagers || []}
          emptyStateText="No city managers assigned yet."
        />
      </DashboardCard>
    </div>
  );
}
