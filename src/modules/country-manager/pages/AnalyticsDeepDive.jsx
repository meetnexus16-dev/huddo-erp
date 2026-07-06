// CM-MODULE: Frontend component for Country Manager Analytics Deep-Dive
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  TrendingUp, ShoppingCart, Store, ArrowUpRight, Filter, RefreshCw, 
  MapPin, Award, CheckCircle, AlertTriangle, ChevronRight, Download
} from 'lucide-react';

export default function AnalyticsDeepDive({ cmId, showToast }) {
  const [resolvedCmId, setResolvedCmId] = useState(cmId || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cmId) {
      setResolvedCmId(cmId);
      return;
    }
    const token = localStorage.getItem('huddo_token');
    fetch('/api/profile', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?._id) setResolvedCmId(res.data._id);
      })
      .catch(() => {});
  }, [cmId]);

  // Filters State
  const [filters, setFilters] = useState({
    periodType: 'Monthly',
    period: '2026-06',
    states: ['All'],
    groupBy: 'Month'
  });

  // Data States
  const [statePerformance, setStatePerformance] = useState([]);
  const [cityPerformance, setCityPerformance] = useState([]);
  const [retailerPerformance, setRetailerPerformance] = useState(null);
  const [salesTrends, setSalesTrends] = useState(null);

  // Fetch all analytics data
  const fetchAnalytics = async () => {
    if (!resolvedCmId) return;
    setLoading(true);
    try {
      // 1. Fetch State Performance
      const resState = await fetch(`/api/country-managers/${resolvedCmId}/analytics/state-performance?period_type=${filters.periodType}&period_label=${filters.period}`);
      if (resState.ok) {
        const data = await resState.json();
        setStatePerformance(data);
      }

      // 2. Fetch City Performance
      const resCity = await fetch(`/api/country-managers/${resolvedCmId}/analytics/city-performance?period_type=${filters.periodType}&period_label=${filters.period}`);
      if (resCity.ok) {
        const data = await resCity.json();
        setCityPerformance(data);
      }

      // 3. Fetch Retailer Performance
      const resRet = await fetch(`/api/country-managers/${resolvedCmId}/analytics/retailer-performance?period_type=${filters.periodType}&period_label=${filters.period}`);
      if (resRet.ok) {
        const data = await resRet.json();
        setRetailerPerformance(data);
      }

      // 4. Fetch Sales Trends
      const resSales = await fetch(`/api/country-managers/${resolvedCmId}/analytics/sales-trends?group_by=${filters.groupBy.toLowerCase()}`);
      if (resSales.ok) {
        const data = await resSales.json();
        setSalesTrends(data);
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast("Failed to fetch analytics metrics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resolvedCmId) fetchAnalytics();
  }, [filters, resolvedCmId]);

  const handleExport = (section) => {
    if (showToast) showToast(`Exporting analytics for ${section} as CSV...`, "success");
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 cm-analytics-page select-none">
      
      {/* Sidebar Filters Column (w-64) */}
      <aside className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-5 shadow-xs h-fit space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-brand-orange" />
          <h3 className="text-sm font-bold text-slate-800 font-display uppercase tracking-wider">Analytics Filters</h3>
        </div>

        {/* Period Type */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].slice(0, 4).map(type => (
              <button
                key={type}
                onClick={() => setFilters({ ...filters, periodType: type })}
                className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                  filters.periodType === type 
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-350'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Period Selector */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cycle Period</label>
          <input
            type="text"
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
            className="w-full text-xs font-semibold border border-slate-200 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 rounded-lg p-2 bg-white text-slate-800 focus:outline-none"
            placeholder="e.g. 2026-06"
          />
        </div>

        {/* States filter */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">States Filter</label>
          <select
            value={filters.states[0]}
            onChange={(e) => setFilters({ ...filters, states: [e.target.value] })}
            className="w-full text-xs font-bold border border-slate-200 focus:border-brand-orange rounded-lg p-2 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="All">All States</option>
            <option value="Maharashtra">Maharashtra</option>
            <option value="Delhi">Delhi</option>
            <option value="Karnataka">Karnataka</option>
            <option value="Gujarat">Gujarat</option>
          </select>
        </div>

        {/* Group By */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Group sales by</label>
          <select
            value={filters.groupBy}
            onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
            className="w-full text-xs font-bold border border-slate-200 focus:border-brand-orange rounded-lg p-2 bg-white text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
          </select>
        </div>

        <button
          onClick={fetchAnalytics}
          className="w-full py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Analytics</span>
        </button>
      </aside>

      {/* Main Content Sections */}
      <div className="flex-1 space-y-6">
        
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-xs flex items-center justify-center min-h-[500px]">
            <div className="flex items-center gap-2.5 text-slate-400 text-sm font-bold">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
              <span>Fetching regional analytics nodes...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Section A — State Performance Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section A — State Performance</h3>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Summary of total revenues, orders count, and targets completion sorted by revenue.</p>
                </div>
                <button onClick={() => handleExport("States")} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50">
                      <th className="p-3">Rank</th>
                      <th className="p-3">State</th>
                      <th className="p-3">State Manager</th>
                      <th className="p-3 text-right">Revenue</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Shops</th>
                      <th className="p-3 text-right">Target %</th>
                      <th className="p-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {statePerformance.map((s, idx) => {
                      const achievement = s.target_pct;
                      const colorRow = achievement >= 80 ? 'hover:bg-emerald-50/10' : achievement >= 50 ? 'hover:bg-amber-50/10' : 'hover:bg-rose-50/10';
                      const badgeColor = achievement >= 80 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : achievement >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200';
                      return (
                        <tr key={idx} className={`transition-colors ${colorRow}`}>
                          <td className="p-3 font-bold text-slate-400">#{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-800">{s.state_name}</td>
                          <td className="p-3 text-slate-500">{s.state_manager_name}</td>
                          <td className="p-3 text-right font-extrabold text-slate-950">₹{s.revenue.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">{s.orders}</td>
                          <td className="p-3 text-right">{s.retailers}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold ${badgeColor}`}>{achievement}%</span>
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600">
                            {s.trend === 'Up' ? '▲ Up' : s.trend === 'Down' ? '▼ Down' : '■ Stable'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section B — City Performance Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">City Rankings</h4>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Top performing cities in the country, sortable by revenue.</p>
                </div>
                <button onClick={() => handleExport("Cities")} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] uppercase font-bold text-slate-400 bg-slate-50/50">
                      <th className="p-3">Rank</th>
                      <th className="p-3">City</th>
                      <th className="p-3">State</th>
                      <th className="p-3">City Manager</th>
                      <th className="p-3 text-right">Orders</th>
                      <th className="p-3 text-right">Retailers</th>
                      <th className="p-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                    {cityPerformance.map((c, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 font-bold text-slate-400">#{c.rank}</td>
                        <td className="p-3 font-bold text-slate-800">{c.city_name}</td>
                        <td className="p-3 text-slate-500 font-semibold">{c.state_name}</td>
                        <td className="p-3 text-slate-600 font-bold">{c.city_manager_name}</td>
                        <td className="p-3 text-right">{c.orders}</td>
                        <td className="p-3 text-right">{c.retailers}</td>
                        <td className="p-3 text-right font-extrabold text-slate-900">₹{c.revenue.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section C — Retailer Performance */}
            {retailerPerformance && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section C — Retailer performance summary</h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Statistics of active shops, categorizations, and top stores.</p>
                  </div>
                  <button onClick={() => handleExport("Retailers")} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Platinum Tier", value: retailerPerformance.summary.by_category.Platinum, color: "border-slate-100 bg-slate-50/50" },
                    { label: "Gold Tier", value: retailerPerformance.summary.by_category.Gold, color: "border-amber-100 bg-amber-50/10 text-amber-700" },
                    { label: "Silver Tier", value: retailerPerformance.summary.by_category.Silver, color: "border-blue-100 bg-blue-50/10 text-blue-700" },
                    { label: "Standard Tier", value: retailerPerformance.summary.by_category.Standard, color: "border-slate-200 bg-slate-100/10 text-slate-700" }
                  ].map((card, idx) => (
                    <div key={idx} className={`border rounded-xl p-3 text-center ${card.color}`}>
                      <span className="text-[10px] font-bold block uppercase tracking-wider">{card.label}</span>
                      <span className="text-lg font-bold font-display mt-0.5 block">{card.value} Shops</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Top Retailers List */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-1">Top Retailers</span>
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-50 text-[9px] uppercase font-bold text-slate-400">
                          <th className="pb-1.5">Shop Name</th>
                          <th className="pb-1.5">Location</th>
                          <th className="pb-1.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {retailerPerformance.top_retailers.map((ret, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-bold text-slate-800">{ret.shop_name}</td>
                            <td className="py-2 text-slate-450 font-bold">{ret.city}</td>
                            <td className="py-2 text-right font-extrabold text-slate-900">₹{ret.revenue.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Growth Trend Bar Chart */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-1">New Retailer Signups (6 Months)</span>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={retailerPerformance.growth_trend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Section D — Sales Trends */}
            {salesTrends && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wide">Section D — Sales Trends</h3>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Revenues trend analysis and catalog performance metrics.</p>
                  </div>
                  <button onClick={() => handleExport("Sales")} className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    <span>Export</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Revenue Line Chart */}
                  <div className="md:col-span-2 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-1">Revenue Performance Trend</span>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={salesTrends.trend_data}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="period" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${val / 100000}L`} />
                          <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Sales']} />
                          <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-1">Top products</span>
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead>
                        <tr className="border-b border-slate-50 text-[9px] uppercase font-bold text-slate-400">
                          <th className="pb-1.5">Product</th>
                          <th className="pb-1.5 text-right">Qty</th>
                          <th className="pb-1.5 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {salesTrends.top_products.map((prod, idx) => (
                          <tr key={idx}>
                            <td className="py-2 font-bold text-slate-800">{prod.name}</td>
                            <td className="py-2 text-right font-bold text-slate-600">{prod.quantity}</td>
                            <td className="py-2 text-right font-extrabold text-slate-900">₹{prod.revenue.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
      </div>
    </div>
  );
}
