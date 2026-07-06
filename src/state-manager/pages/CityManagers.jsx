// src/state-manager/pages/CityManagers.jsx
import { useState } from 'react';
import { 
  Users, UserCheck, Percent, Search, SlidersHorizontal, 
  X, Phone, Mail, Calendar, MapPin, TrendingUp,
  MessageSquare, ShoppingBag, RefreshCw
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { formatCurrency, formatDate } from '../utils';

export default function CityManagers({ 
  cityManagers, 
  retailers, 
  territoryLabel = '',
  loading = false,
  onRefresh,
  onNavigate,
  showToast,
  initialCityFilter = '',
  pageTitle = 'City Managers'
}) {
  const [searchQuery, setSearchQuery] = useState(initialCityFilter);
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Drawer state
  const [selectedCM, setSelectedCM] = useState(null);

  // Calculate dynamic stats
  const totalCMs = cityManagers.length;
  const activeCMs = cityManagers.filter(cm => cm.status === 'Active').length;
  
  const sumTargets = cityManagers.reduce((sum, cm) => sum + cm.monthlyTarget, 0);
  const sumAchieved = cityManagers.reduce((sum, cm) => sum + cm.achieved, 0);
  const avgAchievement = sumTargets > 0 ? Math.round((sumAchieved / sumTargets) * 1000) / 10 : 0;

  // Filter handlers
  const filteredCMs = cityManagers.filter(cm => {
    const matchesSearch = 
      cm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cm.city.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'All' || 
      cm.status === statusFilter;
      
    return matchesSearch && matchesStatus;
  });

  // Get retailers for selected city manager
  const getCMRetailers = (cmId) => {
    return retailers.filter(r => r.cityManagerId === cmId);
  };

  // Progress bar colors
  const getProgressColor = (pct) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProgressTextClass = (pct) => {
    if (pct >= 90) return 'text-emerald-700 bg-emerald-50';
    if (pct >= 60) return 'text-amber-700 bg-amber-50';
    return 'text-rose-700 bg-rose-50';
  };

  // Mock trend data for small detail line charts
  const mockTrendData = [
    { month: 'Jan', value: 72 },
    { month: 'Feb', value: 85 },
    { month: 'Mar', value: 78 },
    { month: 'Apr', value: 92 },
    { month: 'May', value: 89 },
    { month: 'Jun', value: 95 }
  ];

  const showStateColumn = cityManagers.some((cm) => cm.state && cm.state !== '—');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
        <RefreshCw className="animate-spin" size={20} />
        Loading city managers...
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
            {pageTitle}{territoryLabel ? ` — ${territoryLabel}` : ''}
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Supervise city leads, allocate locations, and review monthly target achievements</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Managers</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{totalCMs}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Today</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{activeCMs}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Achievement</span>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{avgAchievement}%</h3>
          </div>
        </div>

      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm">
        
        {/* Filters Panel */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold w-full text-slate-800 focus:outline-none focus:border-slate-300 focus:bg-slate-100/30 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex bg-slate-50 border border-slate-200/80 rounded-xl p-0.5">
              {['All', 'Active', 'Inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    statusFilter === status 
                      ? 'bg-white text-slate-800 shadow-xs' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold tracking-wider uppercase bg-slate-50/20">
                <th className="py-3 px-4">Name</th>
                {showStateColumn && <th className="py-3 px-4">State</th>}
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4 text-center">Retailers Count</th>
                <th className="py-3 px-4 text-right">Target</th>
                <th className="py-3 px-4 text-right">Achieved</th>
                <th className="py-3 px-4">Achievement %</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium text-slate-600 divide-y divide-slate-100">
              {filteredCMs.length > 0 ? (
                filteredCMs.map((cm) => {
                  const achievementPct = cm.monthlyTarget > 0 ? Math.round((cm.achieved / cm.monthlyTarget) * 100) : 0;
                  return (
                    <tr key={cm.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{cm.name}</td>
                      {showStateColumn && <td className="py-3 px-4">{cm.state || '—'}</td>}
                      <td className="py-3 px-4">{cm.city}</td>
                      <td className="py-3 px-4 font-semibold">{cm.mobile}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{cm.retailersCount}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(cm.monthlyTarget)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(cm.achieved)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-full ${getProgressColor(achievementPct)} rounded-full`}
                              style={{ width: `${Math.min(achievementPct, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-lg text-[9px] font-extrabold ${getProgressTextClass(achievementPct)}`}>
                            {achievementPct}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full ${
                          cm.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-50 text-slate-500 border border-slate-100'
                        }`}>
                          {cm.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedCM(cm)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-all"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedCM(cm);
                              onNavigate("Targets"); // Shortcut edit targets
                            }}
                            className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-600 hover:text-white border border-orange-100 rounded-lg text-[10px] font-bold text-orange-600 transition-all"
                          >
                            Set Target
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-semibold">
                    No City Managers match the selection criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Drawer Panel: City Manager View Detail */}
      {selectedCM && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300">
          
          {/* Overlay Close area */}
          <div className="flex-1" onClick={() => setSelectedCM(null)}></div>
          
          {/* Drawer Body */}
          <div className="w-full max-w-md bg-white h-screen shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-slide-left">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-wider">City Manager Profile</h3>
                <button 
                  onClick={() => setSelectedCM(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Profile details */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-orange-600 text-white font-extrabold flex items-center justify-center text-lg rounded-2xl shadow-inner">
                  {selectedCM.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{selectedCM.name}</h4>
                  <span className={`inline-block px-2 py-0.5 text-[9px] font-extrabold rounded-full mt-1 ${
                    selectedCM.status === 'Active' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {selectedCM.status}
                  </span>
                </div>
              </div>

              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-3.5 border border-slate-100 rounded-2xl p-4 bg-slate-50/20 text-xs font-semibold text-slate-600">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Assigned City</span>
                  <div className="flex items-center gap-1 text-slate-800 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    <span>{selectedCM.city}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Joining Date</span>
                  <div className="flex items-center gap-1 text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(selectedCM.joiningDate)}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Mobile</span>
                  <div className="flex items-center gap-1 text-slate-800">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedCM.mobile}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-400 block uppercase">Email</span>
                  <div className="flex items-center gap-1 text-slate-800 truncate" title={selectedCM.email}>
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{selectedCM.email}</span>
                  </div>
                </div>
              </div>

              {/* Target progress metric */}
              <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">June Target Progress</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-400 block uppercase">Target</span>
                    <p className="font-bold text-slate-800 mt-0.5">{formatCurrency(selectedCM.monthlyTarget)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-400 block uppercase">Achieved</span>
                    <p className="font-black text-slate-800 mt-0.5">{formatCurrency(selectedCM.achieved)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2.5">
                    <span className="text-[9px] text-slate-400 block uppercase">Ratio</span>
                    <p className={`font-black mt-0.5 ${
                      (selectedCM.achieved/selectedCM.monthlyTarget) >= 0.9 ? 'text-emerald-600' : 'text-orange-600'
                    }`}>
                      {selectedCM.monthlyTarget > 0 ? Math.round((selectedCM.achieved / selectedCM.monthlyTarget) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Achievement Trend Sparkline */}
              <div className="border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">6-Month Trend (%)</h4>
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockTrendData}>
                      <Tooltip formatter={(value) => [`${value}%`, '']} contentStyle={{ fontSize: '10px', padding: '4px' }} />
                      <Line type="monotone" dataKey="value" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Retailers List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Retailers Under Supervision</h4>
                  <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600">{getCMRetailers(selectedCM.id).length} Shops</span>
                </div>
                <div className="overflow-x-auto max-h-40 border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse text-[11px] font-medium text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 text-[9px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2 px-3">Shop</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getCMRetailers(selectedCM.id).length > 0 ? (
                        getCMRetailers(selectedCM.id).map(r => (
                          <tr key={r.id}>
                            <td className="py-2 px-3 font-bold text-slate-700 truncate max-w-[150px]">{r.businessName}</td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 text-[8px] font-extrabold rounded-full ${
                                r.category === 'Platinum' ? 'bg-indigo-50 text-indigo-700' :
                                r.category === 'Gold' ? 'bg-amber-50 text-amber-700' :
                                'bg-slate-50 text-slate-600'
                              }`}>{r.category}</span>
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-800">{formatCurrency(r.totalRevenue)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="py-4 text-center text-slate-400 italic">No retailers mapped.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex gap-3">
              <button 
                onClick={() => {
                  setSelectedCM(null);
                  showToast(`Opened messages modal for CM: ${selectedCM.name}`, "info");
                }}
                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" /> Message
              </button>
              <button 
                onClick={() => {
                  setSelectedCM(null);
                  onNavigate("Orders"); // Shortcut to Orders page
                }}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-100 flex items-center justify-center gap-1.5 transition-all"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> View Orders
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
