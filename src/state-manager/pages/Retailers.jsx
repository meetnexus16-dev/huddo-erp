// src/state-manager/pages/Retailers.jsx
import { useState } from 'react';
import { 
  Store, Search, SlidersHorizontal, ArrowDownToLine, X, 
  MapPin, User, Landmark, ShoppingBag, ShieldAlert, Check, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { formatCurrency, formatDate } from '../utils';

export default function Retailers({ 
  retailers, 
  cityManagers, 
  orders, 
  onApproveRetailer, 
  onRejectRetailer, 
  showToast,
  territoryLabel = '',
  loading = false
}) {
  const [activeTab, setActiveTab] = useState('All'); // All | Platinum | Gold | Silver | Standard | Pending Verification
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All Cities');
  
  // Drawer state
  const [selectedRetailer, setSelectedRetailer] = useState(null);

  // Filter handlers
  const getCityManagerName = (cmId, retailer) => {
    if (retailer?.cityManagerName) return retailer.cityManagerName;
    return cityManagers.find(cm => cm.id === cmId)?.name || "Not Assigned";
  };

  const getRetailerCategoryCount = (cat) => {
    if (cat === 'All') return retailers.length;
    if (cat === 'Pending Verification') return retailers.filter(r => r.status === 'Pending Verification').length;
    return retailers.filter(r => r.category === cat).length;
  };

  // Filter retailers list
  const filteredRetailers = retailers.filter(r => {
    // Search query matching
    const matchesSearch = 
      r.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.gstin.toLowerCase().includes(searchQuery.toLowerCase());

    // City filter matching
    const matchesCity = 
      cityFilter === 'All Cities' ||
      r.city.toLowerCase() === cityFilter.toLowerCase();

    // Tab category/status matching
    const matchesTab = activeTab === 'Pending Verification' 
      ? r.status === 'Pending Verification'
      : activeTab !== 'All'
      ? r.category === activeTab && r.status !== 'Pending Verification'
      : r.status !== 'Pending Verification';

    return matchesSearch && matchesCity && matchesTab;
  });

  const handleExport = () => {
    showToast("Exporting retailers directory as CSV...", "success");
  };

  // Get last 5 orders for a retailer
  const getRetailerOrders = (retId) => {
    return orders.filter(o => o.retailerId === retId).slice(0, 5);
  };

  // Retailer Growth chart data
  const growthData = [
    { month: "Jan'26", added: 2 },
    { month: "Feb'26", added: 4 },
    { month: "Mar'26", added: 1 },
    { month: "Apr'26", added: 3 },
    { month: "May'26", added: 2 },
    { month: "Jun'26", added: 3 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Loading retailers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
            Retailers{territoryLabel ? ` — ${territoryLabel}` : ''}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Supervise channel partners, verify shop registrations, and monitor outstanding payments</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 bg-white transition-all shadow-xs self-start sm:self-center"
        >
          <ArrowDownToLine className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Category Tabs Row */}
      <div className="overflow-x-auto select-none">
        <div className="flex border-b border-slate-200 min-w-max">
          {['All', 'Platinum', 'Gold', 'Silver', 'Standard', 'Pending Verification'].map((cat) => {
            const count = getRetailerCategoryCount(cat);
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`py-3 px-4 text-xs font-bold transition-all relative flex items-center gap-1.5 border-b-2 ${
                  isActive 
                    ? 'border-orange-500 text-orange-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-1.5 py-0.5 text-[9px] rounded-full font-bold ${
                  isActive ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Search Panel */}
      <div className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search business, owner, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold w-full text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-slate-100/30 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 self-end sm:self-center">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="p-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white focus:outline-none"
          >
            <option value="All Cities">All Cities</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Surat">Surat</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Rajkot">Rajkot</option>
            <option value="Morbi">Morbi</option>
            <option value="Bhavnagar">Bhavnagar</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-slate-50/20">
                <th className="py-3 px-4">Business Name</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">City Manager</th>
                <th className="py-3 px-4">Category</th>
                {activeTab !== 'Pending Verification' && (
                  <>
                    <th className="py-3 px-4 text-center">Orders</th>
                    <th className="py-3 px-4 text-right">Revenue</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                  </>
                )}
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-600 divide-y divide-slate-100">
              {filteredRetailers.length > 0 ? (
                filteredRetailers.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{ret.businessName}</td>
                    <td className="py-3 px-4">{ret.ownerName}</td>
                    <td className="py-3 px-4">{ret.city}</td>
                    <td className="py-3 px-4">{getCityManagerName(ret.cityManagerId, ret)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                        ret.category === 'Platinum' ? 'bg-indigo-50 text-indigo-700' :
                        ret.category === 'Gold' ? 'bg-amber-50 text-amber-700' :
                        ret.category === 'Silver' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {ret.category}
                      </span>
                    </td>
                    {activeTab !== 'Pending Verification' && (
                      <>
                        <td className="py-3 px-4 text-center font-bold">{ret.totalOrders}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(ret.totalRevenue)}</td>
                        <td className={`py-3 px-4 text-right font-bold ${
                          ret.pendingPayment > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {formatCurrency(ret.pendingPayment)}
                        </td>
                      </>
                    )}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                        ret.status === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : ret.status === 'Pending Verification'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {ret.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ret.status === 'Pending Verification' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => {
                              onApproveRetailer(ret.id);
                              showToast(`Approved registration for ${ret.businessName}`, "success");
                            }}
                            className="p-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all border border-emerald-100"
                            title="Approve Registration"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to reject ${ret.businessName}?`)) {
                                onRejectRetailer(ret.id);
                                showToast(`Rejected registration for ${ret.businessName}`, "error");
                              }
                            }}
                            className="p-1 bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all border border-rose-100"
                            title="Reject Registration"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedRetailer(ret)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-all"
                          >
                            View Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400 font-semibold">
                    No retailers found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Retailer Growth Chart at bottom of main list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">New Retailers Added Per Month</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: '10px' }} />
                <Bar dataKey="added" name="Retailers Added" fill="#ea580c" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Drawer: Retailer View Detail */}
      {selectedRetailer && (
        <div className="fixed inset-0 z-45 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300">
          
          <div className="flex-1" onClick={() => setSelectedRetailer(null)}></div>
          
          <div className="w-full max-w-lg bg-white h-screen shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-slide-left">
            
            <div className="space-y-6 text-xs font-semibold text-slate-600">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-black text-xs text-slate-800 uppercase tracking-wider">Retailer Dossier</h3>
                <button 
                  onClick={() => setSelectedRetailer(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shop Badge Info */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-orange-100 border border-orange-200 text-orange-700 rounded-2xl flex items-center justify-center shrink-0">
                  <Store className="w-7 h-7" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-black text-slate-800 truncate">{selectedRetailer.businessName}</h4>
                  <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Owner: {selectedRetailer.ownerName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-extrabold rounded-full">
                      {selectedRetailer.category} Category
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${
                      selectedRetailer.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
                    }`}>
                      {selectedRetailer.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Details Matrix */}
              <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/20 space-y-3">
                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Registry Details</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase block">GSTIN</span>
                    <span className="text-slate-800 font-bold block">{selectedRetailer.gstin}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase block">Mobile</span>
                    <span className="text-slate-800 font-bold block">{selectedRetailer.mobile}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase block">City / Location</span>
                    <span className="text-slate-800 font-bold block flex items-center gap-0.5">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" /> {selectedRetailer.city}, Gujarat
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 uppercase block">City Manager</span>
                    <span className="text-slate-800 font-bold block">{getCityManagerName(selectedRetailer.cityManagerId, selectedRetailer)}</span>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Registration Date: {formatDate(selectedRetailer.joinedDate)}</span>
                  <span>Last Ordered: {selectedRetailer.lastOrderDate ? formatDate(selectedRetailer.lastOrderDate) : "Never"}</span>
                </div>
              </div>

              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-[8px] text-slate-400 uppercase block">Total Orders</span>
                  <p className="font-bold text-slate-800 mt-1">{selectedRetailer.totalOrders}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                  <span className="text-[8px] text-slate-400 uppercase block">Total Revenue</span>
                  <p className="font-black text-slate-800 mt-1">{formatCurrency(selectedRetailer.totalRevenue)}</p>
                </div>
                <div className={`border rounded-xl p-3 text-center ${
                  selectedRetailer.pendingPayment > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <span className="text-[8px] text-slate-400 uppercase block">Outstanding</span>
                  <p className="font-black mt-1">{formatCurrency(selectedRetailer.pendingPayment)}</p>
                </div>
              </div>

              {/* Shop Photo Placeholder */}
              <div className="border border-slate-200 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center bg-slate-50/50 text-slate-400">
                <Landmark className="w-8 h-8 text-slate-300 stroke-1 mb-1" />
                <span className="text-[9px] font-bold uppercase tracking-wide">Shop Front Verification Image</span>
                <span className="text-[8px] text-slate-400 mt-0.5">Stored as: GJ_VERIFY_{selectedRetailer.id}.jpg</span>
              </div>

              {/* Recent Orders Mini Table */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Recent Orders (Last 5)</h5>
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="border border-slate-100 rounded-xl overflow-x-auto max-h-36 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10px] font-medium text-slate-500">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[8px] text-slate-400 font-bold uppercase">
                        <th className="py-2 px-3">Order ID</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getRetailerOrders(selectedRetailer.id).length > 0 ? (
                        getRetailerOrders(selectedRetailer.id).map(o => (
                          <tr key={o.id}>
                            <td className="py-2 px-3 font-bold text-slate-700">{o.id}</td>
                            <td className="py-2 px-3">{formatDate(o.orderDate)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">{formatCurrency(o.amount)}</td>
                            <td className="py-2 px-3 text-right">
                              <span className={`inline-block px-1.5 py-0.5 text-[8px] font-bold rounded-full ${
                                o.status === 'Pending Approval' ? 'bg-amber-100 text-amber-800' :
                                o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>{o.status}</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-4 text-center italic text-slate-400">No order history available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Outstanding payment warning note */}
              {selectedRetailer.pendingPayment > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h6 className="font-bold text-[11px]">Outstanding Payment Notification</h6>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      This shop has a balance of {formatCurrency(selectedRetailer.pendingPayment)} overdue. 
                      Further orders will require manual State Manager approval overrides.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button 
                onClick={() => {
                  setSelectedRetailer(null);
                  showToast(`Flagged shop ${selectedRetailer.businessName} for review.`, "error");
                }}
                className="flex-1 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" /> Flag / Audit Shop
              </button>
              <button 
                onClick={() => setSelectedRetailer(null)}
                className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
