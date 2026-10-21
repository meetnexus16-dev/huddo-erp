import React, { useState, useEffect } from 'react';
import { Users, Mail, Phone, MapPin, Calendar, ShoppingBag, IndianRupee, ArrowLeft, Eye, RefreshCw, X, Download, FileText, Store } from 'lucide-react';
import { DataTable } from '../components/Common';
import { generateRetailInvoicePdf } from '../utils/generateRetailInvoicePdf';

// HUDDO-UPDATE: Customers — Brand new module for capturing retail end-consumers and logging full transactions
export default function Customers({ showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cityFilter, setCityFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingCust, setViewingCust] = useState(null); // customer details view
  const [custHistory, setCustHistory] = useState([]);
  const [retailSales, setRetailSales] = useState([]);

  // Fetch captured customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = `/api/customers?search=${encodeURIComponent(searchTerm)}&city=${encodeURIComponent(cityFilter)}`;
      const res = await fetch(url);
      const data = await res.json();
      setCustomers(data);
    } catch (e) {
      console.error(e);
      showToast("Failed to fetch customer directory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [cityFilter, searchTerm]);

  // Inspect customer detail
  const handleInspectCustomer = async (cust) => {
    try {
      const idToFetch = cust.id || cust._id;
      const res = await fetch(`/api/customers/${idToFetch}`);
      const data = await res.json();
      if (res.ok) {
        setViewingCust(data.customer || cust);
        setCustHistory(data.history || []);
        setRetailSales(data.retailSales || []);
      } else {
        showToast(data.error || "Customer details not found", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error retrieving customer details", "error");
    }
  };

  const columns = [
    { header: "Customer Name", accessor: "customer_name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Mobile Number", accessor: "mobile", render: (val) => <span className="font-mono text-xs font-bold text-slate-600">{val}</span> },
    { header: "Email", accessor: "email", render: (val) => <span className="text-slate-500 font-medium">{val}</span> },
    { header: "City", accessor: "city" },
    { header: "Orders Count", accessor: "totalOrders", render: (val) => <span className="font-bold text-slate-900">{val}</span> },
    { header: "Total Spend (₹)", accessor: "totalSpend", render: (val) => <span className="font-bold text-indigo-600">₹{val.toLocaleString('en-IN')}</span> },
    { header: "Last Order Date", accessor: "lastOrderDate", render: (val) => <span className="text-xs text-slate-400">{val}</span> },
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <button 
        onClick={() => handleInspectCustomer(row)}
        className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 font-semibold text-xs rounded transition-all"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Inspect History</span>
      </button>
    )}
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Captured Retail Consumers</h1>
          <p className="text-sm text-slate-500 font-medium">Track and manage end-user customer registrations, orders history, and lifetime expenditure metrics.</p>
        </div>
        <button 
          onClick={fetchCustomers}
          className="flex items-center gap-2 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 bg-white transition-colors self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Directory</span>
        </button>
      </div>

      {/* Directory filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase">Filter by City:</span>
          <select 
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg p-2 bg-white font-bold focus:outline-none"
          >
            <option value="All">All Regions</option>
            <option value="Mumbai">Mumbai</option>
            <option value="Pune">Pune</option>
            <option value="New Delhi">New Delhi</option>
            <option value="Bengaluru">Bengaluru</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Chennai">Chennai</option>
          </select>
        </div>
        <div className="text-xs font-semibold text-slate-400">
          {customers.length} retail accounts mapped in system database
        </div>
      </div>

      {/* Table grid */}
      <DataTable 
        columns={columns} 
        data={customers} 
        searchKeys={["customer_name", "mobile", "email", "city"]} 
        searchPlaceholder="Search captured customers by name or mobile..."
        emptyStateText="No registered retail consumers found."
      />

      {/* Side Inspect Drawer */}
      {viewingCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-indigo-600" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">{viewingCust.customer_name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">{viewingCust.city} • Lifetime Spend: ₹{viewingCust.totalSpend.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button onClick={() => setViewingCust(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Consumer Profile Details</h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{viewingCust.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{viewingCust.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{viewingCust.city} Region</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Active since {viewingCust.lastOrderDate}</span>
                  </div>
                </div>
              </div>

              {/* Retail Counter Purchases (Westside Store Invoices) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Retail Store Counter Purchases ({retailSales.length})</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">Point of Sale (POS) Bills</span>
                </div>

                {retailSales.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-3.5 py-2.5">Invoice #</th>
                          <th className="px-3.5 py-2.5">Date</th>
                          <th className="px-3.5 py-2.5">Store / Counter</th>
                          <th className="px-3.5 py-2.5 text-center">Pairs</th>
                          <th className="px-3.5 py-2.5 text-right">Grand Total</th>
                          <th className="px-3.5 py-2.5 text-center">Mode</th>
                          <th className="px-3.5 py-2.5 text-right">Tax Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {retailSales.map((sale, idx) => (
                          <tr key={sale._id || sale.id || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-3.5 py-2.5 font-bold text-slate-900 font-mono text-[11px]">
                              {sale.sale_number || `SALE-${idx + 1}`}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-500 text-[11px]">
                              {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('en-IN') : 'Today'}
                            </td>
                            <td className="px-3.5 py-2.5 text-slate-700">
                              <span className="truncate max-w-[130px] block">
                                {sale.retailer?.business_name || sale.retailer_name || 'Retail Counter'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-bold text-slate-800">
                              {sale.pairs_sold || (Array.isArray(sale.items) ? sale.items.reduce((s, i) => s + (Number(i.quantity) || 1), 0) : 1)}
                            </td>
                            <td className="px-3.5 py-2.5 text-right font-bold text-indigo-600">
                              ₹{(Number(sale.grand_total) || 0).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3.5 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                                {sale.payment_mode || 'Cash'}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <button
                                onClick={() => generateRetailInvoicePdf(sale, sale.retailer || {})}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                                title="Download Westside PDF Bill"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF Bill</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-semibold">
                    <span>No store counter purchases recorded yet for this customer.</span>
                  </div>
                )}
              </div>

              {/* Wholesale Invoices History (if applicable) */}
              {custHistory.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Wholesale / Direct Invoices ({custHistory.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Invoice ID</th>
                          <th className="px-4 py-2.5">Order Ref</th>
                          <th className="px-4 py-2.5">Invoice Date</th>
                          <th className="px-4 py-2.5 text-right">Invoice Amount</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {custHistory.map((item, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2.5 font-bold text-slate-800 font-mono">{item.id}</td>
                            <td className="px-4 py-2.5 text-slate-500 font-mono">{item.orderId}</td>
                            <td className="px-4 py-2.5 text-slate-400">{item.date}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{item.total.toLocaleString('en-IN')}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
