import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { RefreshCw, MapPin, Package, Filter, TrendingUp } from 'lucide-react';

const formatINR = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function ProductPerformanceAnalytics({ showToast }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);
  const [countryId, setCountryId] = useState('');
  const [stateId, setStateId] = useState('');
  const [cityId, setCityId] = useState('');
  const [productId, setProductId] = useState('');
  const [sortBy, setSortBy] = useState('pairs');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/countries?limit=200')
      .then((r) => r.json())
      .then((res) => { if (res.success) setCountries(res.data || []); })
      .catch(() => {});
    fetch('/api/states?limit=500')
      .then((r) => r.json())
      .then((res) => { if (res.success) setStates(res.data || []); })
      .catch(() => {});
    fetch('/api/cities?limit=1000')
      .then((r) => r.json())
      .then((res) => { if (res.success) setCities(res.data || []); })
      .catch(() => {});
    fetch('/api/products?limit=500')
      .then((r) => r.json())
      .then((res) => { if (res.success) setProducts(res.data || []); })
      .catch(() => {});
  }, []);

  const filteredStates = states.filter((s) => {
    if (!countryId) return true;
    const cid = s.country?._id || s.country;
    return String(cid) === String(countryId);
  });

  const filteredCities = cities.filter((c) => {
    if (!stateId) return true;
    const sid = c.state?._id || c.state;
    return String(sid) === String(stateId);
  });

  useEffect(() => {
    setStateId('');
    setCityId('');
  }, [countryId]);

  useEffect(() => {
    setCityId('');
  }, [stateId]);

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (countryId) params.set('country', countryId);
    if (stateId) params.set('state', stateId);
    if (cityId) params.set('city', cityId);
    if (productId) params.set('product', productId);
    if (sortBy) params.set('sort_by', sortBy);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('limit', '50');

    fetch(`/api/analytics/product-performance?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setData(null);
          showToast?.(res.message || 'Failed to load product analytics.', 'error');
        }
      })
      .catch(() => {
        setData(null);
        showToast?.('Failed to load product analytics.', 'error');
      })
      .finally(() => setLoading(false));
  }, [countryId, stateId, cityId, productId, sortBy, startDate, endDate, showToast]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const summary = data?.summary;
  const productRows = data?.products || [];
  const placeRows = data?.places || [];
  const chartData = productRows.slice(0, 12).map((p) => ({
    name: (p.product_name || 'Product').length > 18
      ? `${(p.product_name || '').slice(0, 16)}…`
      : p.product_name,
    pairs: p.pairs_sold,
    revenue: p.revenue,
    sales: p.sale_count
  }));

  const placeChart = placeRows.slice(0, 12).map((p) => ({
    name: (p.place_name || 'Place').length > 16
      ? `${(p.place_name || '').slice(0, 14)}…`
      : p.place_name,
    pairs: p.pairs_sold,
    revenue: p.revenue,
    sales: p.sale_count
  }));

  const placeLabel =
    summary?.place_grain === 'city' ? 'Cities' :
    summary?.place_grain === 'state' ? 'States' : 'Countries';

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 font-display">
          <Filter className="w-4 h-4 text-brand-orange" />
          Place &amp; product filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Country</label>
            <select
              value={countryId}
              onChange={(e) => setCountryId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">State</label>
            <select
              value={stateId}
              onChange={(e) => setStateId(e.target.value)}
              disabled={!countryId}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white disabled:bg-slate-50"
            >
              <option value="">All states</option>
              {filteredStates.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">City</label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              disabled={!stateId}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white disabled:bg-slate-50"
            >
              <option value="">All cities</option>
              {filteredCities.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
            >
              <option value="pairs">Pairs sold</option>
              <option value="revenue">Revenue</option>
              <option value="sales">Sale count</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-400 mb-0.5">To</label>
            <div className="flex gap-1.5">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
              />
              <button
                type="button"
                onClick={loadAnalytics}
                className="px-2.5 rounded-lg border border-slate-200 hover:border-brand-orange/40 text-slate-600"
                title="Reload"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-orange' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Package className="w-3 h-3" /> Pairs sold
          </span>
          <p className="text-xl font-extrabold text-slate-850 mt-1">{summary?.total_pairs_sold ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Sale entries
          </span>
          <p className="text-xl font-extrabold text-slate-850 mt-1">{summary?.total_sale_entries ?? 0}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Revenue</span>
          <p className="text-xl font-extrabold text-brand-orange mt-1">{formatINR(summary?.total_revenue)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[9px] font-bold text-slate-400 uppercase">Discounts given</span>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{formatINR(summary?.total_discount)}</p>
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-brand-orange" />
          Loading sell-out analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 font-display">Top products by {sortBy === 'revenue' ? 'revenue' : sortBy === 'sales' ? 'sale hits' : 'pairs'}</h3>
              <div className="h-64">
                {chartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No retail sell-out data yet. Sales created by retailers will appear here.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" angle={-25} textAnchor="end" interval={0} />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'revenue' ? formatINR(value) : value,
                          name === 'pairs' ? 'Pairs' : name === 'revenue' ? 'Revenue' : 'Sale hits'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey={sortBy === 'revenue' ? 'revenue' : sortBy === 'sales' ? 'sales' : 'pairs'} fill="#f97316" radius={[4, 4, 0, 0]} name={sortBy === 'revenue' ? 'Revenue' : sortBy === 'sales' ? 'Sale hits' : 'Pairs'} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-3 font-display flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-orange" />
                Performance by {placeLabel.toLowerCase()}
              </h3>
              <div className="h-64">
                {placeChart.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">No place breakdown yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={placeChart} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={9} stroke="#94a3b8" angle={-25} textAnchor="end" interval={0} />
                      <YAxis fontSize={10} stroke="#94a3b8" />
                      <Tooltip
                        formatter={(value, name) => [
                          name === 'revenue' ? formatINR(value) : value,
                          name === 'pairs' ? 'Pairs' : name === 'revenue' ? 'Revenue' : 'Sales'
                        ]}
                      />
                      <Bar dataKey={sortBy === 'revenue' ? 'revenue' : sortBy === 'sales' ? 'sales' : 'pairs'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 font-display">Product performance detail</h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                Pairs sold, sale line hits, and revenue for the selected place. Expand place columns show where each product sells best.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Pairs sold</th>
                    <th className="px-4 py-3 text-right">Sale hits</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Discount</th>
                    <th className="px-4 py-3">Top places</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-semibold">
                        No sell-out data for this filter. Retailers must create sales for analytics to populate.
                      </td>
                    </tr>
                  ) : (
                    productRows.map((row, idx) => (
                      <tr key={String(row.product_id)} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{row.product_name}</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">{row.pairs_sold}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{row.sale_count}</td>
                        <td className="px-4 py-3 text-right font-bold text-brand-orange">{formatINR(row.revenue)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatINR(row.discount_amount)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {(row.places || []).slice(0, 3).map((pl) => (
                            <span
                              key={`${pl.place_id}-${pl.place_name}`}
                              className="inline-block mr-1.5 mb-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-150 text-[10px] font-semibold"
                            >
                              {pl.place_name}: {pl.pairs_sold}p / {formatINR(pl.revenue)}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {stateId && placeRows.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  All products across {placeLabel.toLowerCase()} in selected state
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Place</th>
                      <th className="px-4 py-3 text-right">Pairs</th>
                      <th className="px-4 py-3 text-right">Sales</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3">Leading products</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {placeRows.map((pl) => (
                      <tr key={String(pl.place_id || pl.place_name)}>
                        <td className="px-4 py-3 font-bold text-slate-800">{pl.place_name}</td>
                        <td className="px-4 py-3 text-right font-extrabold">{pl.pairs_sold}</td>
                        <td className="px-4 py-3 text-right">{pl.sale_count}</td>
                        <td className="px-4 py-3 text-right font-bold text-brand-orange">{formatINR(pl.revenue)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {(pl.products || []).slice(0, 4).map((p) => (
                            <span
                              key={String(p.product_id)}
                              className="inline-block mr-1.5 mb-1 px-2 py-0.5 rounded-md bg-orange-50 border border-orange-100 text-[10px] font-semibold text-slate-700"
                            >
                              {p.product_name}: {p.pairs_sold}p
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
