import React, { useState, useEffect } from 'react';
import { 
  Percent, Award, Landmark, TrendingUp, HelpCircle, 
  ArrowRight, ShieldCheck, AlertCircle, Clock, Calendar, RefreshCw
} from 'lucide-react';

import { useRetailerAuth } from '../context/RetailerAuthContext';

export default function CommissionRewards({ showToast }) {
  const { user, retailer } = useRetailerAuth();
  const [activeSubTab, setActiveSubTab] = useState('Commission'); // Commission | Rewards
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    // Fetch commission records for this user
    fetch(`/api/commission-records?user=${user.id}`)
      .then(res => res.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setCommissions(res.data);
        }
      })
      .catch(err => {
        console.error("Error loading commissions:", err);
        if (showToast) showToast("Error loading commissions history.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);

  // Compute stats
  const lifetimeEarned = commissions.reduce((sum, c) => sum + (c.amount || 0), 0);
  
  const thisMonthEarned = commissions
    .filter(c => {
      const date = new Date(c.createdAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const pendingSettlement = commissions
    .filter(c => c.status === 'Pending')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const loyaltyPoints = Math.floor(lifetimeEarned / 10);

  // Generate dynamic loyalty points history from settled commissions
  const loyaltyHistory = commissions
    .filter(c => c.status === 'Paid')
    .map(c => ({
      date: new Date(c.updatedAt || c.createdAt).toLocaleDateString(),
      description: `Points credited for Order ${c.order?.order_number || `ORD-${c.order?._id?.substring(18) || c.order?.substring(18) || ''}`}`,
      type: 'credit',
      points: Math.floor((c.amount || 0) / 10)
    }));

  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 shadow-xs animate-pulse space-y-4 min-h-[400px] flex flex-col justify-center">
        <div className="flex items-center justify-center gap-2.5 text-slate-400 text-xs font-bold font-display">
          <RefreshCw className="w-5 h-5 text-brand-orange animate-spin" />
          <span>Loading commissions and loyalty rewards...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-display">Commissions & Loyalty Rewards</h1>
          <p className="text-xs text-slate-550 font-medium">Track your shop commission settlements and loyalty point ledgers in real-time.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveSubTab('Commission')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'Commission' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-755'
            }`}
          >
            Commissions
          </button>
          <button
            onClick={() => setActiveSubTab('Rewards')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'Rewards' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-755'
            }`}
          >
            Loyalty Points Ledger
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Lifetime Earnings</span>
            <p className="text-lg font-extrabold text-slate-900 font-display mt-0.5">₹{lifetimeEarned.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">This Month's Earnings</span>
            <p className="text-lg font-extrabold text-slate-900 font-display mt-0.5">₹{thisMonthEarned.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Pending Settlement</span>
            <p className="text-lg font-extrabold text-slate-900 font-display mt-0.5">₹{pendingSettlement.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-650 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Loyalty Points Balance</span>
            <p className="text-lg font-extrabold text-purple-700 font-display mt-0.5">{loyaltyPoints} PTS</p>
          </div>
        </div>

      </div>

      {/* Informative description banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-slate-650">
        <HelpCircle className="w-5 h-5 text-slate-400 shrink-0" />
        <p className="font-semibold text-slate-650">
          Commission payout percentages are determined by your dealer status. As a <span className="font-bold text-amber-600">{retailer?.category || "Standard"} Dealer</span>, you receive settled commissions directly into your billing account upon successful order delivery.
        </p>
      </div>

      {/* Tab Contents */}

      {/* Subtab 1: Commissions Table */}
      {activeSubTab === 'Commission' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 font-display">Commission Breakdown Log</h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-slate-700 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Date Logging</th>
                  <th className="px-4 py-2.5">Order ID</th>
                  <th className="px-4 py-2.5">Products Included</th>
                  <th className="px-4 py-2.5 text-right">Sale Value</th>
                  <th className="px-4 py-2.5 text-center">Comm. %</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-900">Commission Amount</th>
                  <th className="px-4 py-2.5 text-right">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {commissions.length > 0 ? (
                  commissions.map((comm) => {
                    const orderNo = comm.order?.order_number || `ORD-${comm.order?._id?.substring(18) || comm.order?.substring(18) || ''}`;
                    const saleVal = comm.order?.grand_total || (comm.amount * 100 / (comm.percentage || 1));
                    return (
                      <tr key={comm._id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 text-slate-400 font-medium">{new Date(comm.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{orderNo}</td>
                        <td className="px-4 py-3 text-slate-550 font-medium line-clamp-1 max-w-[200px]">Footwear Bulk Purchase</td>
                        <td className="px-4 py-3 text-right">₹{saleVal.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-center">{comm.percentage}%</td>
                        <td className="px-4 py-3 text-right font-extrabold text-slate-900">₹{(comm.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                            comm.status === 'Paid' ? 'bg-emerald-50 text-emerald-705 border-emerald-200' :
                            'bg-amber-50 text-amber-705 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              comm.status === 'Paid' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}></span>
                            {comm.status === 'Paid' ? 'Settled' : comm.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-500 font-medium">
                      No commission records logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Loyalty Points Ledger */}
      {activeSubTab === 'Rewards' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 font-display">Points Transaction History</h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-slate-750 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Transaction Date</th>
                  <th className="px-4 py-2.5">Activity Description</th>
                  <th className="px-4 py-2.5 text-right">Transaction Type</th>
                  <th className="px-4 py-2.5 text-right font-bold text-slate-900">Points Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loyaltyHistory.length > 0 ? (
                  loyaltyHistory.map((rew, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3 text-slate-400 font-medium">{rew.date}</td>
                      <td className="px-4 py-3 text-slate-750 font-bold">{rew.description}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100`}>
                          CREDIT
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold text-sm text-emerald-600`}>
                        +{rew.points} PTS
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-slate-500 font-medium">
                      No loyalty points history logged.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
