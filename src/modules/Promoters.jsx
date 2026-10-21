import React, { useState, useEffect } from 'react';
import { Award, Plus, Eye, DollarSign, Edit, Save, Trash, UserCheck, ShieldAlert, X } from 'lucide-react';
import { initialRoyaltyConfig } from '../mockData';
import { DataTable, Modal } from '../components/Common';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Promoters({ showToast }) {
  const [promoters, setPromoters] = useState([]);
  const [royaltyConfig, setRoyaltyConfig] = useState(initialRoyaltyConfig);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingPromoter, setViewingPromoter] = useState(null);
  const [promoterTab, setPromoterTab] = useState('overview'); // overview | revenue

  // HUDDO-UPDATE: Promoters — Paid/Unpaid payment status states
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('All'); // All | Paid | Unpaid

  // HUDDO-UPDATE: Promoters — Revenue billing chain list state
  const [revenueBillings, setRevenueBillings] = useState([]);
  const [billingPage, setBillingPage] = useState(1);
  const itemsPerBillingPage = 5;

  const loadPromoters = () => {
    fetch('/api/promoters')
      .then(res => res.json())
      .then(resData => {
        if (resData.success !== false && resData.data && Array.isArray(resData.data)) {
          setPromoters(resData.data.map(p => ({
            id: p.promoter_id || p._id,
            name: p.full_name || p.name,
            code: p.promoter_code,
            mobile: p.mobile_number || p.mobile,
            email: p.email,
            cities: p.cities || [],
            retailersAdded: p.total_retailers_mapped || 0,
            revenue: p.current_month_revenue || 0,
            royaltyEarned: p.total_royalty_earned || 0,
            royaltyPending: p.pending_royalty || 0,
            royaltySettled: (p.total_royalty_earned || 0) - (p.pending_royalty || 0),
            status: p.status || 'Active'
          })));
        } else if (Array.isArray(resData)) {
          setPromoters(resData.map(p => ({
            id: p._id,
            name: p.name,
            code: p.promoter_code,
            mobile: p.mobile,
            email: p.email,
            cities: [],
            retailersAdded: p.retailers?.length || 0,
            revenue: 0,
            royaltyEarned: p.total_royalty_earned || 0,
            royaltyPending: 0,
            royaltySettled: p.total_royalty_earned || 0,
            status: p.is_active ? 'Active' : 'Inactive'
          })));
        }
      })
      .catch(err => console.error("Error loading promoters:", err));
  };

  useEffect(() => {
    loadPromoters();
  }, []);

  useEffect(() => {
    if (viewingPromoter) {
      fetch(`/api/promoters/${viewingPromoter.id}/revenue`)
        .then(res => res.json())
        .then(resData => {
          if (resData && Array.isArray(resData.revenue_list)) {
            setRevenueBillings(resData.revenue_list.map(bill => ({
              id: bill.invoice_number || bill.id || bill._id,
              date: bill.invoice_date || bill.synced_at,
              shopName: bill.retailer_name,
              city: bill.retailer_city || 'Mumbai',
              total: bill.invoice_amount || bill.total_amount,
              status: bill.payment_status
            })));
          } else {
            setRevenueBillings([]);
          }
        })
        .catch(err => console.error("Error loading promoter revenue billings", err));
    } else {
      setRevenueBillings([]);
      setBillingPage(1);
    }
  }, [viewingPromoter]);

  // New Promoter Form
  const [formData, setFormData] = useState({
    name: '', mobile: '', email: '', address: '', aadhaar: '', pan: '', gst: '',
    bankName: '', accountNo: '', ifsc: '', cities: []
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.email) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    const payload = {
      full_name: formData.name,
      mobile_number: formData.mobile,
      email: formData.email,
      address: formData.address,
      profile_photo_url: '',
      aadhaar_number: formData.aadhaar,
      pan_number: formData.pan,
      gst_number: formData.gst,
      bank_account_number: formData.accountNo,
      bank_ifsc: formData.ifsc,
      bank_name: formData.bankName,
      royalty_percentage: 5.0
    };

    fetch('/api/promoters/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(`Promoter "${formData.name}" registered successfully with code ${resData.promoter_code}.`, "success");
          setIsAddOpen(false);
          setFormData({
            name: '', mobile: '', email: '', address: '', aadhaar: '', pan: '', gst: '',
            bankName: '', accountNo: '', ifsc: '', cities: []
          });
          loadPromoters();
        } else {
          showToast(resData.message || "Registration failed.", "error");
        }
      })
      .catch(err => {
        console.error("Error registering promoter:", err);
        showToast("Error registering promoter.", "error");
      });
  };

  const handleUpdateRoyaltyPercent = (productId, newPercent) => {
    setRoyaltyConfig(royaltyConfig.map(item => 
      item.productId === productId ? { ...item, royaltyPercent: newPercent === '' ? '' : newPercent } : item
    ));
  };

  const handleSaveRoyaltyConfig = () => {
    showToast("Royalty percentages updated and propagated globally.", "success");
  };

  const toggleCityOption = (name) => {
    if (formData.cities.includes(name)) {
      setFormData({ ...formData, cities: formData.cities.filter(t => t !== name) });
    } else {
      setFormData({ ...formData, cities: [...formData.cities, name] });
    }
  };

  // Promoter Table Columns
  const columns = [
    { header: "Name", accessor: "name", render: (val) => <span className="font-bold text-slate-800 font-display">{val}</span> },
    { header: "Code ID", accessor: "code", render: (val) => <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">{val}</code> },
    { header: "Mobile", accessor: "mobile" },
    { header: "Retailers Mapped", accessor: "retailersAdded", render: (val) => <span className="font-bold text-slate-700">{val} shops</span> },
    { header: "Revenue (₹)", accessor: "revenue", render: (val) => <span className="font-bold text-slate-900">₹{val.toLocaleString('en-IN')}</span> },
    // HUDDO-UPDATE: Promoters — Earned Royalty label updated to show 5%
    { header: "Earned Royalty (5%)", accessor: "royaltyEarned", render: (val) => <span className="font-bold text-emerald-600">₹{val.toLocaleString('en-IN')}</span> },
    // HUDDO-UPDATE: Promoters — Paid/Unpaid payment status
    { 
      header: "Payment Status", 
      accessor: (row) => row.royaltyPending > 0 ? "Unpaid" : "Paid",
      render: (val) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {val}
        </span>
      )
    },
    { header: "Status", accessor: "status", render: (val) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${val === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
        {val}
      </span>
    )},
    { header: "Actions", accessor: "id", sortable: false, render: (val, row) => (
      <div className="flex gap-2">
        <button onClick={() => { setViewingPromoter(row); setPromoterTab('overview'); }} className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition-colors" title="View details & royalty summary">
          <Eye className="w-4 h-4" />
        </button>
        <button 
          onClick={() => {
            const nextStatus = row.status === 'Active' ? 'Inactive' : 'Active';
            fetch(`/api/promoters/${row.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_active: nextStatus === 'Active' })
            })
              .then(res => res.json())
              .then(resData => {
                if (resData.updated) {
                  showToast(`Status toggled for ${row.name}`, "success");
                  loadPromoters();
                } else {
                  showToast(resData.message || "Failed to toggle status.", "error");
                }
              })
              .catch(err => {
                console.error("Error toggling status:", err);
                showToast("Failed to toggle status.", "error");
              });
          }}
          className="text-xs font-semibold text-brand-orange hover:underline"
        >
          Toggle Active
        </button>
      </div>
    )}
  ];

  const filteredPromoters = promoters.filter(p => {
    const status = p.royaltyPending > 0 ? "Unpaid" : "Paid";
    return filterPaymentStatus === 'All' || status === filterPaymentStatus;
  });

  // Mock royalty monthly data for detail view
  const mockRoyaltyTrend = [
    { month: 'Jan', royalty: 18000 },
    { month: 'Feb', royalty: 24000 },
    { month: 'Mar', royalty: 31000 },
    { month: 'Apr', royalty: 28000 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Promoter Management</h1>
          <p className="text-sm text-slate-500">Track promoter activations, view mapped retailers growth, audit accrued royalty ledgers, and set product commissions.</p>
        </div>
        
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Promoter Code</span>
        </button>
      </div>

      {/* HUDDO-UPDATE: Promoters — Paid/Unpaid payment status filter */}
      <div className="flex border-b border-slate-200 overflow-x-auto whitespace-nowrap scrollbar-none">
        {['All', 'Paid', 'Unpaid'].map(status => (
          <button
            key={status}
            onClick={() => setFilterPaymentStatus(status)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              filterPaymentStatus === status ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Promoters roster */}
      <DataTable 
        columns={columns} 
        data={filteredPromoters}
        searchKeys={["name", "code", "mobile"]}
        searchPlaceholder="Search by name, promoter code, or mobile number..."
      />

      {/* Product Royalty Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-display">Product-wise Promoter Royalty Setup (%)</h3>
            <p className="text-xs text-slate-400 font-semibold">Define base royalty percentages applied when promoters secure orders for these specific model categories.</p>
          </div>
          <button 
            onClick={handleSaveRoyaltyConfig}
            className="flex items-center gap-1.5 px-3 py-2 bg-brand-dark text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>

        <div className="border border-slate-100 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sizes Mapped</th>
                <th className="px-4 py-3 text-right">Royalty % (Editable)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {royaltyConfig.map(prod => (
                <tr key={prod.productId}>
                  <td className="px-4 py-3 text-slate-900">{prod.name}</td>
                  <td className="px-4 py-3 text-slate-500">{prod.category}</td>
                  <td className="px-4 py-3 text-slate-400">{prod.size}</td>
                  <td className="px-4 py-3 text-right">
                    <input 
                      type="number"
                      step="0.1"
                      placeholder="0.0"
                      value={prod.royaltyPercent ?? ''}
                      onChange={(e) => handleUpdateRoyaltyPercent(prod.productId, e.target.value)}
                      className="border border-slate-200 text-slate-800 rounded p-1 w-20 text-right font-bold focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                    <span className="ml-1 text-slate-400">%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Promoter Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Promoter Code"
        onConfirm={handleAddSubmit}
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Full Name *</label>
              <input type="text" placeholder="Gaurav Sharma" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Mobile Number *</label>
              <input type="text" placeholder="9810xxxxxx" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Email Address *</label>
              <input type="email" placeholder="gaurav@huddo.in" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">GST Code (Optional)</label>
              <input type="text" placeholder="27AAAAA1111A1Z1" value={formData.gst} onChange={(e) => setFormData({...formData, gst: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">PAN Number</label>
              <input type="text" placeholder="AAAAA1111A" value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-0.5">Aadhaar Card No</label>
              <input type="text" placeholder="xxxx-xxxx-xxxx" value={formData.aadhaar} onChange={(e) => setFormData({...formData, aadhaar: e.target.value})} className="w-full text-sm border border-slate-200 rounded-lg p-2 focus:outline-none" />
            </div>
          </div>



          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Bank Name</label>
              <input type="text" placeholder="HDFC Bank" value={formData.bankName} onChange={(e) => setFormData({...formData, bankName: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Account No</label>
              <input type="text" placeholder="50100234..." value={formData.accountNo} onChange={(e) => setFormData({...formData, accountNo: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">IFSC Code</label>
              <input type="text" placeholder="HDFC0000002" value={formData.ifsc} onChange={(e) => setFormData({...formData, ifsc: e.target.value})} className="w-full text-[11px] border border-slate-200 rounded p-1.5 focus:outline-none" />
            </div>
          </div>
        </form>
      </Modal>

      {/* View Promoter Profile details */}
      {viewingPromoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-100 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display">{viewingPromoter.name}</h3>
                <p className="text-xs text-slate-500">Promoter Code: <strong>{viewingPromoter.code}</strong> • Status: {viewingPromoter.status}</p>
              </div>
              <button onClick={() => setViewingPromoter(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* HUDDO-UPDATE: Promoters — Sub-tabs for detail view */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/30">
              <button 
                onClick={() => setPromoterTab('overview')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${promoterTab === 'overview' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}`}
              >
                Overview Breakdown
              </button>
              <button 
                onClick={() => setPromoterTab('revenue')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${promoterTab === 'revenue' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-slate-500'}`}
              >
                Revenue Billing Chain
              </button>
            </div>

            {/* Content info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {promoterTab === 'overview' ? (
                <>
                  {/* Scorecard cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Earned (5%)</span>
                      <p className="text-lg font-bold text-emerald-600 font-display mt-0.5">₹{viewingPromoter.royaltyEarned.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</span>
                      <p className="text-lg font-bold text-slate-800 font-display mt-0.5">₹{viewingPromoter.royaltySettled.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Pending</span>
                      <p className="text-lg font-bold text-brand-orange font-display mt-0.5">₹{viewingPromoter.royaltyPending.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Monthly Trend Chart */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Monthly Royalty Accrual History (₹)</h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockRoyaltyTrend} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" fontSize={10} stroke="#94a3b8" />
                          <YAxis fontSize={10} stroke="#94a3b8" />
                          <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                          <Bar dataKey="royalty" fill="#f97316" radius={[4, 4, 0, 0]} name="Royalty Paid" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Mapped retailers table preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Mapped Retailers & Outlets</h4>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <th className="px-4 py-2.5">Shop Name</th>
                            <th className="px-4 py-2.5">Owner</th>
                            <th className="px-4 py-2.5">City</th>
                            <th className="px-4 py-2.5 text-right">Net Sales</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-slate-800">Walk Easy Footwear</td>
                            <td className="px-4 py-2.5 text-slate-400">Dinesh Shah</td>
                            <td className="px-4 py-2.5 text-slate-500">Mumbai</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹18,50,000</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2.5 font-bold text-slate-800">Apex Sole Distributors</td>
                            <td className="px-4 py-2.5 text-slate-400">Manish Joshi</td>
                            <td className="px-4 py-2.5 text-slate-500">Pune</td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹1,50,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* HUDDO-UPDATE: Promoters — Revenue billing chain display */
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    Company-to-Retailer Billing Chain
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold text-slate-700">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Retailer Name</th>
                          <th className="px-4 py-2.5">City</th>
                          <th className="px-4 py-2.5">Invoice No</th>
                          <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {revenueBillings.slice((billingPage - 1) * itemsPerBillingPage, billingPage * itemsPerBillingPage).length > 0 ? (
                          revenueBillings.slice((billingPage - 1) * itemsPerBillingPage, billingPage * itemsPerBillingPage).map(bill => (
                            <tr key={bill.id}>
                              <td className="px-4 py-2.5 text-slate-500">{bill.date}</td>
                              <td className="px-4 py-2.5 text-slate-900 font-bold">{bill.shopName}</td>
                              <td className="px-4 py-2.5 text-slate-500">{bill.city}</td>
                              <td className="px-4 py-2.5 font-mono text-slate-700 font-bold">{bill.id}</td>
                              <td className="px-4 py-2.5 text-right text-slate-900 font-bold">₹{bill.total.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${bill.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                  {bill.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-slate-400 font-medium">
                              No billings registered under retailers linked to this promoter yet.
                            </td>
                          </tr>
                        )}
                        {revenueBillings.length > 0 && (
                          <tr className="bg-slate-50 font-bold text-slate-900">
                            <td colSpan="4" className="px-4 py-3 text-right">Total Net Revenue:</td>
                            <td className="px-4 py-3 text-right text-brand-orange" colSpan="2">₹{revenueBillings.reduce((sum, b) => sum + b.total, 0).toLocaleString('en-IN')}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Inner table pagination */}
                  {revenueBillings.length > itemsPerBillingPage && (
                    <div className="flex justify-between items-center pt-2">
                      <button 
                        type="button"
                        onClick={() => setBillingPage(p => Math.max(p - 1, 1))}
                        disabled={billingPage === 1}
                        className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-bold disabled:opacity-50"
                      >
                        Prev
                      </button>
                      <span className="text-[10px] text-slate-400">Page {billingPage} of {Math.ceil(revenueBillings.length / itemsPerBillingPage)}</span>
                      <button 
                        type="button"
                        onClick={() => setBillingPage(p => Math.min(p + 1, Math.ceil(revenueBillings.length / itemsPerBillingPage)))}
                        disabled={billingPage === Math.ceil(revenueBillings.length / itemsPerBillingPage)}
                        className="px-2.5 py-1 border border-slate-200 rounded text-[10px] font-bold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
