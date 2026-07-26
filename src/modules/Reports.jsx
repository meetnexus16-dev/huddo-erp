import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Filter, ChevronRight, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const formatINR = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const REPORT_TYPES = [
  { id: 'sales', label: 'Sales Reports', financial: true },
  { id: 'revenue', label: 'Revenue Analysis', financial: true },
  { id: 'commission', label: 'Commission Ledgers', financial: true },
  { id: 'retailer', label: 'Retailer Rankings', financial: true },
  { id: 'employee', label: 'Employee Performance', financial: false },
  { id: 'team', label: 'Team Progress', financial: false },
  { id: 'product', label: 'Product Catalog Metrics', financial: true },
  { id: 'stock', label: 'Stock Levels', financial: false }
];

function defaultDateRange() {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), 1);
  const toInput = (d) => d.toISOString().slice(0, 10);
  return { startDate: toInput(start), endDate: toInput(end) };
}

export default function Reports({ showToast, userRole }) {
  const isCeo = userRole === 'CEO';
  const initial = defaultDateRange();
  const [selectedReportType, setSelectedReportType] = useState(isCeo ? 'employee' : 'sales');
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allowedTypes = useMemo(
    () => REPORT_TYPES.filter((rpt) => !isCeo || !rpt.financial),
    [isCeo]
  );

  const loadReport = useCallback(() => {
    if (isCeo && REPORT_TYPES.find((r) => r.id === selectedReportType)?.financial) {
      setRows([]);
      setSummary(null);
      setError('Access denied: CEO has no access to financial reports.');
      return;
    }

    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    fetch(`/api/reports/${selectedReportType}?${params.toString()}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.success) {
          throw new Error(body.message || `Failed to load ${selectedReportType} report.`);
        }
        setRows(Array.isArray(body.data) ? body.data : []);
        setSummary(body.summary || null);
      })
      .catch((err) => {
        setRows([]);
        setSummary(null);
        setError(err.message || 'Failed to load report.');
        showToast?.(err.message || 'Failed to load report.', 'error');
      })
      .finally(() => setLoading(false));
  }, [selectedReportType, startDate, endDate, isCeo, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const chartData = useMemo(() => {
    return rows.slice(0, 12).map((r) => {
      const label = (r.name || r.period || '—').toString();
      return {
        name: label.length > 16 ? `${label.slice(0, 14)}…` : label,
        amount: Number(r.amount ?? r.revenue ?? r.quantity ?? r.sold ?? 0),
        orders: Number(r.orders ?? r.invoices ?? 0),
        sold: Number(r.sold ?? r.pairs ?? r.quantity ?? 0)
      };
    });
  }, [rows]);

  const chartMetric = useMemo(() => {
    if (selectedReportType === 'product' || selectedReportType === 'stock') {
      return isCeo || selectedReportType === 'stock' ? 'sold' : 'amount';
    }
    return 'amount';
  }, [selectedReportType, isCeo]);

  const handleExport = (format) => {
    if (!rows.length) {
      showToast?.('No data to export for this report.', 'error');
      return;
    }

    const headersByType = {
      sales: ['Zone / State', 'Orders', 'Pairs', 'Target (₹)', 'Sales (₹)'],
      revenue: ['Period', 'Invoices', 'CGST', 'SGST', 'IGST', 'Collected (₹)'],
      commission: ['User', 'Email', 'Type', 'Approved', 'Paid', 'Pending', 'Earned (₹)'],
      retailer: ['Retailer', 'Owner', 'City', 'Category', 'Orders', 'Pairs', 'Sales (₹)'],
      employee: ['Employee', 'Code', 'Orders', 'Target', 'Achieved %', 'Sales (₹)'],
      team: ['Team', 'Department', 'Leader', 'Members', 'Orders', 'Sales (₹)'],
      product: ['Product', 'Category', 'Pairs Sold', 'Sell-out Pairs', 'Revenue (₹)'],
      stock: ['Product', 'SKU', 'Size', 'Color', 'Stock Qty', 'Warehouse Qty']
    };

    const headers = headersByType[selectedReportType] || ['Name', 'Value'];
    const lineOf = (r) => {
      switch (selectedReportType) {
        case 'sales':
          return [r.name, r.orders, r.pairs, r.target, r.amount];
        case 'revenue':
          return [r.period || r.name, r.invoices, r.cgst, r.sgst, r.igst, r.amount];
        case 'commission':
          return [r.name, r.email, r.type, r.approved, r.paid, r.pending, r.amount];
        case 'retailer':
          return [r.name, r.owner, r.city, r.category, r.orders, r.pairs, r.amount];
        case 'employee':
          return [r.name, r.code, r.orders, r.target, r.achievementPct, r.amount];
        case 'team':
          return [r.name, r.department, r.leader, r.members, r.orders, r.amount];
        case 'product':
          return [r.name, r.category, r.sold, r.sellOutPairs, r.revenue];
        case 'stock':
          return [r.name, r.sku, r.size, r.color, r.quantity, r.warehouseQty];
        default:
          return [r.name, r.amount];
      }
    };

    const csvContent =
      headers.join(',') +
      '\n' +
      rows
        .map((r) =>
          lineOf(r)
            .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
            .join(',')
        )
        .join('\n');

    const filename = `huddo_${selectedReportType}_report_${Date.now()}.${format === 'excel' ? 'csv' : format}`;
    const finalContent =
      format === 'pdf'
        ? `--- HUDDO SHOES ERP REPORT ---\nReport: ${selectedReportType.toUpperCase()}\nRange: ${startDate} to ${endDate}\nGenerated: ${new Date().toLocaleString()}\n\n${csvContent}`
        : csvContent;

    const blob = new Blob([finalContent], {
      type: format === 'pdf' ? 'text/plain;charset=utf-8;' : 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.(`Downloaded ${selectedReportType.toUpperCase()} report.`, 'success');
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="p-10 text-center text-xs text-slate-400 font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin inline mr-2 text-brand-orange" />
          Loading live report data...
        </div>
      );
    }

    if (error) {
      return <div className="p-8 text-center text-rose-600 font-bold text-xs">{error}</div>;
    }

    if (!rows.length) {
      return (
        <div className="p-8 text-center text-slate-400 font-semibold text-xs">
          No records found for this report in the selected date range.
        </div>
      );
    }

    const tableClass = 'w-full text-left text-xs font-semibold text-slate-700';
    const th = 'px-6 py-3';
    const td = 'px-6 py-3.5';

    if (selectedReportType === 'sales') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>State / Zone</th>
              <th className={`${th} text-right`}>Orders</th>
              <th className={`${th} text-right`}>Pairs</th>
              <th className={`${th} text-right`}>Target (₹)</th>
              <th className={`${th} text-right`}>Achieved Sales (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td} text-slate-900 font-bold`}>{row.name}</td>
                <td className={`${td} text-right text-slate-600`}>{row.orders}</td>
                <td className={`${td} text-right text-slate-600`}>{row.pairs}</td>
                <td className={`${td} text-right`}>{formatINR(row.target)}</td>
                <td className={`${td} text-right text-slate-900 font-bold`}>{formatINR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'revenue') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Period</th>
              <th className={`${th} text-right`}>Invoices / Orders</th>
              <th className={`${th} text-right`}>CGST</th>
              <th className={`${th} text-right`}>SGST</th>
              <th className={`${th} text-right`}>IGST</th>
              <th className={`${th} text-right`}>Collected (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td} text-slate-900 font-bold`}>{row.period || row.name}</td>
                <td className={`${td} text-right`}>{row.invoices}</td>
                <td className={`${td} text-right`}>{formatINR(row.cgst)}</td>
                <td className={`${td} text-right`}>{formatINR(row.sgst)}</td>
                <td className={`${td} text-right`}>{formatINR(row.igst)}</td>
                <td className={`${td} text-right font-bold`}>{formatINR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'commission') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>User</th>
              <th className={th}>Type</th>
              <th className={`${th} text-right`}>Approved</th>
              <th className={`${th} text-right`}>Paid</th>
              <th className={`${th} text-right`}>Pending</th>
              <th className={`${th} text-right`}>Earned (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td}`}>
                  <div className="font-bold text-slate-900">{row.name}</div>
                  <div className="text-[10px] text-slate-400">{row.email}</div>
                </td>
                <td className={`${td} text-slate-600`}>{row.type}</td>
                <td className={`${td} text-right`}>{row.approved}</td>
                <td className={`${td} text-right`}>{row.paid}</td>
                <td className={`${td} text-right`}>{row.pending}</td>
                <td className={`${td} text-right font-bold`}>{formatINR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'retailer') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Retailer</th>
              <th className={th}>City</th>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Orders</th>
              <th className={`${th} text-right`}>Pairs</th>
              <th className={`${th} text-right`}>Sales (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td}`}>
                  <div className="font-bold text-slate-900">{row.name}</div>
                  <div className="text-[10px] text-slate-400">{row.owner}</div>
                </td>
                <td className={`${td} text-slate-600`}>{row.city}</td>
                <td className={`${td} text-slate-600`}>{row.category}</td>
                <td className={`${td} text-right`}>{row.orders}</td>
                <td className={`${td} text-right`}>{row.pairs}</td>
                <td className={`${td} text-right font-bold`}>{formatINR(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'employee') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Employee</th>
              <th className={th}>Code</th>
              <th className={`${th} text-right`}>Orders</th>
              {!isCeo && <th className={`${th} text-right`}>Sales (₹)</th>}
              <th className={`${th} text-right`}>Target</th>
              <th className={`${th} text-right`}>Achievement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td} font-bold text-slate-900`}>{row.name}</td>
                <td className={`${td} text-slate-500`}>{row.code}</td>
                <td className={`${td} text-right`}>{row.orders}</td>
                {!isCeo && <td className={`${td} text-right font-bold`}>{formatINR(row.amount)}</td>}
                <td className={`${td} text-right`}>{formatINR(row.target)}</td>
                <td className={`${td} text-right font-bold text-emerald-600`}>{row.achievementPct || 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'team') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Team</th>
              <th className={th}>Department</th>
              <th className={th}>Leader</th>
              <th className={`${th} text-right`}>Members</th>
              <th className={`${th} text-right`}>Orders</th>
              {!isCeo && <th className={`${th} text-right`}>Sales (₹)</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td} font-bold text-slate-900`}>{row.name}</td>
                <td className={`${td} text-slate-600`}>{row.department}</td>
                <td className={`${td} text-slate-600`}>{row.leader}</td>
                <td className={`${td} text-right`}>{row.members}</td>
                <td className={`${td} text-right`}>{row.orders}</td>
                {!isCeo && <td className={`${td} text-right font-bold`}>{formatINR(row.amount)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'product') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>Category</th>
              <th className={`${th} text-right`}>Pairs Sold (Wholesale)</th>
              <th className={`${th} text-right`}>Sell-out Pairs</th>
              {!isCeo && <th className={`${th} text-right`}>Wholesale Revenue</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td className={`${td} font-bold text-slate-900`}>{row.name}</td>
                <td className={`${td} text-slate-400`}>{row.category}</td>
                <td className={`${td} text-right`}>{row.sold} pairs</td>
                <td className={`${td} text-right`}>{row.sellOutPairs || 0}</td>
                {!isCeo && <td className={`${td} text-right font-bold`}>{formatINR(row.revenue)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReportType === 'stock') {
      return (
        <table className={tableClass}>
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
            <tr>
              <th className={th}>Product</th>
              <th className={th}>SKU</th>
              <th className={th}>Size</th>
              <th className={th}>Color</th>
              <th className={`${th} text-right`}>Stock Qty</th>
              <th className={`${th} text-right`}>Warehouse Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <tr key={idx} className={row.quantity <= 10 ? 'bg-rose-50/40' : ''}>
                <td className={`${td} font-bold text-slate-900`}>{row.name}</td>
                <td className={`${td} font-mono text-[11px] text-slate-500`}>{row.sku}</td>
                <td className={td}>{row.size}</td>
                <td className={td}>{row.color}</td>
                <td className={`${td} text-right font-bold`}>{row.quantity}</td>
                <td className={`${td} text-right`}>{row.warehouseQty || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2 self-start">
          <span className="block text-[10px] uppercase font-bold text-slate-400 p-2">Reports Categories</span>
          {allowedTypes.map((rpt) => (
            <button
              key={rpt.id}
              type="button"
              onClick={() => setSelectedReportType(rpt.id)}
              className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-between ${
                selectedReportType === rpt.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{rpt.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none bg-white font-semibold"
              />
              <span className="text-[10px] text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs border border-slate-200 rounded p-1.5 focus:outline-none bg-white font-semibold"
              />
              <button
                type="button"
                onClick={loadReport}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 bg-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="flex gap-2">
              {['csv', 'excel', 'pdf'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => handleExport(fmt)}
                  className="px-2.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold uppercase text-slate-700 bg-white flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>{fmt}</span>
                </button>
              ))}
            </div>
          </div>

          {summary && !loading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(summary).map(([key, value]) => (
                <div key={key} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <p className="text-lg font-extrabold text-slate-850 mt-0.5">
                    {typeof value === 'number' && /sales|revenue|collected|earned|amount/i.test(key)
                      ? formatINR(value)
                      : value}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-4 font-display capitalize">
              {selectedReportType} Report Visualization
            </h3>
            <div className="h-56">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2 text-brand-orange" />
                  Loading chart...
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                  <span className="text-xs font-semibold text-slate-400">No chart data for this range.</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" angle={-20} textAnchor="end" height={50} interval={0} />
                    <YAxis
                      fontSize={10}
                      stroke="#94a3b8"
                      tickFormatter={
                        chartMetric === 'amount' && !isCeo
                          ? (val) => (val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${val}`)
                          : (val) => val
                      }
                    />
                    <Tooltip
                      formatter={(value) =>
                        chartMetric === 'amount' && !isCeo ? formatINR(value) : value
                      }
                    />
                    <Bar
                      dataKey={chartMetric}
                      fill={selectedReportType === 'product' || selectedReportType === 'stock' ? '#3b82f6' : '#f97316'}
                      radius={[4, 4, 0, 0]}
                      name={
                        chartMetric === 'sold'
                          ? selectedReportType === 'stock'
                            ? 'Stock Qty'
                            : 'Pairs'
                          : 'Amount (₹)'
                      }
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <span className="block px-6 py-4 border-b border-slate-100 font-bold text-slate-800 font-display capitalize">
              {selectedReportType} Report Output Ledger
            </span>
            <div className="overflow-x-auto">{renderTable()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
