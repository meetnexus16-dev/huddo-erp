import React, { useState, useEffect } from 'react';
import { TrendingUp, ShoppingCart, Store, Award, AlertCircle, Users, ArrowUpRight, RefreshCw } from 'lucide-react';
import {
  StatWidget,
  DashboardCard,
  DashboardTable,
  DashboardLineChart,
  DashboardBarChart,
  DashboardPieChart
} from '../components/DesignSystem';
import { authFetch, formatInr } from '../utils/authFetch';

export default function Dashboard({ onNavigate, userRole = 'Founder' }) {
  const [stats, setStats] = useState([
    { title: 'Total Revenue', value: '₹0', icon: TrendingUp, delta: '—', colorClass: 'text-emerald-600 bg-emerald-50' },
    { title: 'Total Orders', value: '0', icon: ShoppingCart, delta: '—', colorClass: 'text-brand-orange bg-orange-50' },
    { title: 'Total Retailers', value: '0', icon: Store, delta: '—', colorClass: 'text-blue-600 bg-blue-50' },
    { title: 'Total Promoters', value: '0', icon: Award, delta: '—', colorClass: 'text-purple-600 bg-purple-50' },
    { title: 'Total Payment', value: '₹0', icon: AlertCircle, delta: '—', colorClass: 'text-rose-600 bg-rose-50' },
    { title: 'Active Employees', value: '0', icon: Users, delta: '—', colorClass: 'text-slate-600 bg-slate-100' }
  ]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [statePerformance, setStatePerformance] = useState([]);
  const [topRetailers, setTopRetailers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    setLoadError(false);
    authFetch('/dashboard/founder')
      .then((resData) => {
        if (resData.success && resData.data) {
          const d = resData.data;
          const overall = d.overall || {};

          setStats([
            { title: 'Total Revenue', value: formatInr(overall.totalRevenue), icon: TrendingUp, delta: `${overall.totalOrders || 0} orders`, colorClass: 'text-emerald-600 bg-emerald-50' },
            { title: 'Total Orders', value: String(overall.totalOrders || 0), icon: ShoppingCart, delta: 'All time', colorClass: 'text-brand-orange bg-orange-50' },
            { title: 'Total Retailers', value: String(overall.totalRetailers || 0), icon: Store, delta: 'Registered', colorClass: 'text-blue-600 bg-blue-50' },
            { title: 'Total Promoters', value: String(overall.totalPromoters || 0), icon: Award, delta: 'In network', colorClass: 'text-purple-600 bg-purple-50' },
            { title: 'Total Payment', value: formatInr(overall.totalOutstanding), icon: AlertCircle, delta: 'Outstanding', colorClass: 'text-rose-600 bg-rose-50' },
            { title: 'Active Employees', value: String(overall.totalEmployees || 0), icon: Users, delta: 'On payroll', colorClass: 'text-slate-600 bg-slate-100' }
          ]);

          setMonthlyTrends(d.monthlyRevenueTrends || []);
          setStatusDistribution(d.statusBreakdown || []);
          setStatePerformance(d.statePerformanceData || []);
          setTopRetailers(d.topRetailers || []);
          setRecentOrders(d.recentOrders || []);
          setTotalOrderCount(overall.totalOrders || 0);
        } else {
          setLoadError(true);
        }
      })
      .catch((err) => {
        console.error('Error loading dashboard data:', err);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const retailerColumns = [
    { header: 'Name', accessor: 'shopName', render: (val) => <span className="font-semibold text-slate-800">{val}</span> },
    { header: 'City', accessor: 'city', render: (val) => <span className="text-slate-500">{val}</span> },
    { header: 'Revenue', accessor: 'revenue', cellClassName: 'text-right font-bold text-slate-900', render: (val) => formatInr(val) }
  ];

  const orderColumns = [
    { header: 'Order ID', accessor: 'id', render: (val) => <span className="font-semibold text-slate-800">{val}</span> },
    ...(userRole === 'CEO' ? [] : [{ header: 'Amount', accessor: 'amount', render: (val) => formatInr(val) }]),
    {
      header: 'Status',
      accessor: 'status',
      cellClassName: 'text-right',
      render: (val) => {
        const color = val === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : val === 'Shipped' ? 'bg-blue-50 text-blue-700 border border-blue-200'
            : val === 'Approved' ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200';
        return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${color}`}>{val}</span>;
      }
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
        <RefreshCw className="animate-spin text-orange-500" size={20} />
        Loading dashboard...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 rounded-xl space-y-3">
        <p className="text-slate-600">Could not load dashboard from the server.</p>
        <button type="button" onClick={loadDashboard} className="text-orange-600 font-bold text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-display">{userRole} Dashboard</h1>
        <p className="text-sm text-slate-500">Live operational overview from your database.</p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole === 'CEO' ? 'lg:grid-cols-4 xl:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-6'} gap-4`}>
        {stats.filter((stat) => userRole !== 'CEO' || (stat.title !== 'Total Revenue' && stat.title !== 'Total Payment')).map((stat, i) => {
          let target = null;
          if (stat.title === 'Total Revenue') target = 'Sales';
          else if (stat.title === 'Total Orders') target = 'Orders';
          else if (stat.title === 'Total Retailers') target = 'Retailers';
          else if (stat.title === 'Total Promoters') target = 'Promoters';
          else if (stat.title === 'Total Payment') target = 'Billing';
          else if (stat.title === 'Active Employees') target = 'Employees';

          return (
            <StatWidget
              key={i}
              title={stat.title}
              value={stat.value}
              delta={stat.delta}
              icon={stat.icon}
              colorClass={stat.colorClass}
              onClick={target ? () => onNavigate(target) : undefined}
            />
          );
        })}
      </div>

      <div className={userRole === 'CEO' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {userRole !== 'CEO' && (
          <DashboardCard
            title="Monthly Revenue Trend"
            subtitle="Revenue from approved and fulfilled orders."
            className="lg:col-span-2"
          >
            {monthlyTrends.length > 0 ? (
              <DashboardLineChart
                data={monthlyTrends}
                xKey="month"
                lineKey="revenue"
                tickFormatter={(val) => `₹${val / 100000}L`}
                formatter={(value) => [formatInr(value), 'Revenue']}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No revenue data yet.</p>
            )}
          </DashboardCard>
        )}

        <DashboardCard
          title="Order Status Distribution"
          subtitle="Breakdown of all orders by status."
          className={userRole === 'CEO' ? 'lg:col-span-1 max-w-xl mx-auto w-full' : ''}
        >
          {statusDistribution.length > 0 ? (
            <>
              <DashboardPieChart
                data={statusDistribution}
                nameKey="name"
                valueKey="value"
                centerTextValue={String(totalOrderCount)}
                centerTextLabel="Total Orders"
              />
              <div className="grid grid-cols-5 gap-1 mt-4 text-center">
                {statusDistribution.map((entry, index) => {
                  const colors = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: colors[index % colors.length] }} />
                      <span className="text-[9px] text-slate-550 font-bold tracking-tight block truncate w-full">{entry.name}</span>
                      <span className="text-xs font-bold text-slate-700">{entry.value}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">No orders in the system yet.</p>
          )}
        </DashboardCard>
      </div>

      <div className={userRole === 'CEO' ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {userRole !== 'CEO' && (
          <DashboardCard title="State Revenue Ranking" subtitle="Revenue by state.">
            {statePerformance.length > 0 ? (
              <DashboardBarChart
                data={statePerformance}
                layout="vertical"
                yKey="state"
                barKey="revenue"
                tickFormatter={(val) => `₹${val / 100000}L`}
                formatter={(value) => formatInr(value)}
              />
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">No state data yet.</p>
            )}
          </DashboardCard>
        )}

        {userRole !== 'CEO' && (
          <DashboardCard
            title="Top Retailers"
            subtitle="Highest billing retailers."
            headerActions={(
              <button
                type="button"
                onClick={() => onNavigate('Retailers')}
                className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          >
            <DashboardTable columns={retailerColumns} data={topRetailers} emptyStateText="No retailer sales yet." />
          </DashboardCard>
        )}

        <DashboardCard
          title="Recent Orders"
          subtitle="Latest orders in the system."
          className={userRole === 'CEO' ? 'lg:col-span-1 max-w-3xl mx-auto w-full' : ''}
          headerActions={(
            <button
              type="button"
              onClick={() => onNavigate('Orders')}
              className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        >
          <DashboardTable columns={orderColumns} data={recentOrders} emptyStateText="No orders yet." />
        </DashboardCard>
      </div>
    </div>
  );
}
